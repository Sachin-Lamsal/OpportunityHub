import { createClient } from "@/lib/supabase/server";

export interface CurrentAdmin {
  id: string;
  email: string | null;
  role: "admin" | "superadmin";
}

/**
 * Returns the signed-in administrator, or null.
 *
 * Role-scoped: `admin_roles` also stores `moderator` rows, which the database's
 * `is_admin()` (and therefore every write policy and review RPC) deliberately
 * excludes, so a bare "row exists" check is not equivalent.
 *
 * One call performs one `auth.getUser()` and one role lookup; callers that also
 * need the user object (e.g. the admin layout) should use this instead of
 * calling `isCurrentUserAdmin()` and `getUser()` separately.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = adminRole?.role;
  if (role !== "admin" && role !== "superadmin") {
    return null;
  }

  return { id: user.id, email: user.email ?? null, role };
}

/**
 * Returns true when the currently authenticated user has an admin or
 * superadmin role. Relies on the `admin_roles` RLS policy which allows a user
 * to read their own role row.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  return (await getCurrentAdmin()) !== null;
}