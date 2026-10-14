/**
 * Evidence-based verification using authoritative sources.
 * Every verification decision retains evidence and explains uncertainty.
 * AI agreement alone is not proof.
 */

export interface VerificationOutcome {
  claim: string;
  verdict: "supports" | "contradicts" | "neutral" | "inconclusive";
  confidence: number; // 0.0 - 1.0
  evidence_url: string;
  evidence_excerpt: string;
  retrieved_at: string;
  notes: string;
  authoritative_source?: string;
}

export async function verifyEvidence(
  candidateUrl: string,
  claim: string,
  evidenceUrl?: string,
): Promise<VerificationOutcome[]> {
  const outcomes: VerificationOutcome[] = [];
  const retrievedAt = new Date().toISOString();

  // If an evidence URL is provided, attempt to fetch and verify claim presence
  if (evidenceUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(evidenceUrl, {
        headers: {
          "User-Agent": "OpportunityHub-Verification/1.0",
          Accept: "text/html",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const html = await res.text();
        const excerpt = html.slice(0, 3000);
        const claimLower = claim.toLowerCase();
        const excerptLower = excerpt.toLowerCase();
        const hasClaim = claimLower.split(" ").filter((w) => w.length > 3).every((w) => excerptLower.includes(w)) || claimLower.includes("free") ? claimLower.includes("free") ? excerptLower.includes("free") || excerptLower.includes("no cost") || excerptLower.includes("entry fee") : true : false;
        outcomes.push({
          claim,
          verdict: hasClaim ? "supports" : "inconclusive",
          confidence: hasClaim ? 0.75 : 0.35,
          evidence_url: evidenceUrl,
          evidence_excerpt: excerpt.slice(0, 1000),
          retrieved_at: retrievedAt,
          notes: "Evidence retained. Verification based on source text presence, not AI agreement. Uncertainty remains until authoritative confirmation is obtained.",
          authoritative_source: new URL(evidenceUrl).hostname,
        });
      } else {
        outcomes.push({
          claim,
          verdict: "inconclusive",
          confidence: 0.2,
          evidence_url: evidenceUrl,
          evidence_excerpt: `Fetch failed: ${res.status}`,
          retrieved_at: retrievedAt,
          notes: "Source unreachable; no verification possible. Evidence unavailable for authoritative confirmation.",
        });
      }
    } catch (err) {
      outcomes.push({
        claim,
        verdict: "inconclusive",
        confidence: 0.1,
        evidence_url: evidenceUrl,
        evidence_excerpt: err instanceof Error ? err.message : String(err),
        retrieved_at: retrievedAt,
        notes: "Verification blocked by fetch error. Authoritative source access unavailable at verification time.",
      });
    }
  }

  // If no evidence URL provided, record inconclusive with explicit note
  if (outcomes.length === 0) {
    outcomes.push({
      claim,
      verdict: "inconclusive",
      confidence: 0.0,
      evidence_url: evidenceUrl || "",
      evidence_excerpt: "No evidence URL provided for verification.",
      retrieved_at: retrievedAt,
      notes: "No authoritative evidence retrieved. Any AI agreement alone does not constitute proof. Manual review required.",
    });
  }

  return outcomes;
}
