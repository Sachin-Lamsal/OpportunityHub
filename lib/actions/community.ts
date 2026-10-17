"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface CommunityActionState {
  error?: string;
  success?: string;
}

/**
 * Post a community discussion question or reply
 */
export async function postComment(
  opportunityId: string,
  content: string,
  parentId?: string | null,
): Promise<CommunityActionState> {
  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Comment text cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to post comments or questions." };
  }

  const { error } = await supabase.from("opportunity_comments").insert({
    opportunity_id: opportunityId,
    user_id: user.id,
    content: trimmed,
    parent_id: parentId || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: "Comment posted!" };
}

/**
 * Delete a user's own comment
 */
export async function deleteComment(
  commentId: string,
  opportunityId: string,
): Promise<CommunityActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { error } = await supabase
    .from("opportunity_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: "Comment deleted." };
}

/**
 * Submit participant experience, advice, and tips
 */
export async function submitReview(
  opportunityId: string,
  data: {
    difficulty_rating?: "Beginner" | "Intermediate" | "Advanced" | "Challenging" | null;
    prep_tips: string;
    common_mistakes?: string;
    skills_developed?: string;
  },
): Promise<CommunityActionState> {
  const prepTips = data.prep_tips.trim();
  if (!prepTips) {
    return { error: "Please share at least one preparation tip or piece of advice." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to contribute participant advice." };
  }

  // Verified-participant badge: has this user logged this opportunity in their
  // portfolio? `.limit(1)` is required — a student may log the same opportunity
  // more than once, and `maybeSingle()` errors on multiple rows, which silently
  // downgraded them to an unverified participant.
  const { data: activities } = await supabase
    .from("activities")
    .select("id")
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId)
    .limit(1);

  const isVerifiedParticipant = Boolean(activities && activities.length > 0);

  const { error } = await supabase.from("opportunity_reviews").upsert(
    {
      opportunity_id: opportunityId,
      user_id: user.id,
      difficulty_rating: data.difficulty_rating || null,
      prep_tips: prepTips,
      common_mistakes: data.common_mistakes?.trim() || null,
      skills_developed: data.skills_developed?.trim() || null,
      verified_participant: isVerifiedParticipant,
    },
    { onConflict: "opportunity_id,user_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/opportunities/${opportunityId}`);
  return { success: "Thank you for contributing your experience!" };
}

/**
 * Follow a school or organization
 */
export async function toggleFollowOrganization(
  organizationId: string,
): Promise<{ success: boolean; following?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to follow organizations." };
  }

  const { data: existing } = await supabase
    .from("organization_follows")
    .select("id")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const { data: publisher } = await supabase
    .from("publisher_profiles")
    .select("account_type")
    .eq("id", organizationId)
    .maybeSingle();

  const publisherPath =
    publisher?.account_type === "school"
      ? `/school/${organizationId}`
      : `/org/${organizationId}`;

  if (existing) {
    const { error } = await supabase
      .from("organization_follows")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(publisherPath);
    return { success: true, following: false };
  }

  const { error: insertError } = await supabase.from("organization_follows").insert({
    user_id: user.id,
    organization_id: organizationId,
  });

  if (insertError) {
    // Without this check a failed insert still reported success and the button
    // showed "Following" for a follow that was never saved.
    return { success: false, error: insertError.message };
  }

  revalidatePath(publisherPath);
  return { success: true, following: true };
}
