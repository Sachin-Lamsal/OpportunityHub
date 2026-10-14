import { createClient } from "@/lib/supabase/server";
import {
  AI_TIERS,
  getTierLimits,
  type AiTier,
  type AiTierId,
} from "@/lib/ai/tiers";
import { generateTextWithTier, type GenerateTextResult } from "@/lib/ai/gemini";

export interface AiUsageTierSummary {
  id: AiTierId;
  label: string;
  used: number;
  limit: number;
  remaining: number;
}

export interface AiUsageSummary {
  activeTier: AiTierId | "exhausted";
  activeTierLabel: string;
  resetMonth: string;
  totalLimit: number;
  totalUsed: number;
  totalRemaining: number;
  tiers: AiUsageTierSummary[];
}

interface UsageRow {
  user_id: string;
  premium_used: number;
  standard_used: number;
  basic_used: number;
  reset_month: string;
}

function currentResetMonth(): string {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}`;
}

function usedForTier(row: UsageRow, tierId: AiTierId): number {
  switch (tierId) {
    case "premium":
      return row.premium_used;
    case "standard":
      return row.standard_used;
    case "basic":
      return row.basic_used;
  }
}

function remainingForTier(row: UsageRow, tierId: AiTierId): number {
  const limits = getTierLimits();
  return Math.max(0, limits[tierId] - usedForTier(row, tierId));
}

export function resolveActiveTier(row: UsageRow): AiTier | null {
  for (const tier of AI_TIERS) {
    if (remainingForTier(row, tier.id) > 0) {
      return tier;
    }
  }
  return null;
}

async function getOrCreateUsageRow(userId: string): Promise<UsageRow> {
  const supabase = await createClient();
  const month = currentResetMonth();

  const { data: existing, error: selectError } = await supabase
    .from("ai_user_usage")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(
      `Could not load AI usage. Run supabase/migrate-ai-usage.sql — ${selectError.message}`,
    );
  }

  if (!existing) {
    const { data: created, error: insertError } = await supabase
      .from("ai_user_usage")
      .insert({ user_id: userId, reset_month: month })
      .select("*")
      .single();

    if (insertError || !created) {
      throw new Error(
        `Could not create AI usage row. Run supabase/migrate-ai-usage.sql — ${insertError?.message}`,
      );
    }

    return created as UsageRow;
  }

  const row = existing as UsageRow;

  if (row.reset_month !== month) {
    const { data: reset, error: resetError } = await supabase
      .from("ai_user_usage")
      .update({
        premium_used: 0,
        standard_used: 0,
        basic_used: 0,
        reset_month: month,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select("*")
      .single();

    if (resetError || !reset) {
      throw new Error(`Could not reset AI usage — ${resetError?.message}`);
    }

    return reset as UsageRow;
  }

  return row;
}

export async function getAIUsageSummaryForUser(
  userId: string,
): Promise<AiUsageSummary> {
  const row = await getOrCreateUsageRow(userId);
  const limits = getTierLimits();
  const active = resolveActiveTier(row);

  const tierSummaries = AI_TIERS.map((tier) => {
    const used = usedForTier(row, tier.id);
    const limit = limits[tier.id];
    return {
      id: tier.id,
      label: tier.label,
      used,
      limit,
      remaining: Math.max(0, limit - used),
    };
  });

  const totalLimit = tierSummaries.reduce((acc, t) => acc + t.limit, 0);
  const totalUsed = tierSummaries.reduce((acc, t) => acc + t.used, 0);
  const totalRemaining = Math.max(0, totalLimit - totalUsed);

  return {
    activeTier: active?.id ?? "exhausted",
    activeTierLabel: active?.label ?? "Offline guidance active",
    resetMonth: row.reset_month,
    totalLimit,
    totalUsed,
    totalRemaining,
    tiers: tierSummaries,
  };
}

async function consumeTierCredit(userId: string, tierId: AiTierId): Promise<void> {
  const supabase = await createClient();
  const row = await getOrCreateUsageRow(userId);
  const column =
    tierId === "premium"
      ? "premium_used"
      : tierId === "standard"
        ? "standard_used"
        : "basic_used";

  const { error } = await supabase
    .from("ai_user_usage")
    .update({
      [column]: usedForTier(row, tierId) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Could not record AI usage — ${error.message}`);
  }
}

export interface GenerateWithQuotaResult extends GenerateTextResult {
  tierUsed?: AiTierId;
  tierLabel?: string;
  quotaExhausted?: boolean;
}

/**
 * Picks the user's best available tier, calls Gemini, and deducts one talk
 * only after a successful response. If the primary model encounters a transient error,
 * automatically attempts the smaller fallback model before failing.
 */
export async function generateWithUserQuota(
  userId: string,
  prompt: string,
): Promise<GenerateWithQuotaResult> {
  const row = await getOrCreateUsageRow(userId);
  const tier = resolveActiveTier(row);

  if (!tier) {
    const limits = getTierLimits();
    const total = limits.premium + limits.standard + (limits.basic ?? 0);
    return {
      text: null,
      quotaExhausted: true,
      error: `You have completed all ${total} of your monthly AI talks. Talks reset on the 1st. Offline rule-based guidance is active below.`,
    };
  }

  let result = await generateTextWithTier(prompt, tier);
  let usedTier = tier;

  // Resilient model fallback: if primary model fails, try the fallback model if standard quota is available
  if (!result.text && tier.id === "premium") {
    const fallbackTier = AI_TIERS.find((t) => t.id === "standard");
    if (fallbackTier && remainingForTier(row, fallbackTier.id) > 0) {
      const fallbackResult = await generateTextWithTier(prompt, fallbackTier);
      if (fallbackResult.text) {
        result = fallbackResult;
        usedTier = fallbackTier;
      }
    }
  }

  if (result.text) {
    await consumeTierCredit(userId, usedTier.id);
    return {
      ...result,
      tierUsed: usedTier.id,
      tierLabel: usedTier.label,
    };
  }

  return result;
}

export function formatUsageHint(summary: AiUsageSummary): string {
  if (summary.activeTier === "exhausted" || summary.totalRemaining === 0) {
    return "Monthly AI talks reached (10/10). Offline portfolio guidance is active.";
  }
  return `${summary.totalRemaining} of ${summary.totalLimit} AI talks left this month (${summary.activeTierLabel})`;
}
