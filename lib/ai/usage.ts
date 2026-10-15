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

const MAX_CAS_ATTEMPTS = 5;

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

export async function getOrCreateUsageRow(userId: string): Promise<UsageRow> {
  const supabase = await createClient();
  const month = currentResetMonth();

  const { data: existing, error: selectError } = await supabase
    .from("ai_user_usage")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(
      `Could not load AI usage. Complete the database setup described in supabase/README.md — ${selectError.message}`,
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
        `Could not create AI usage row. Complete the database setup described in supabase/README.md — ${insertError?.message}`,
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

const TIER_COLUMN: Record<AiTierId, "premium_used" | "standard_used" | "basic_used"> =
  {
    premium: "premium_used",
    standard: "standard_used",
    basic: "basic_used",
  };

/**
 * Atomically increments a usage counter using compare-and-swap.
 *
 * The previous implementation read `used`, then wrote `used + 1`. Two
 * concurrent requests both read `used = 0`, both passed the limit check, and
 * both wrote `1` — silently granting double the quota.
 *
 * A single `UPDATE ... WHERE column = <observed value>` is atomic in Postgres:
 * the row is locked, the predicate re-checked, and the write committed as one
 * statement. If a competing transaction changed the value first, our predicate
 * no longer matches, zero rows are returned, and we retry. This gives real
 * mutual exclusion WITHOUT requiring a database migration or RPC.
 */
async function atomicIncrement(
  userId: string,
  column: "premium_used" | "standard_used" | "basic_used",
  attempts = MAX_CAS_ATTEMPTS,
): Promise<number | null> {
  const supabase = await createClient();

  for (let attempt = 0; attempt < attempts; attempt++) {
    const row = await getOrCreateUsageRow(userId);
    const current = row[column];

    const { data, error } = await supabase
      .from("ai_user_usage")
      .update({
        [column]: current + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq(column, current)
      .select(column)
      .maybeSingle();

    if (error) {
      throw new Error(`Could not record AI usage — ${error.message}`);
    }

    if (data) {
      return current + 1;
    }

    // Lost the race: another request consumed a credit between our read and
    // our write. Re-read and try again.
    await new Promise((r) => setTimeout(r, 25 * (attempt + 1) + Math.random() * 25));
  }

  return null;
}

/**
 * Reserves one credit for `userId` atomically, BEFORE any paid work happens.
 *
 * Reserving up-front (rather than charging afterwards) is what stops concurrent
 * requests from collectively exceeding the limit: every request must win a
 * slot before it is allowed to call the provider.
 */
export async function reserveTierCredit(
  userId: string,
): Promise<{ granted: true; tier: AiTier } | { granted: false; message: string }> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const row = await getOrCreateUsageRow(userId);
    const tier = resolveActiveTier(row);

    if (!tier) {
      const limits = getTierLimits();
      const total = limits.premium + limits.standard + (limits.basic ?? 0);
      return {
        granted: false,
        message: `You have used all ${total} of your monthly AI requests. They reset on the 1st. Offline rule-based guidance is still available.`,
      };
    }

    const updated = await atomicIncrement(userId, TIER_COLUMN[tier.id]);

    if (updated !== null) {
      return { granted: true, tier };
    }
  }

  return {
    granted: false,
    message:
      "Could not reserve an AI request right now. Please try again in a moment.",
  };
}

/**
 * Returns a previously reserved credit when the provider call failed, so users
 * are not charged for our errors.
 */
export async function refundTierCredit(userId: string, tierId: AiTierId): Promise<void> {
  const supabase = await createClient();
  const column = TIER_COLUMN[tierId];

  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const row = await getOrCreateUsageRow(userId);
    const current = row[column];

    if (current <= 0) return;

    const { data, error } = await supabase
      .from("ai_user_usage")
      .update({
        [column]: current - 1,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq(column, current)
      .select(column)
      .maybeSingle();

    if (error) {
      console.error("Failed to refund AI credit:", error.message);
      return;
    }

    if (data) return;

    await new Promise((r) => setTimeout(r, 25 * (attempt + 1)));
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
  // Reserve BEFORE calling the provider. Charging afterwards (the previous
  // behaviour) let concurrent requests all pass the limit check.
  const reservation = await reserveTierCredit(userId);

  if (!reservation.granted) {
    return { text: null, quotaExhausted: true, error: reservation.message };
  }

  let result = await generateTextWithTier(prompt, reservation.tier);
  let usedTier = reservation.tier;

  // Resilient model fallback: if primary model fails, try the fallback model if standard quota is available
  if (!result.text && usedTier.id === "premium") {
    const fallbackTier = AI_TIERS.find((t) => t.id === "standard");
    const latestRow = await getOrCreateUsageRow(userId);
    if (fallbackTier && remainingForTier(latestRow, fallbackTier.id) > 0) {
      const fallbackResult = await generateTextWithTier(prompt, fallbackTier);
      if (fallbackResult.text) {
        result = fallbackResult;
        // We reserved premium but actually consumed standard. Correct the
        // accounting rather than silently charging the wrong bucket.
        await refundTierCredit(userId, reservation.tier.id);
        usedTier = fallbackTier;
      }
    }
  }

  if (result.text) {
    return {
      ...result,
      tierUsed: usedTier.id,
      tierLabel: usedTier.label,
    };
  }

  // Provider failed: give the credit back.
  await refundTierCredit(userId, usedTier.id);
  return result;
}

export function formatUsageHint(summary: AiUsageSummary): string {
  if (summary.activeTier === "exhausted" || summary.totalRemaining === 0) {
    return "Monthly AI talks reached (10/10). Offline portfolio guidance is active.";
  }
  return `${summary.totalRemaining} of ${summary.totalLimit} AI talks left this month (${summary.activeTierLabel})`;
}
