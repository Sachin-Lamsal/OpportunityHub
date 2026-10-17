import { createClient } from "@/lib/supabase/server";
import { AI_TIERS, getTierLimits, type AiTier, type AiTierId } from "@/lib/ai/tiers";
import { generateTextWithTier, type GenerateTextResult } from "@/lib/ai/gemini";
import {
  currentResetMonth,
  decideFallbackAccounting,
  quotaExhaustedMessage,
  remainingForTier,
  resolveActiveTier,
  TIER_COLUMN,
  usedForTier,
  type UsageRow,
} from "@/lib/ai/quota-core";

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

const MAX_CAS_ATTEMPTS = 5;

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
      return { granted: false, message: quotaExhaustedMessage() };
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

/**
 * Reserves one credit from a SPECIFIC tier, atomically.
 *
 * Needed by the model-fallback path: it may only fall back to `standard` when
 * that tier still has capacity, and it must charge that tier when the fallback
 * succeeds. The previous code merely *read* the remaining standard credits and
 * then refunded the premium reservation without ever incrementing standard —
 * every successful fallback call was free and unbounded.
 */
export async function reserveTierCreditForTier(
  userId: string,
  tierId: AiTierId,
): Promise<{ granted: true } | { granted: false; reason: "exhausted" | "busy" }> {
  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt++) {
    const row = await getOrCreateUsageRow(userId);

    if (remainingForTier(row, tierId) <= 0) {
      return { granted: false, reason: "exhausted" };
    }

    const updated = await atomicIncrement(userId, TIER_COLUMN[tierId]);

    if (updated !== null) {
      return { granted: true };
    }
  }

  return { granted: false, reason: "busy" };
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

  const reservedTier = reservation.tier;
  const primaryResult = await generateTextWithTier(prompt, reservedTier);

  let result = primaryResult;
  let fallbackReserved = false;
  let fallbackCallSucceeded = false;

  // Resilient model fallback: if the primary model fails, try the smaller
  // fallback model. The fallback tier is RESERVED before it is called and the
  // primary reservation is refunded immediately, so the user never holds two
  // credits for a single request (which could refuse a concurrent request that
  // should have been allowed).
  if (!primaryResult.text && reservedTier.id === "premium") {
    const fallbackTier = AI_TIERS.find((t) => t.id === "standard");

    if (fallbackTier) {
      const fallbackReservation = await reserveTierCreditForTier(
        userId,
        fallbackTier.id,
      );

      fallbackReserved = fallbackReservation.granted;

      if (fallbackReserved) {
        await refundTierCredit(userId, reservedTier.id);

        const fallbackResult = await generateTextWithTier(prompt, fallbackTier);
        fallbackCallSucceeded = Boolean(fallbackResult.text);

        if (fallbackResult.text) {
          result = fallbackResult;
        } else {
          await refundTierCredit(userId, fallbackTier.id);
        }
      }
    }
  }

  const accounting = decideFallbackAccounting({
    reservedTier: reservedTier.id,
    reservedCallSucceeded: Boolean(primaryResult.text),
    fallbackReserved,
    fallbackCallSucceeded,
  });

  // Refund the reserved tier when nothing was charged for it. The branches
  // above already settled the fallback paths, so this only covers the plain
  // "primary failed and we did not fall back" case.
  if (!accounting.chargedTier && !fallbackReserved) {
    await refundTierCredit(userId, reservedTier.id);
  }

  if (result.text && accounting.chargedTier) {
    const charged = AI_TIERS.find((t) => t.id === accounting.chargedTier);

    return {
      ...result,
      tierUsed: accounting.chargedTier,
      tierLabel: charged?.label,
    };
  }

  return { text: result.text, error: result.error, quotaExhausted: false };
}

export function formatUsageHint(summary: AiUsageSummary): string {
  if (summary.activeTier === "exhausted" || summary.totalRemaining === 0) {
    // Use the configured limit, never a hardcoded number: the budget comes from
    // STUDENT_AI_TALKS_LIMIT / AI_TIER_* and is not always 10.
    return `Monthly AI talks reached (${summary.totalUsed}/${summary.totalLimit}). Offline portfolio guidance is active.`;
  }
  return `${summary.totalRemaining} of ${summary.totalLimit} AI talks left this month (${summary.activeTierLabel})`;
}
