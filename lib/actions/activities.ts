"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import { UUID_RE } from "@/lib/auth/account";
import type { ActivityCategory } from "@/lib/types";

export interface ActivityState {
  error?: string;
  success?: string;
  redirectTo?: string;
}

export async function createActivity(
  _prevState: ActivityState,
  formData: FormData,
): Promise<ActivityState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "student") {
    return { error: "Only student accounts can add portfolio activities." };
  }

  const title = (formData.get("title") as string)?.trim();
  const category = formData.get("category") as ActivityCategory;
  const description = (formData.get("description") as string)?.trim();
  const date = formData.get("date") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const opportunityId = (formData.get("opportunity_id") as string)?.trim() || null;

  if (!title || !category || !description || !date) {
    return { error: "Please fill in all required fields." };
  }

  if (!ACTIVITY_CATEGORIES.includes(category)) {
    return { error: "Please select a valid category." };
  }

  if (opportunityId && !UUID_RE.test(opportunityId)) {
    return { error: "Please select a valid OpportunityHub opportunity." };
  }

  const { error } = await supabase.from("activities").insert({
    user_id: user.id,
    title,
    category,
    description,
    date,
    notes,
    opportunity_id: opportunityId,
    participation_status: opportunityId ? "pending" : "unverified",
    participation_requested_at: opportunityId ? new Date().toISOString() : null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/cv-builder");
  return {
    redirectTo: "/portfolio",
    success: opportunityId
      ? "Activity saved. Your participation is ready for confirmation."
      : "Activity saved.",
  };
}

export async function deleteActivity(activityId: string): Promise<ActivityState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", activityId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/cv-builder");
  return { success: "Activity deleted." };
}

/**
 * Lets a school verify (or remove verification from) an activity belonging to
 * a student who is currently linked to that school. The database RPC repeats
 * this authorization check and only permits changes to verification fields.
 */
export async function setSchoolActivityVerification(
  activityId: string,
  shouldVerify: boolean,
): Promise<ActivityState> {
  if (!UUID_RE.test(activityId) || typeof shouldVerify !== "boolean") {
    return { error: "Invalid activity verification request." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "school") {
    return { error: "Only school accounts can verify student activities." };
  }

  const { data: studentId, error } = await supabase.rpc(
    "set_school_activity_verification",
    {
      activity_uuid: activityId,
      should_verify: shouldVerify,
    },
  );

  if (error || !studentId) {
    console.error("Failed to update school activity verification:", error?.message);
    return {
      error:
        "This activity could not be verified. It may no longer belong to a student linked to your school.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  revalidatePath("/school/students");
  revalidatePath(`/school/students/${studentId}`);

  return {
    success: shouldVerify
      ? "Participation confirmed by your school."
      : "School confirmation removed.",
  };
}

/** Ask the school or listing organization to confirm a linked activity. */
export async function requestParticipationConfirmation(
  activityId: string,
): Promise<ActivityState> {
  if (!UUID_RE.test(activityId)) {
    return { error: "Invalid participation confirmation request." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in." };

  const { data: studentId, error } = await supabase.rpc(
    "request_activity_participation_verification",
    { activity_uuid: activityId },
  );

  if (error || !studentId) {
    return {
      error:
        "This activity cannot be requested for confirmation. Link it to an OpportunityHub listing first.",
    };
  }

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/school/students");
  revalidatePath(`/school/students/${studentId}`);
  revalidatePath("/org/participation");

  return { success: "Confirmation request sent." };
}

/** Lets the organization that published a listing confirm a student's request. */
export async function setOrganizationActivityVerification(
  activityId: string,
  shouldVerify: boolean,
): Promise<ActivityState> {
  if (!UUID_RE.test(activityId) || typeof shouldVerify !== "boolean") {
    return { error: "Invalid participation confirmation request." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You must be logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "organization") {
    return { error: "Only organization accounts can confirm these requests." };
  }

  const { data: studentId, error } = await supabase.rpc(
    "set_organization_activity_verification",
    {
      activity_uuid: activityId,
      should_verify: shouldVerify,
    },
  );

  if (error || !studentId) {
    return {
      error:
        "This participation record is not available for your organization.",
    };
  }

  revalidatePath("/org/participation");
  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath(`/school/students/${studentId}`);

  return {
    success: shouldVerify
      ? "Participation confirmed. The student can now share their experience."
      : "Organization confirmation removed.",
  };
}
