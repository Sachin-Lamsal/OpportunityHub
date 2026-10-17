"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeInviteCode, redeemSchoolInvite } from "@/lib/school/invites";

export interface InviteActionState {
  error?: string;
  success?: string;
}

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

async function requireSchoolAccount(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." as const, user: null, schoolId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "school") {
    return {
      error: "Only school accounts can manage invites." as const,
      user: null,
      schoolId: null,
    };
  }

  return { error: null, user, schoolId: user.id };
}

export async function createSchoolInvite(
  _prevState: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const supabase = await createClient();
  const gate = await requireSchoolAccount(supabase);

  if (gate.error || !gate.schoolId) {
    return { error: gate.error ?? "Unauthorized." };
  }

  const label = (formData.get("label") as string)?.trim() || null;
  const maxUsesRaw = (formData.get("max_uses") as string)?.trim();
  const maxUses = maxUsesRaw ? Math.max(1, parseInt(maxUsesRaw, 10) || 1) : 1;

  const { error } = await supabase.from("school_invite_codes").insert({
    school_id: gate.schoolId,
    code: generateInviteCode(),
    label,
    max_uses: maxUses,
  });

  if (error) {
    return {
      error: `${error.message} — complete the database setup described in supabase/README.md.`,
    };
  }

  revalidatePath("/school/profile");
  return { success: "Invite code created." };
}

export async function deactivateSchoolInvite(
  inviteId: string,
): Promise<InviteActionState> {
  const supabase = await createClient();
  const gate = await requireSchoolAccount(supabase);

  if (gate.error || !gate.schoolId) {
    return { error: gate.error ?? "Unauthorized." };
  }

  // `.select("id")` makes PostgREST return the rows it actually updated.
  // Without it, "no matching row" is indistinguishable from success and the UI
  // reports "Invite deactivated." for an invite that is still active.
  const { data: updated, error } = await supabase
    .from("school_invite_codes")
    .update({ active: false })
    .eq("id", inviteId)
    .eq("school_id", gate.schoolId)
    .select("id");

  if (error) {
    return { error: error.message };
  }

  if (!updated || updated.length === 0) {
    return { error: "That invite code no longer exists or is not managed by your school." };
  }

  revalidatePath("/school/profile");
  return { success: "Invite deactivated." };
}

export async function applyPendingSchoolInviteForUser(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const pending = user.user_metadata?.pending_school_invite as string | undefined;
  if (!pending) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("school_id, account_type")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.account_type !== "student" || profile.school_id) return;

  const normalized = normalizeInviteCode(pending);
  const validated = await supabase.rpc("validate_school_invite", {
    invite_code: normalized,
  });

  if (validated.error || !validated.data?.length) return;

  const schoolId = (validated.data[0] as { school_id: string }).school_id;

  // The invite must actually be redeemed before the student is linked. The RPC
  // re-checks `use_count < max_uses` atomically, so validation above can be
  // stale; an unchecked call would link the student while consuming no use and
  // would clear the pending code even if the profile update failed.
  const redeemed = await redeemSchoolInvite(supabase, normalized);

  if (!redeemed) return;

  // The invite has been consumed, so the pending code is cleared first. Leaving
  // it set would make every later login redeem the same one-time code again and
  // burn through `max_uses` without ever linking the student.
  await supabase.auth.updateUser({ data: { pending_school_invite: null } });

  const { error: linkError } = await supabase
    .from("profiles")
    .update({ school_id: schoolId })
    .eq("id", user.id);

  if (linkError) {
    // The student stays unlinked and can retry from /profile with the same code.
    console.error(
      "[school-invite] Invite redeemed but the profile could not be linked:",
      linkError.message,
    );
  }
}
