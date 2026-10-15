"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/discovery/audit";


/**
 * Create a discovery candidate from a URL or manual submission.
 * Admin-gated: these writes use the service role (bypassing RLS), so the
 * caller must be a verified admin.
 */
export async function createDiscoveryCandidate(data: {
  original_url: string;
  title: string;
  description?: string;
  organizer?: string;
  deadline?: string;
  location?: string;
  is_online?: boolean;
  subject_area?: string;
  grade_requirements?: string;
  cost?: string;
  contact_info?: string;
  registration_link?: string;
  source_id?: string;
  raw_content?: string;
}): Promise<{ success: boolean; candidateId?: string; error?: string }> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: adminRole } = await authClient
    .from("admin_roles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRole) {
    return { success: false, error: "Admin access required" };
  }

  try {
    // Prefer the service-role client (bypasses RLS for system/pipeline writes).
    // Fall back to the caller's authenticated session client so the action still
    // works when SUPABASE_SERVICE_ROLE_KEY is not configured; RLS then applies.
    const client = createAdminClient() ?? authClient;

    const { data: candidate, error } = await client
      .from("discovery_candidates")
      .insert({
        original_url: data.original_url,
        title: data.title,
        description: data.description || null,
        organizer: data.organizer || null,
        deadline: data.deadline || null,
        location: data.location || null,
        is_online: data.is_online || false,
        subject_area: data.subject_area || null,
        grade_requirements: data.grade_requirements || null,
        cost: data.cost || null,
        contact_info: data.contact_info || null,
        registration_link: data.registration_link || null,
        source_id: data.source_id || null,
        raw_content: data.raw_content || null,
        status: "new",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Log audit event
    await logAuditEvent({
      action: "discover",
      actor_type: "system",
      target_type: "candidate",
      target_id: candidate.id,
      details: { url: data.original_url, title: data.title },
      success: true,
    });

    revalidatePath("/admin/queue");
    return { success: true, candidateId: candidate.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Add verification evidence for a claim
 */
export async function addVerificationEvidence(data: {
  candidate_id: string;
  claim: string;
  evidence_type: "organizer_official" | "website" | "third_party" | "social_media" | "search_result" | "other";
  source_url?: string;
  source_title?: string;
  evidence_excerpt?: string;
  verdict: "supports" | "contradicts" | "neutral" | "inconclusive";
  confidence?: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Check if user is admin
  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRole) {
    return { success: false, error: "Admin access required" };
  }

  try {
    const { error } = await supabase
      .from("verification_evidence")
      .insert({
        candidate_id: data.candidate_id,
        claim: data.claim,
        evidence_type: data.evidence_type,
        source_url: data.source_url || null,
        source_title: data.source_title || null,
        evidence_excerpt: data.evidence_excerpt || null,
        verdict: data.verdict,
        confidence: data.confidence || null,
        notes: data.notes || null,
        retrieved_at: new Date().toISOString(),
      });

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      action: "verify",
      actor_id: user.id,
      actor_type: "admin",
      target_type: "verification",
      target_id: data.candidate_id,
      details: { claim: data.claim, verdict: data.verdict },
      success: true,
    });

    revalidatePath(`/admin/candidate/${data.candidate_id}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Create a risk flag on a candidate
 */
export async function createRiskFlag(data: {
  candidate_id: string;
  flag_type: "missing_deadline" | "suspicious_url" | "organizer_unverified" | "contradicted_claim" | "potential_fraud" | "expired" | "duplicate" | "low_confidence" | "other";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  suggested_action?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRole) {
    return { success: false, error: "Admin access required" };
  }

  try {
    const { error } = await supabase
      .from("risk_flags")
      .insert({
        candidate_id: data.candidate_id,
        flag_type: data.flag_type,
        severity: data.severity,
        description: data.description,
        suggested_action: data.suggested_action || null,
        is_resolved: false,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    await logAuditEvent({
      action: "flag",
      actor_id: user.id,
      actor_type: "admin",
      target_type: "candidate",
      target_id: data.candidate_id,
      details: { flag_type: data.flag_type, severity: data.severity },
      success: true,
    });

    revalidatePath(`/admin/candidate/${data.candidate_id}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Approve a candidate and convert to official opportunity
 */
export async function approveCandidate(
  candidateId: string,
  reviewNotes?: string,
): Promise<{ success: boolean; opportunityId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRole) {
    return { success: false, error: "Admin access required" };
  }

  try {
    // Get candidate
    const { data: candidate, error: candError } = await supabase
      .from("discovery_candidates")
      .select("*")
      .eq("id", candidateId)
      .single();

    if (candError || !candidate) {
      return { success: false, error: "Candidate not found" };
    }

    // Get official publisher account
    const { data: officialProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("publisher_type", "official")
      .maybeSingle();

    if (profileError || !officialProfile) {
      return { success: false, error: "Official publisher account not configured" };
    }

    // Create opportunity from candidate
    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .insert({
        title: candidate.title,
        description: candidate.description || "",
        type: candidate.subject_area || "Other",
        organizer: candidate.organizer || "Unknown",
        registration_link: candidate.registration_link || null,
        deadline: candidate.deadline || null,
        start_date: candidate.start_date || null,
        end_date: candidate.end_date || null,
        location: candidate.location || null,
        is_online: candidate.is_online || false,
        subject_area: candidate.subject_area || null,
        grade_requirements: candidate.grade_requirements || null,
        cost: candidate.cost || null,
        contact_info: candidate.contact_info || null,
        source_url: candidate.original_url,
        is_verified: true,
        verification_status: "verified",
        lifecycle_status: "published",
        source_type: "official",
        created_by: officialProfile.id,
        raw_source_text: candidate.raw_content || null,
      })
      .select("id")
      .single();

    if (oppError || !opportunity) {
      return { success: false, error: `Failed to create opportunity: ${oppError?.message}` };
    }

    // Update candidate status
    await supabase
      .from("discovery_candidates")
      .update({ status: "approved" })
      .eq("id", candidateId);

    // Update approval queue
    await supabase
      .from("approval_queue")
      .update({
        status: "approved",
        reviewer_id: user.id,
        decision_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq("candidate_id", candidateId);

    await logAuditEvent({
      action: "approve",
      actor_id: user.id,
      actor_type: "admin",
      target_type: "candidate",
      target_id: candidateId,
      details: { opportunityId: opportunity.id, notes: reviewNotes },
      success: true,
    });

    revalidatePath("/admin/queue");
    revalidatePath("/opportunities");
    return { success: true, opportunityId: opportunity.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Reject a candidate
 */
export async function rejectCandidate(
  candidateId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRole) {
    return { success: false, error: "Admin access required" };
  }

  try {
    await supabase
      .from("discovery_candidates")
      .update({ status: "rejected" })
      .eq("id", candidateId);

    await supabase
      .from("approval_queue")
      .update({
        status: "rejected",
        reviewer_id: user.id,
        decision_at: new Date().toISOString(),
        review_notes: reason || null,
      })
      .eq("candidate_id", candidateId);

    await logAuditEvent({
      action: "reject",
      actor_id: user.id,
      actor_type: "admin",
      target_type: "candidate",
      target_id: candidateId,
      details: { reason },
      success: true,
    });

    revalidatePath("/admin/queue");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
