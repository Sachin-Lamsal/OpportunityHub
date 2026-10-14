"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActivityCategory } from "@/lib/types";

export interface OnboardingActivityInput {
  title: string;
  category: ActivityCategory;
  description: string;
  date: string;
  opportunity_id?: string | null;
}

export interface CompleteOnboardingInput {
  activities?: OnboardingActivityInput[];
  interests?: string[];
  intended_major?: string;
  dream_universities?: string;
}

export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<{ success: boolean; error?: string; redirectTo?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "You must be signed in to complete onboarding." };
  }

  // 1. Insert selected/custom past activities if any
  if (input.activities && input.activities.length > 0) {
    const activityRows = input.activities.map((act) => ({
      user_id: user.id,
      title: act.title.trim(),
      category: act.category,
      description: act.description.trim() || "Completed activity",
      date: act.date || new Date().toISOString().split("T")[0],
      opportunity_id: act.opportunity_id || null,
    }));

    const { error: actError } = await supabase
      .from("activities")
      .insert(activityRows);

    if (actError) {
      console.warn("[Onboarding] Error inserting initial activities:", actError.message);
    }
  }

  // 2. Update student profile
  const updatePayload: Record<string, unknown> = {
    onboarding_completed: true,
  };

  if (input.interests && input.interests.length > 0) {
    updatePayload.interests = input.interests.join(", ");
    updatePayload.subjects = input.interests.join(", ");
  }

  if (input.intended_major?.trim()) {
    updatePayload.intended_major = input.intended_major.trim();
  }

  if (input.dream_universities?.trim()) {
    updatePayload.dream_universities = input.dream_universities.trim();
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  revalidatePath("/profile");

  return { success: true, redirectTo: "/dashboard" };
}
