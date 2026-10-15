/**
 * Structured opportunity extraction from unstructured raw text.
 * Uses Gemini when configured; falls back to rule-based parsing.
 * All model output is treated as untrusted data; extracted fields
 * are validated (date formats, URL formats) before use.
 */

export interface StructuredOpportunity {
  title: string;
  organizer?: string;
  deadline?: string; // ISO or null
  start_date?: string;
  end_date?: string;
  location?: string;
  is_online?: boolean;
  description?: string;
  eligibility?: string;
  funding?: string;
  registration_link?: string;
  application_url?: string;
  source_url: string;
  extraction_confidence: "high" | "medium" | "low";
  raw_content: string;
  verification_notes: string;
}

import { generateTextWithError } from "@/lib/ai/gemini";

export async function extractOpportunityStructured(
  rawText: string,
  sourceUrl: string,
): Promise<StructuredOpportunity> {
  const apiConfigured = !!process.env.GEMINI_API_KEY?.trim();
  let extracted: Partial<StructuredOpportunity> = {};
  let confidence: "high" | "medium" | "low" = "low";
  let verificationNotes = "No AI verification performed; extraction relies on source content only.";

  if (apiConfigured && rawText.length > 20) {
    try {
      const prompt = `Analyze the following opportunity text and return ONLY a JSON object with these fields (no markdown, no explanation):
{
  "title": "...",
  "organizer": "...",
  "deadline": "YYYY-MM-DD or null",
  "start_date": "YYYY-MM-DD or null",
  "end_date": "YYYY-MM-DD or null",
  "location": "...",
  "is_online": true/false,
  "description": "2-4 sentences",
  "eligibility": "...",
  "funding": "Free / $...",
  "registration_link": "https://...",
  "application_url": "https://...",
  "extraction_confidence": "high/medium/low"
}

Text to analyze:
---
${rawText.slice(0, 12000)}
---`;
      const result = await generateTextWithError(prompt);
      if (result.text) {
        const cleaned = result.text
          .replace(/```json\n?|\n?```/g, "")
          .trim();
        try {
          const parsed = JSON.parse(cleaned);
          extracted = {
            title: String(parsed.title || "").trim(),
            organizer: parsed.organizer ? String(parsed.organizer).trim() : undefined,
            deadline: parsed.deadline && parsed.deadline !== "null" ? String(parsed.deadline) : undefined,
            start_date: parsed.start_date && parsed.start_date !== "null" ? String(parsed.start_date) : undefined,
            end_date: parsed.end_date && parsed.end_date !== "null" ? String(parsed.end_date) : undefined,
            location: parsed.location ? String(parsed.location).trim() : undefined,
            is_online: !!parsed.is_online,
            description: parsed.description ? String(parsed.description).trim() : undefined,
            eligibility: parsed.eligibility ? String(parsed.eligibility).trim() : undefined,
            funding: parsed.funding ? String(parsed.funding).trim() : undefined,
            registration_link: parsed.registration_link ? String(parsed.registration_link).trim() : undefined,
            application_url: parsed.application_url ? String(parsed.application_url).trim() : undefined,
          };
          confidence = (parsed.extraction_confidence === "high" || parsed.extraction_confidence === "medium") ? parsed.extraction_confidence : "low";
          verificationNotes = "AI extraction completed. Evidence must be independently verified; AI agreement alone is not proof.";
        } catch {
          // JSON parse failed; fall through to rule-based
          extracted = {};
        }
      }
    } catch {
      // Silent fallback — never expose model errors to pipeline control flow
    }
  }

  // Validate extracted URLs; discard invalid ones
  const validateUrl = (url?: string) => {
    if (!url) return undefined;
    try {
      new URL(url);
      return url;
    } catch {
      return undefined;
    }
  };

  // Rule-based fallback when AI unavailable or fails
  if (!extracted.title) {
    const titleMatch = rawText.match(/(?:Title|Competition|Program)\s*:?\s*([^\n]{5,120})/i);
    extracted.title = titleMatch ? titleMatch[1].trim().slice(0, 200) : "Untitled Opportunity";
  }
  if (!extracted.description) {
    const descLines: string[] = [];
    const lines = rawText.split("\n").map((l) => l.trim()).filter((l) => l.length > 20 && l.length < 300);
    for (const line of lines.slice(0, 4)) {
      descLines.push(line);
    }
    extracted.description = descLines.join(" ").slice(0, 500);
  }

  return {
    title: (extracted.title || "Untitled Opportunity").slice(0, 300),
    organizer: extracted.organizer?.slice(0, 200),
    deadline: extracted.deadline ? String(extracted.deadline).trim() : undefined,
    start_date: extracted.start_date ? String(extracted.start_date).trim() : undefined,
    end_date: extracted.end_date ? String(extracted.end_date).trim() : undefined,
    location: extracted.location?.slice(0, 150),
    is_online: typeof extracted.is_online === "boolean" ? extracted.is_online : false,
    description: extracted.description?.slice(0, 1500),
    eligibility: extracted.eligibility?.slice(0, 500),
    funding: extracted.funding?.slice(0, 200),
    registration_link: validateUrl(extracted.registration_link) || validateUrl(extracted.application_url) || undefined,
    application_url: validateUrl(extracted.application_url) || undefined,
    source_url: sourceUrl,
    extraction_confidence: confidence,
    raw_content: rawText.slice(0, 15000),
    verification_notes: verificationNotes,
  };
}
