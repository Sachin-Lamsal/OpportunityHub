"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export interface SaveState {
  error?: string;
  saved?: boolean;
  remindDeadline?: boolean;
}

export async function toggleSaveOpportunity(
  opportunityId: string,
  options?: { remindDeadline?: boolean },
): Promise<SaveState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to save opportunities." };
  }

  const { data: existing } = await supabase
    .from("saved_opportunities")
    .select("id")
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_opportunities")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/opportunities");
    revalidatePath(`/opportunities/${opportunityId}`);
    revalidatePath("/dashboard");
    return { saved: false, remindDeadline: false };
  }

  const remindDeadline = options?.remindDeadline ?? true;
  const { error } = await supabase.from("saved_opportunities").insert({
    user_id: user.id,
    opportunity_id: opportunityId,
    remind_deadline: remindDeadline,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/dashboard");
  return { saved: true, remindDeadline };
}

export async function updateOpportunityReminder(
  opportunityId: string,
  remindDeadline: boolean,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("saved_opportunities")
    .update({ remind_deadline: remindDeadline })
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

