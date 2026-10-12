"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AccountType } from "@/lib/types";

export interface OrgProfileState {
  error?: string;
  success?: string;
}

function settingsPath(accountType: AccountType): string {
  return accountType === "school" ? "/school/profile" : "/org/profile";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

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

  if (!organizationName) {
    return { error: "Name is required." };
  }

  const updatePayload: Record<string, unknown> = {
    organization_name: organizationName,
    contact_info: contactInfo,
    organization_description: organizationDescription,
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
      error: `${error.message} — run supabase/migrate-school-invites-and-settings.sql if columns are missing.`,
    };
  }

  revalidatePath(settingsPath(accountType));
  revalidatePath(
    accountType === "school" ? "/school/dashboard" : "/org/dashboard",
  );

  return { success: "Settings saved." };
}
