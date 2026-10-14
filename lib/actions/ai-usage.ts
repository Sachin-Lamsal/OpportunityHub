"use server";

import { createClient } from "@/lib/supabase/server";
import {
  formatUsageHint,
  getAIUsageSummaryForUser,
  type AiUsageSummary,
} from "@/lib/ai/usage";

export async function getAIUsageSummary(): Promise<AiUsageSummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return getAIUsageSummaryForUser(user.id);
}

export async function getAIUsageHint(): Promise<string | null> {
  const summary = await getAIUsageSummary();
  if (!summary) return null;
  return formatUsageHint(summary);
}
