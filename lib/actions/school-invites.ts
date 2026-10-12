"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeInviteCode } from "@/lib/school/invites";

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
      error: `${error.message} — run supabase/migrate-school-invites-and-settings.sql.`,
    };
  }

  revalidatePath("/school/profile");
  return { success: "Invite code created." };
}

export async function deactivateSchoolInviteFromForm(
  formData: FormData,
): Promise<void> {
  const inviteId = formData.get("invite_id") as string;
  await deactivateSchoolInvite(inviteId);
}

export async function deactivateSchoolInvite(
  inviteId: string,
): Promise<InviteActionState> {
  const supabase = await createClient();
  const gate = await requireSchoolAccount(supabase);

  if (gate.error || !gate.schoolId) {
    return { error: gate.error ?? "Unauthorized." };
  }

  const { error } = await supabase
    .from("school_invite_codes")
    .update({ active: false })
    .eq("id", inviteId)
    .eq("school_id", gate.schoolId);

  if (error) {
    return { error: error.message };
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

  await supabase.rpc("redeem_school_invite", { invite_code: normalized });
  await supabase.from("profiles").update({ school_id: schoolId }).eq("id", user.id);
  await supabase.auth.updateUser({ data: { pending_school_invite: null } });
}
