"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/types";
import { sanitizeRegistrationUrl } from "@/lib/utils/url";

export interface OrgProfileState {
  error?: string;
  success?: string;
}

function settingsPath(accountType: AccountType): string {
  return accountType === "school" ? "/school/profile" : "/org/profile";
}

function publicProfilePath(accountType: AccountType, id: string): string {
  return accountType === "school" ? `/school/${id}` : `/org/${id}`;
}

function profileMigrationError(message: string): string {
  return `${message} — run supabase/migration-publisher-workflows.sql in the Supabase SQL Editor.`;
}

function readUrl(formData: FormData, field: string): string | null | "invalid" {
  const rawValue = (formData.get(field) as string | null)?.trim();
  if (!rawValue) return null;
  return sanitizeRegistrationUrl(rawValue) ?? "invalid";
}

export async function updateOrganizationProfile(
  _prevState: OrgProfileState,
  formData: FormData,
): Promise<OrgProfileState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileMigrationError(profileError.message) };
  }

  const accountType = profile?.account_type as AccountType | undefined;

  if (accountType !== "school" && accountType !== "organization") {
    return { error: "This form is only for schools and organizations." };
  }

  const organizationName = (
    formData.get("organization_name") as string
  )?.trim();
  const contactInfo = (formData.get("contact_info") as string)?.trim() || null;
  const organizationDescription =
    (formData.get("organization_description") as string)?.trim() || null;
  const websiteUrl = readUrl(formData, "website_url");
  const facebookUrl = readUrl(formData, "facebook_url");
  const instagramUrl = readUrl(formData, "instagram_url");
  const linkedInUrl = readUrl(formData, "linkedin_url");

  if (!organizationName) {
    return { error: "Name is required." };
  }

  if (
    websiteUrl === "invalid" ||
    facebookUrl === "invalid" ||
    instagramUrl === "invalid" ||
    linkedInUrl === "invalid"
  ) {
    return { error: "Please use valid website addresses for every link." };
  }

  const socialLinks = Object.fromEntries(
    [
      ["Facebook", facebookUrl],
      ["Instagram", instagramUrl],
      ["LinkedIn", linkedInUrl],
    ].filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );

  const updatePayload: Record<string, unknown> = {
    organization_name: organizationName,
    contact_info: contactInfo,
    organization_description: organizationDescription,
    website_url: websiteUrl,
    social_links: socialLinks,
  };

  if (accountType === "school") {
    updatePayload.students_invite_only =
      formData.get("students_invite_only") === "on";
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    return {
      error: profileMigrationError(error.message),
    };
  }

  revalidatePath(settingsPath(accountType));
  revalidatePath(
    accountType === "school" ? "/school/dashboard" : "/org/dashboard",
  );
  revalidatePath(publicProfilePath(accountType, user.id));

  return { success: "Settings saved." };
}

export async function requestPublisherVerification(): Promise<OrgProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_type, publisher_verification_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: profileMigrationError(profileError.message) };
  }

  const accountType = profile?.account_type as AccountType | undefined;
  if (accountType !== "school" && accountType !== "organization") {
    return { error: "Only schools and organizations can request verification." };
  }

  if (profile?.publisher_verification_status === "verified") {
    return { success: "This profile is already verified." };
  }

  if (profile?.publisher_verification_status === "pending") {
    return { success: "Your verification request is already awaiting review." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ publisher_verification_status: "pending" })
    .eq("id", user.id);

  if (error) {
    return { error: profileMigrationError(error.message) };
  }

  revalidatePath(settingsPath(accountType));
  revalidatePath(publicProfilePath(accountType, user.id));
  revalidatePath("/admin/publisher-review");

  return { success: "Verification requested. An administrator will review your profile." };
}
