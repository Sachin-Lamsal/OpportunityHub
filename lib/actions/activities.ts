"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import type { ActivityCategory } from "@/lib/types";

export interface ActivityState {
  error?: string;
  success?: string;
  redirectTo?: string;
}

export async function createActivity(
  _prevState: ActivityState,
  formData: FormData,
): Promise<ActivityState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const title = (formData.get("title") as string)?.trim();
  const category = formData.get("category") as ActivityCategory;
  const description = (formData.get("description") as string)?.trim();
  const date = formData.get("date") as string;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const opportunityId = (formData.get("opportunity_id") as string)?.trim() || null;

  if (!title || !category || !description || !date) {
    return { error: "Please fill in all required fields." };
  }

  if (!ACTIVITY_CATEGORIES.includes(category)) {
    return { error: "Please select a valid category." };
  }

  const { error } = await supabase.from("activities").insert({
    user_id: user.id,
    title,
    category,
    description,
    date,
    notes,
    opportunity_id: opportunityId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/cv-builder");
  return { redirectTo: "/portfolio" };
}

export async function deleteActivity(activityId: string): Promise<ActivityState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", activityId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portfolio");
  revalidatePath("/dashboard");
  revalidatePath("/cv-builder");
  return { success: "Activity deleted." };
}
