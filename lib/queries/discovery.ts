import { createClient } from "@/lib/supabase/server";
import type {
  DiscoveryCandidate,
  ApprovalQueueItem,
  RiskFlag,
  VerificationEvidence,
  AuditEvent,
} from "@/lib/types/discovery";

export async function getApprovalQueue(filters?: {
  status?: string;
  priority?: "high" | "normal";
}): Promise<ApprovalQueueItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("approval_queue")
    .select(`
      *,
      discovery_candidates(*)
    `)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch approval queue:", error);
    return [];
  }

  return (data || []) as ApprovalQueueItem[];
}

export async function getCandidateWithEvidence(
  candidateId: string,
): Promise<{
  candidate: DiscoveryCandidate | null;
  evidence: VerificationEvidence[];
  flags: RiskFlag[];
}> {
  const supabase = await createClient();

  const [
    { data: candidate },
    { data: evidence },
    { data: flags },
  ] = await Promise.all([
    supabase
      .from("discovery_candidates")
      .select("*")
      .eq("id", candidateId)
      .single(),
    supabase
      .from("verification_evidence")
      .select("*")
      .eq("candidate_id", candidateId),
    supabase
      .from("risk_flags")
      .select("*")
      .eq("candidate_id", candidateId),
  ]);

  return {
    candidate: (candidate as DiscoveryCandidate) || null,
    evidence: (evidence || []) as VerificationEvidence[],
    flags: (flags || []) as RiskFlag[],
  };
}

export async function getAuditEvents(limit = 50): Promise<AuditEvent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch audit events:", error);
    return [];
  }

  return (data || []) as AuditEvent[];
}

export async function getCandidatesToReview(): Promise<DiscoveryCandidate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("discovery_candidates")
    .select("*")
    .eq("status", "verification_pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch candidates:", error);
    return [];
  }

  return (data || []) as DiscoveryCandidate[];
}
