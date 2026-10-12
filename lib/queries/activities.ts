import { createClient } from "@/lib/supabase/server";
import type { Activity } from "@/lib/types";

export async function getActivities(): Promise<Activity[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false });

  if (error) {
    console.error("Failed to fetch activities:", error.message);
    return [];
  }

  return (data ?? []) as Activity[];
}

export async function getRecentActivities(limit = 5): Promise<Activity[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch recent activities:", error.message);
    return [];
  }

  return (data ?? []) as Activity[];
}

/** For schools viewing a linked student's portfolio (RLS must allow). */
export async function getActivitiesForUser(userId: string): Promise<Activity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error) {
    console.error("Failed to fetch student activities:", error.message);
    return [];
  }

  return (data ?? []) as Activity[];
}

export async function getActivityById(id: string): Promise<Activity | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("activities")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Failed to fetch activity:", error.message);
    return null;
  }

  return data as Activity;
}
