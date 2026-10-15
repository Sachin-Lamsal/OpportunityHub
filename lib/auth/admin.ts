import { createClient } from "@/lib/supabase/server";

/**
 * Returns true when the currently authenticated user has an admin or
 * superadmin role. Relies on the `admin_roles` RLS policy which allows a user
 * to read their own role row.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return adminRole?.role === "admin" || adminRole?.role === "superadmin";
}
