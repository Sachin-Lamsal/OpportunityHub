import { createClient } from "@/lib/supabase/server";
import type { SchoolInviteCode } from "@/lib/types";

export async function getSchoolInviteCodes(): Promise<SchoolInviteCode[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("school_invite_codes")
    .select("*")
    .eq("school_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load invite codes:", error.message);
    return [];
  }

  return (data ?? []) as SchoolInviteCode[];
}
