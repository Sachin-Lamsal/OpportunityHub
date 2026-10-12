import { createClient } from "@/lib/supabase/server";
import type { Profile, SchoolStudentSummary } from "@/lib/types";

export async function getLinkedStudentForSchool(
  studentId: string,
): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: student, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .eq("account_type", "student")
    .eq("school_id", user.id)
    .maybeSingle();

  if (error || !student) {
    return null;
  }

  return student as Profile;
}

export async function getLinkedStudentsForSchool(): Promise<
  SchoolStudentSummary[]
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: students, error } = await supabase
    .from("profiles")
    .select("id, email, education_level, dream_universities")
    .eq("account_type", "student")
    .eq("school_id", user.id)
    .order("email");

  if (error || !students?.length) {
    if (error) console.error("Failed to load school students:", error.message);
    return [];
  }

  const studentIds = students.map((s) => s.id);
  const { data: allActivities, error: actError } = await supabase
    .from("activities")
    .select("user_id, date")
    .in("user_id", studentIds)
    .order("date", { ascending: false });

  if (actError) {
    console.error("Failed to load student activities:", actError.message);
  }

  const activitiesByUser = new Map<string, string[]>();
  for (const act of allActivities ?? []) {
    const list = activitiesByUser.get(act.user_id) ?? [];
    list.push(act.date as string);
    activitiesByUser.set(act.user_id, list);
  }

  return students.map((student) => {
    const dates = activitiesByUser.get(student.id) ?? [];
    return {
      id: student.id,
      email: student.email,
      education_level: student.education_level,
      dream_universities: student.dream_universities,
      activity_count: dates.length,
      last_activity_date: dates[0] ?? null,
    };
  });
}
