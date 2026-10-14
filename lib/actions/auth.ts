"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";
import {
  dashboardPathFor,
  loginPathFor,
} from "@/lib/auth/account";
import type { AccountType, EducationLevel, Profile } from "@/lib/types";
import { ACCOUNT_TYPES } from "@/lib/constants";
import {
  normalizeInviteCode,
  redeemSchoolInvite,
  resolveSchoolByCode,
  validateSchoolInvite,
} from "@/lib/school/invites";
import { applyPendingSchoolInviteForUser } from "@/lib/actions/school-invites";

export interface AuthState {
  error?: string;
  success?: string;
  /** Set instead of calling redirect() — useActionState cannot handle redirect throws. */
  redirectTo?: string;
}

function parseAccountType(value: FormDataEntryValue | null): AccountType | null {
  if (typeof value !== "string") return null;
  return ACCOUNT_TYPES.includes(value as AccountType)
    ? (value as AccountType)
    : null;
}

function generateSchoolCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function signup(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const accountType = parseAccountType(formData.get("account_type"));
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!accountType || !email || !password) {
    return { error: "Please fill in all required fields." };
  }

  // SECURITY: Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  // SECURITY: Strong password policy (OWASP recommendations)
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (!/[A-Z]/.test(password)) {
    return { error: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { error: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { error: "Password must contain at least one number." };
  }

  if (!hasSupabaseEnv()) {
    return {
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const supabase = await createClient();
  let schoolId: string | null = null;
  let schoolCode: string | null = null;
  let educationLevel: EducationLevel | null = null;
  let dreamUniversity: string | null = null;
  let organizationName: string | null = null;

  let pendingSchoolInvite: string | null = null;

  if (accountType === "school") {
    schoolCode = generateSchoolCode();
  }

  if (accountType === "student") {
    educationLevel = formData.get("education_level") as EducationLevel;
    dreamUniversity = (formData.get("dream_university") as string)?.trim();
    const inputSchoolCode = (formData.get("school_code") as string)?.trim();
    const inviteCode = (formData.get("invite_code") as string)?.trim();
    let linkedViaInvite = false;

    if (!educationLevel || !dreamUniversity) {
      return { error: "Please fill in all student fields." };
    }

    if (inviteCode) {
      const invite = await validateSchoolInvite(supabase, inviteCode);
      if (!invite) {
        return {
          error:
            "That invite code is invalid, expired, or already used up. Ask your school for a new one.",
        };
      }
      schoolId = invite.schoolId;
      pendingSchoolInvite = normalizeInviteCode(inviteCode);
      linkedViaInvite = true;
    }

    if (inputSchoolCode) {
      const schoolResult = await resolveSchoolByCode(supabase, inputSchoolCode);
      if (!schoolResult) {
        return {
          error:
            "That school code was not found. Ask your school for their OpportunityHub code, or leave it blank.",
        };
      }
      if (schoolId && schoolId !== schoolResult.schoolId) {
        return {
          error:
            "Invite code and school code do not match the same school. Use one or the other.",
        };
      }
      schoolId = schoolResult.schoolId;
      if (schoolResult.studentsInviteOnly && !linkedViaInvite) {
        return {
          error:
            "This school only accepts students with an invite code. Ask your school for a personal invite.",
        };
      }
    }
  } else {
    organizationName = (formData.get("organization_name") as string)?.trim();
    if (!organizationName) {
      return {
        error:
          accountType === "school"
            ? "Please enter your school name."
            : "Please enter your organization name.",
      };
    }
  }

  // NOTE: We deliberately do NOT pre-check whether the email is already
  // registered. The previous `check_email_exists` RPC is SECURITY DEFINER and
  // was granted to `anon`, which let an unauthenticated caller enumerate every
  // registered address ("An account with this email already exists"). The
  // generic message below keeps signup from confirming or denying an address.

  let data;
  let error;

  try {
    ({ data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_type: accountType,
          organization_name: organizationName ?? undefined,
          education_level: educationLevel ?? undefined,
          dream_universities: dreamUniversity ?? undefined,
          school_id: schoolId ?? undefined,
          school_code: schoolCode ?? undefined,
          pending_school_invite: pendingSchoolInvite ?? undefined,
        },
      },
    }));
  } catch {
    return {
      error:
        "Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local and your network connection.",
    };
  }

  if (error) {
    const rawMsg = (error.message || "").trim();
    // Do not confirm or deny that an address is registered: distinguishing
    // this error from any other would reintroduce account enumeration.
    if (
      rawMsg.toLowerCase().includes("already registered") ||
      rawMsg.toLowerCase().includes("user already exists")
    ) {
      return {
        error:
          "If that address can be registered, a confirmation link is on its way. If you already have an account, try logging in instead.",
      };
    }

    if (
      rawMsg === "{}" ||
      !rawMsg ||
      rawMsg.toLowerCase().includes("error sending confirmation") ||
      rawMsg.toLowerCase().includes("unexpected_failure")
    ) {
      return {
        error:
          "Unable to send confirmation email. Please check your Resend SMTP settings and verified domain in Supabase Dashboard, or disable 'Confirm email' in Authentication → Providers → Email.",
      };
    }

    return { error: rawMsg };
  }

  if (!data?.user) {
    return { error: "Could not create account. Please try again." };
  }

  // Supabase returns an empty identities array when user enumeration protection is on
  // and the email is already registered. We must NOT surface this as a distinct
  // outcome, otherwise the signup form becomes an account-enumeration oracle.
  // Returning the same neutral message as a successful send keeps it private.
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return {
      success:
        "If that address can be registered, a confirmation link is on its way. Check your inbox, or try logging in if you already have an account.",
    };
  }

  if (data.session) {
    const upsertRow: Record<string, unknown> = {
      id: data.user.id,
      email,
      account_type: accountType,
      organization_name: organizationName,
      education_level: educationLevel,
      dream_universities: dreamUniversity,
      school_id: schoolId,
    };

    if (accountType === "school" && schoolCode) {
      upsertRow.school_code = schoolCode;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(upsertRow, { onConflict: "id" });

    if (profileError) {
      return {
        error: `Account created but profile save failed: ${profileError.message}. Run supabase/migrate-account-types.sql in the Supabase SQL Editor.`,
      };
    }

    if (accountType === "student" && pendingSchoolInvite) {
      await redeemSchoolInvite(supabase, pendingSchoolInvite);
      await supabase.auth.updateUser({ data: { pending_school_invite: null } });
    }
  }

  if (!data.session) {
    return {
      success:
        "Account created! Check your email to confirm, then log in.",
    };
  }

  revalidatePath("/", "layout");
  if (accountType === "student") {
    return { redirectTo: "/onboarding" };
  }
  return { redirectTo: dashboardPathFor(accountType) };
}

export async function login(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const expectedType = parseAccountType(formData.get("account_type"));
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  if (!hasSupabaseEnv()) {
    return {
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const supabase = await createClient();

  let error;

  try {
    ({ error } = await supabase.auth.signInWithPassword({
      email,
      password,
    }));
  } catch {
    return {
      error:
        "Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local and your network connection.",
    };
  }

  if (error) {
    const rawMsg = (error.message || "").trim();
    if (rawMsg.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "Email not confirmed yet. Check your email for the confirmation link, or disable 'Confirm email' in Supabase Dashboard (Authentication → Providers → Email).",
      };
    }
    if (rawMsg === "{}" || !rawMsg) {
      return {
        error: "Login failed. Please check your credentials or network connection.",
      };
    }
    return { error: rawMsg };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Could not verify your session. Please try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const accountType: AccountType =
    (profile?.account_type as AccountType | undefined) ??
    (meta.account_type as AccountType | undefined) ??
    expectedType ??
    "student";

  // Self-heal: if profile row is missing in Supabase, create it immediately
  if (!profile) {
    const upsertRow: Record<string, unknown> = {
      id: user.id,
      email: user.email || email,
      account_type: accountType,
      organization_name: meta.organization_name || null,
      education_level: meta.education_level || null,
      dream_universities: meta.dream_universities || null,
      school_id: meta.school_id || null,
      school_code:
        accountType === "school"
          ? (meta.school_code as string | undefined) || generateSchoolCode()
          : null,
    };
    await supabase.from("profiles").upsert(upsertRow, { onConflict: "id" });
  }

  if (expectedType && accountType !== expectedType) {
    await supabase.auth.signOut();
    const label =
      expectedType === "school"
        ? "a school"
        : expectedType === "organization"
          ? "an organization"
          : "a student";
    return {
      error: `This account is not registered as ${label}. Use the correct login page or sign up for the right account type.`,
    };
  }

  if (accountType === "student") {
    await applyPendingSchoolInviteForUser();
  }

  revalidatePath("/", "layout");

  if (accountType === "student") {
    const { data: studentProfile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (studentProfile?.onboarding_completed === false) {
      return { redirectTo: "/onboarding" };
    }
  }

  return { redirectTo: dashboardPathFor(accountType) };
}

export async function logout(formData?: FormData) {
  const accountType = formData
    ? parseAccountType(formData.get("account_type"))
    : null;
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect(accountType ? loginPathFor(accountType) : "/login");
}

/**
 * Builds an absolute, trusted origin for auth redirects. Never derives the
 * host from the incoming request, which would allow Host-header injection.
 */
function authRedirectOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}

/**
 * Sends a Supabase password-recovery email.
 * Always reports success regardless of whether the address exists, so the form
 * cannot be used to enumerate registered accounts.
 */
export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email) {
    return { error: "Please enter your email address." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (!hasSupabaseEnv()) {
    return {
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const supabase = await createClient();
  const redirectTo = `${authRedirectOrigin()}/auth/callback?next=/reset-password`;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("Password reset request failed:", error.message);
      return {
        error:
          "We could not send the reset email right now. Please try again later.",
      };
    }
  } catch {
    return {
      error:
        "Could not reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local and your network connection.",
    };
  }

  return {
    success:
      "If an account exists for that address, a password reset link is on its way.",
  };
}

/**
 * Completes a password reset. The user must arrive from Supabase's recovery
 * link, which establishes a session; otherwise this returns an error.
 */
export async function updatePassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!password || !confirmPassword) {
    return { error: "Please fill in both password fields." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  if (!hasSupabaseEnv()) {
    return {
      error:
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "This reset link is invalid or has expired. Please request a new reset email.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("Password update failed:", error.message);
    return {
      error:
        "Could not update your password. The reset link may have expired — please request a new one.",
    };
  }

  return { success: "Your password has been updated. You can now log in." };
}

export async function updateProfile(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const educationLevel = formData.get("education_level") as string;
  const dreamUniversities = (formData.get("dream_universities") as string)?.trim();
  const subjects = (formData.get("subjects") as string)?.trim() || null;
  const interests = (formData.get("interests") as string)?.trim() || null;
  const careerInterests = (formData.get("career_interests") as string)?.trim() || null;
  const emailRemindersRaw = formData.get("email_reminders");
  const emailReminders =
    emailRemindersRaw !== null
      ? emailRemindersRaw === "true" || emailRemindersRaw === "on"
      : undefined;

  const newsletterSubscribedRaw = formData.get("newsletter_subscribed");
  const newsletterSubscribed =
    newsletterSubscribedRaw !== null
      ? newsletterSubscribedRaw === "true" || newsletterSubscribedRaw === "on"
      : undefined;

  const updatePayload: Record<string, unknown> = {
    education_level: educationLevel || null,
    dream_universities: dreamUniversities || null,
    subjects,
    interests,
    career_interests: careerInterests,
  };

  if (emailReminders !== undefined) {
    updatePayload.email_reminders = emailReminders;
  }
  if (newsletterSubscribed !== undefined) {
    updatePayload.newsletter_subscribed = newsletterSubscribed;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: "Profile updated successfully." };
}

export const getProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  let profile = profileData;

  if (profileError) {
    console.error("Failed to load profile:", profileError.message);
    return null;
  }

  if (!profile) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const accountType: AccountType =
      (meta.account_type as AccountType | undefined) ?? "student";
    const newProfile: Record<string, unknown> = {
      id: user.id,
      email: user.email || "",
      account_type: accountType,
      organization_name: meta.organization_name || null,
      education_level: meta.education_level || null,
      dream_universities: meta.dream_universities || null,
      school_id: meta.school_id || null,
      school_code:
        accountType === "school"
          ? (meta.school_code as string | undefined) || generateSchoolCode()
          : null,
    };
    const { data: created } = await supabase
      .from("profiles")
      .upsert(newProfile, { onConflict: "id" })
      .select("*")
      .maybeSingle();

    profile = created ?? newProfile;
  }

  // Auto-heal missing school_code for schools
  if (profile.account_type === "school" && !profile.school_code) {
    const newCode = generateSchoolCode();
    await supabase.from("profiles").update({ school_code: newCode }).eq("id", user.id);
    profile.school_code = newCode;
  }

  if (profile.account_type === "student") {
    if (!profile.school_id && user.user_metadata?.school_id) {
      const metaSchoolId = user.user_metadata.school_id as string;
      await supabase.from("profiles").update({ school_id: metaSchoolId }).eq("id", user.id);
      profile.school_id = metaSchoolId;
    }
    await applyPendingSchoolInviteForUser();
  }

  let schoolName: string | null = null;
  if (profile.school_id) {
    const { data: schoolProfile } = await supabase
      .from("profiles")
      .select("organization_name")
      .eq("id", profile.school_id)
      .maybeSingle();
    schoolName = schoolProfile?.organization_name ?? null;
  }

  const normalized: Profile = {
    ...profile,
    account_type: (profile.account_type ?? "student") as AccountType,
    students_invite_only: profile.students_invite_only ?? false,
    school_name: schoolName,
  };

  return normalized;
});

export async function linkSchoolToStudent(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "student") {
    return { error: "Only student accounts can link to a school." };
  }

  const schoolCode = (formData.get("school_code") as string)?.trim();
  const inviteCode = (formData.get("invite_code") as string)?.trim();

  if (!schoolCode && !inviteCode) {
    return { error: "Please enter a school code or invite code." };
  }

  let targetSchoolId: string | null = null;
  let linkedViaInvite = false;
  let pendingInvite: string | null = null;

  if (inviteCode) {
    const invite = await validateSchoolInvite(supabase, inviteCode);
    if (!invite) {
      return {
        error:
          "That invite code is invalid, expired, or already used up. Ask your school for a new one.",
      };
    }
    targetSchoolId = invite.schoolId;
    pendingInvite = normalizeInviteCode(inviteCode);
    linkedViaInvite = true;
  }

  if (schoolCode) {
    const schoolResult = await resolveSchoolByCode(supabase, schoolCode);
    if (!schoolResult) {
      return {
        error:
          "That school code was not found. Ask your school for their OpportunityHub code.",
      };
    }
    if (targetSchoolId && targetSchoolId !== schoolResult.schoolId) {
      return {
        error: "Invite code and school code do not match the same school.",
      };
    }
    targetSchoolId = schoolResult.schoolId;
    if (schoolResult.studentsInviteOnly && !linkedViaInvite) {
      return {
        error:
          "This school requires a one-time invite code. Please ask your school for a student invite.",
      };
    }
  }

  if (!targetSchoolId) {
    return { error: "Could not identify school." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ school_id: targetSchoolId })
    .eq("id", user.id);

  if (updateError) {
    return { error: `Failed to link school: ${updateError.message}` };
  }

  if (pendingInvite) {
    await redeemSchoolInvite(supabase, pendingInvite);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: "School linked successfully!" };
}
