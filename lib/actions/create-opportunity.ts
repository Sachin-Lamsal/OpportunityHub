"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManageOpportunities } from "@/lib/auth/account";
import type { AccountType } from "@/lib/types";
import { OPPORTUNITY_TYPES, SUBJECT_AREAS } from "@/lib/constants";
import { sanitizeRegistrationUrl } from "@/lib/utils/url";
import { formatOpportunityInsertError } from "@/lib/utils/supabase-errors";

export interface CreateOpportunityState {
  error?: string;
  success?: string;
  redirectTo?: string;
}

export async function createOpportunity(
  _prevState: CreateOpportunityState,
  formData: FormData,
): Promise<CreateOpportunityState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, organization_name")
    .eq("id", user.id)
    .maybeSingle();

  const accountType = profile?.account_type as AccountType | undefined;

  if (!canManageOpportunities(accountType)) {
    return { error: "Only schools and organizations can add opportunities." };
  }

  const title = (formData.get("title") as string)?.trim();
  const type = formData.get("type") as string;
  const description = (formData.get("description") as string)?.trim();
  const rawRegistrationLink = (formData.get("registration_link") as string)?.trim();
  const deadline = (formData.get("deadline") as string)?.trim() || null;
  const location = (formData.get("location") as string)?.trim() || null;
  const isOnline = formData.get("is_online") === "on";
  const subjectArea = (formData.get("subject_area") as string)?.trim() || null;
  const cost = (formData.get("cost") as string)?.trim() || null;

  if (!title || !description) {
    return { error: "Title and description are required." };
  }

  if (!OPPORTUNITY_TYPES.includes(type as (typeof OPPORTUNITY_TYPES)[number])) {
    return { error: "Please choose a valid opportunity type." };
  }

  if (subjectArea && !SUBJECT_AREAS.includes(subjectArea as (typeof SUBJECT_AREAS)[number])) {
    return { error: "Please select a valid subject area." };
  }

  let registrationLink: string | null = null;
  if (rawRegistrationLink) {
    registrationLink = sanitizeRegistrationUrl(rawRegistrationLink);
    if (!registrationLink) {
      return { error: "Please enter a valid website URL for the registration link." };
    }
  }

  const organizer =
    profile?.organization_name?.trim() ||
    (accountType === "school" ? "School" : "Organization");

  const verifiedAt = new Date().toISOString();

  const { error } = await supabase.from("opportunities").insert({
    title,
    type,
    description,
    organizer,
    registration_link: registrationLink,
    deadline,
    location,
    is_online: isOnline,
    subject_area: subjectArea,
    cost,
    created_by: user.id,
    source_type: "manual",
    is_verified: true,
    verification_status: "verified",
    verified_at: verifiedAt,
    verified_by: user.id,
  });

  if (error) {
    return {
      error: formatOpportunityInsertError(
        `${error.message} — run supabase/setup-all.sql if this is a new install.`,
      ),
    };
  }

  revalidatePath("/opportunities");
  revalidatePath("/school/dashboard");
  revalidatePath("/org/dashboard");

  const redirectTo =
    accountType === "school" ? "/school/dashboard" : "/org/dashboard";

  return {
    success: "Opportunity published successfully.",
    redirectTo,
  };
}

export async function updateOpportunity(
  _prevState: CreateOpportunityState,
  formData: FormData,
): Promise<CreateOpportunityState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const opportunityId = formData.get("opportunity_id") as string;
  if (!opportunityId) {
    return { error: "Opportunity ID is required." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  const accountType = profile?.account_type as AccountType | undefined;

  if (!canManageOpportunities(accountType)) {
    return { error: "Only schools and organizations can edit opportunities." };
  }

  const title = (formData.get("title") as string)?.trim();
  const type = formData.get("type") as string;
  const description = (formData.get("description") as string)?.trim();
  const rawRegistrationLink = (formData.get("registration_link") as string)?.trim();
  const deadline = (formData.get("deadline") as string)?.trim() || null;
  const location = (formData.get("location") as string)?.trim() || null;
  const isOnline = formData.get("is_online") === "on";
  const subjectArea = (formData.get("subject_area") as string)?.trim() || null;
  const cost = (formData.get("cost") as string)?.trim() || null;

  if (!title || !description) {
    return { error: "Title and description are required." };
  }

  if (!OPPORTUNITY_TYPES.includes(type as (typeof OPPORTUNITY_TYPES)[number])) {
    return { error: "Please choose a valid opportunity type." };
  }

  if (subjectArea && !SUBJECT_AREAS.includes(subjectArea as (typeof SUBJECT_AREAS)[number])) {
    return { error: "Please select a valid subject area." };
  }

  let registrationLink: string | null = null;
  if (rawRegistrationLink) {
    registrationLink = sanitizeRegistrationUrl(rawRegistrationLink);
    if (!registrationLink) {
      return { error: "Please enter a valid website URL for the registration link." };
    }
  }

  const { error } = await supabase
    .from("opportunities")
    .update({
      title,
      type,
      description,
      registration_link: registrationLink,
      deadline,
      location,
      is_online: isOnline,
      subject_area: subjectArea,
      cost,
    })
    .eq("id", opportunityId)
    .eq("created_by", user.id);

  if (error) {
    return { error: `Failed to update: ${error.message}` };
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/school/dashboard");
  revalidatePath("/org/dashboard");

  const redirectTo =
    accountType === "school" ? "/school/dashboard" : "/org/dashboard";

  return {
    success: "Opportunity updated successfully.",
    redirectTo,
  };
}

export async function deleteOpportunity(
  opportunityId: string,
): Promise<{ error?: string; success?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("opportunities")
    .delete()
    .eq("id", opportunityId)
    .eq("created_by", user.id);

  if (error) {
    return { error: `Failed to delete opportunity: ${error.message}` };
  }

  revalidatePath("/opportunities");
  revalidatePath("/school/dashboard");
  revalidatePath("/org/dashboard");

  return { success: "Opportunity deleted." };
}
