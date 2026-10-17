import {
  AI_TIERS,
  getTierLimits,
  getTotalTalksLimit,
  type AiTier,
  type AiTierId,
} from "@/lib/ai/tiers";

/**
 * Pure AI-quota accounting rules.
 *
 * These live apart from `lib/ai/usage.ts` because that module imports
 * `@/lib/supabase/server` (and therefore `next/headers`), which cannot be
 * loaded by the plain Node test runner. Keeping the decisions here means the
 * production code and the tests execute the *same* functions instead of a
 * re-implementation of them.
 */

export interface UsageRow {
  user_id: string;
  premium_used: number;
  standard_used: number;
  basic_used: number;
  reset_month: string;
}

export const TIER_COLUMN: Record<AiTierId, "premium_used" | "standard_used" | "basic_used"> = {
  premium: "premium_used",
  standard: "standard_used",
  basic: "basic_used",
};

export function currentResetMonth(now: Date = new Date()): string {
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}`;
}

export function usedForTier(row: UsageRow, tierId: AiTierId): number {
  switch (tierId) {
    case "premium":
      return row.premium_used;
    case "standard":
      return row.standard_used;
    case "basic":
      return row.basic_used;
  }
}

export function remainingForTier(row: UsageRow, tierId: AiTierId): number {
  const limits = getTierLimits();
  return Math.max(0, limits[tierId] - usedForTier(row, tierId));
}

/** The best tier the user still has capacity for, or null when exhausted. */
export function resolveActiveTier(row: UsageRow): AiTier | null {
  for (const tier of AI_TIERS) {
    if (remainingForTier(row, tier.id) > 0) {
      return tier;
    }
  }
  return null;
}

/** Re-exported from `tiers.ts` so there is a single implementation. */
export { getTotalTalksLimit as totalTalksLimit };

/** Human-facing refusal text used by every quota-exhausted path. */
export function quotaExhaustedMessage(total = getTotalTalksLimit()): string {
  return `You have used all ${total} of your monthly AI requests. They reset on the 1st. Offline rule-based guidance is still available.`;
}
/**
 * The accounting decision made after a provider call, expressed as data so both
 * `generateWithUserQuota` and the tests execute the same rule.
 */
export interface FallbackAccountingInput {
  /** Tier whose credit is currently reserved. */
  reservedTier: AiTierId;
  /** Whether the reserved tier's call produced usable text. */
  reservedCallSucceeded: boolean;
  /** Whether a credit could be reserved for the fallback tier. */
  fallbackReserved: boolean;
  /** Whether the fallback tier's call produced usable text. */
  fallbackCallSucceeded: boolean;
}

export interface FallbackAccounting {
  /** Tier the user is finally charged for, or null when nothing is charged. */
  chargedTier: AiTierId | null;
  /** Tiers to refund, in order. Each tier appears at most once. */
  refunds: AiTierId[];
}

/**
 * Decides what a metered call costs when the primary model fails.
 *
 * Invariants this encodes (each one was a bug once):
 *  - A successful call costs exactly one credit.
 *  - A call that fell back to another tier refunds the original reservation and
 *    charges the fallback tier — the previous code read the fallback tier's
 *    remaining credits without ever incrementing them, so every successful
 *    fallback was free and unbounded.
 *  - No tier is ever refunded twice.
 */
export function decideFallbackAccounting(
  input: FallbackAccountingInput,
): FallbackAccounting {
  const {
    reservedTier,
    reservedCallSucceeded,
    fallbackReserved,
    fallbackCallSucceeded,
  } = input;

  if (reservedCallSucceeded) {
    return { chargedTier: reservedTier, refunds: [] };
  }

  if (!fallbackReserved) {
    return { chargedTier: null, refunds: [reservedTier] };
  }

  if (fallbackCallSucceeded) {
    return { chargedTier: "standard", refunds: [reservedTier] };
  }

  return { chargedTier: null, refunds: [reservedTier, "standard"] };
}
