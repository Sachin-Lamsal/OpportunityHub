import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function validateSchoolInvite(
  supabase: SupabaseClient,
  inviteCode: string,
): Promise<{ schoolId: string; schoolName: string | null } | null> {
  const normalized = normalizeInviteCode(inviteCode);
  if (!normalized) return null;

  const { data, error } = await supabase.rpc("validate_school_invite", {
    invite_code: normalized,
  });

  if (error || !data?.length) {
    return null;
  }

  const row = data[0] as { school_id: string; school_name: string | null };
  return { schoolId: row.school_id, schoolName: row.school_name };
}

export async function resolveSchoolByCode(
  supabase: SupabaseClient,
  schoolCode: string,
): Promise<{ schoolId: string; schoolName: string | null; studentsInviteOnly: boolean } | null> {
  const normalized = normalizeInviteCode(schoolCode);
  if (!normalized) return null;

  const { data, error } = await supabase.rpc("resolve_school_by_code", {
    lookup_code: normalized,
  });

  if (error || !data?.length) {
    return null;
  }

  const row = data[0] as {
    school_id: string;
    school_name: string | null;
    students_invite_only: boolean;
  };

  return {
    schoolId: row.school_id,
    schoolName: row.school_name,
    studentsInviteOnly: Boolean(row.students_invite_only),
  };
}

export async function redeemSchoolInvite(
  supabase: SupabaseClient,
  inviteCode: string,
): Promise<boolean> {
  const normalized = normalizeInviteCode(inviteCode);
  if (!normalized) return false;

  const { data, error } = await supabase.rpc("redeem_school_invite", {
    invite_code: normalized,
  });

  if (error) return false;
  return data === true;
}
