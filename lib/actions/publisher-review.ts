"use server";

import { revalidatePath } from "next/cache";
import { UUID_RE } from "@/lib/auth/account";
import { isCurrentUserAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

type ReviewDecision = "approved" | "rejected";

function validDecision(value: string): value is ReviewDecision {
  return value === "approved" || value === "rejected";
}

function reviewError(message: string): string {
  return `${message} — make sure supabase/migration-publisher-workflows.sql has been applied.`;
}

async function assertAdmin(): Promise<{ error: string } | null> {
  if (!(await isCurrentUserAdmin())) {
    return { error: "Administrator access is required." };
  }
  return null;
}

function normalizeNotes(notes: string): string | null {
  const trimmed = notes.trim();
  return trimmed ? trimmed.slice(0, 2_000) : null;
}

export async function reviewPublisherListing(
  opportunityId: string,
  decision: string,
  reviewNotes = "",
): Promise<{ error?: string; success?: string }> {
  const accessError = await assertAdmin();
  if (accessError) return accessError;
  if (!UUID_RE.test(opportunityId) || !validDecision(decision)) {
    return { error: "The review request is invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_publisher_opportunity", {
    opportunity_id: opportunityId,
    decision,
    review_notes: normalizeNotes(reviewNotes),
  });

  if (error) return { error: reviewError(error.message) };

  revalidatePath("/admin/publisher-review");
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
  return {
    success: decision === "approved" ? "Listing published." : "Listing returned to its publisher.",
  };
}

export async function reviewPublisherProfile(
  publisherId: string,
  decision: string,
  reviewNotes = "",
): Promise<{ error?: string; success?: string }> {
  const accessError = await assertAdmin();
  if (accessError) return accessError;
  if (!UUID_RE.test(publisherId) || !validDecision(decision)) {
    return { error: "The review request is invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_publisher_profile", {
    publisher_id: publisherId,
    decision,
    review_notes: normalizeNotes(reviewNotes),
  });

  if (error) return { error: reviewError(error.message) };

  revalidatePath("/admin/publisher-review");
  return {
    success: decision === "approved" ? "Publisher profile verified." : "Publisher verification request returned.",
  };
}
