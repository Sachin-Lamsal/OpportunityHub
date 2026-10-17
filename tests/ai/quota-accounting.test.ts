import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  resolveActiveTier,
  remainingForTier,
  currentResetMonth,
  decideFallbackAccounting,
  quotaExhaustedMessage,
  totalTalksLimit,
  TIER_COLUMN,
  type UsageRow,
} from "@/lib/ai/quota-core";
import { AI_TIERS, getTierLimits, type AiTierId } from "@/lib/ai/tiers";

/**
 * Concurrency / accounting tests for the AI quota.
 *
 * The tier-selection rules are executed against the REAL production functions
 * imported from `@/lib/ai/quota-core` (the module `lib/ai/usage.ts` uses), so a
 * change to the ladder or the limits cannot silently pass this suite.
 *
 * The atomic compare-and-swap itself cannot run without Postgres, so
 * `UPDATE ... WHERE col = <observed>` is modelled faithfully: a write only lands
 * when the value observed by the "transaction" still matches. This is disclosed
 * in the final report — verifying the real CAS requires a live database.
 */

type SimRow = UsageRow;

function makeRow(overrides: Partial<SimRow> = {}): SimRow {
  return {
    user_id: "u1",
    premium_used: 0,
    standard_used: 0,
    basic_used: 0,
    reset_month: currentResetMonth(),
    ...overrides,
  };
}

/** Faithful model of `UPDATE ... SET col = observed+1 WHERE col = observed`. */
async function increment(row: SimRow, tier: AiTierId, maxAttempts = 25): Promise<boolean> {
  const key = TIER_COLUMN[tier];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (remainingForTier(row, tier) <= 0) return false;

    const observed = row[key];

    // Yield so competing "transactions" interleave at the same point.
    await new Promise((r) => setImmediate(r));

    // The predicate is re-checked under the row lock. If it no longer matches,
    // the UPDATE affects zero rows and we must retry.
    if (row[key] !== observed) continue;

    row[key] = observed + 1;
    return true;
  }

  return false;
}

/** Mirrors `reserveTierCredit`: pick the best tier, then CAS-increment it. */
async function reserveAnyTier(row: SimRow): Promise<{ granted: boolean; tier: AiTierId | null }> {
  for (let attempt = 0; attempt < 25; attempt++) {
    const tier = resolveActiveTier(row);
    if (!tier) return { granted: false, tier: null };

    if (await increment(row, tier.id)) {
      return { granted: true, tier: tier.id };
    }
  }
  return { granted: false, tier: null };
}

/** Mirrors `refundTierCredit`. */
async function refund(row: SimRow, tier: AiTierId): Promise<void> {
  const key = TIER_COLUMN[tier];
  if (row[key] <= 0) return;
  row[key] -= 1;
}

/**
 * Mirrors the control flow of `generateWithUserQuota`: reserve the best tier,
 * call the provider, optionally reserve and call the standard tier, then apply
 * the accounting decision. The decision itself comes from the PRODUCTION
 * function `decideFallbackAccounting`, so a regression in the refund/charge
 * rule fails this suite.
 */
async function meteredCall(
  row: SimRow,
  outcome: Record<AiTierId, "ok" | "fail">,
): Promise<{ charged: AiTierId | null }> {
  const reservation = await reserveAnyTier(row);
  if (!reservation.granted || !reservation.tier) return { charged: null };

  const reservedTier = reservation.tier;
  const reservedCallSucceeded = outcome[reservedTier] === "ok";

  let fallbackReserved = false;
  let fallbackCallSucceeded = false;

  if (!reservedCallSucceeded && reservedTier === "premium") {
    fallbackReserved = await increment(row, "standard");

    if (fallbackReserved) {
      await refund(row, "premium");
      fallbackCallSucceeded = outcome.standard === "ok";

      if (!fallbackCallSucceeded) {
        await refund(row, "standard");
      }
    }
  }

  const accounting = decideFallbackAccounting({
    reservedTier,
    reservedCallSucceeded,
    fallbackReserved,
    fallbackCallSucceeded,
  });

  if (!accounting.chargedTier && !fallbackReserved) {
    await refund(row, reservedTier);
  }

  return { charged: accounting.chargedTier };
}

describe("AI quota: tier selection (real production functions)", () => {
  test("reserves from the highest tier first", () => {
    const tier = resolveActiveTier(makeRow());
    assert.equal(tier?.id, "premium");
  });

  test("falls through to standard once premium is exhausted", () => {
    const limits = getTierLimits();
    const row = makeRow({ premium_used: limits.premium });
    assert.equal(resolveActiveTier(row)?.id, "standard");
  });

  test("returns null when every tier is exhausted", () => {
    const limits = getTierLimits();
    const row = makeRow({
      premium_used: limits.premium,
      standard_used: limits.standard,
      basic_used: limits.basic,
    });
    assert.equal(resolveActiveTier(row), null);
  });

  test("limits come from configuration, not a hardcoded 10", () => {
    const limits = getTierLimits();
    const total = totalTalksLimit();
    assert.equal(total, limits.premium + limits.standard + limits.basic);
    assert.ok(total > 0);
    // The refusal message must state the configured budget.
    assert.ok(quotaExhaustedMessage().includes(String(total)));
  });

  test("the reset month is UTC and zero-padded", () => {
    assert.equal(currentResetMonth(new Date("2026-01-05T23:59:59Z")), "2026-01");
    assert.equal(currentResetMonth(new Date("2026-12-31T00:00:00Z")), "2026-12");
  });
});

describe("AI quota: reservation accounting", () => {
  test("a granted reservation consumes exactly one credit", async () => {
    const row = makeRow();
    const result = await reserveAnyTier(row);
    assert.equal(result.granted, true);
    assert.equal(row.premium_used + row.standard_used + row.basic_used, 1);
  });

  test("concurrent reservations never exceed the total limit", async () => {
    const row = makeRow();
    const limits = getTierLimits();
    const totalLimit = limits.premium + limits.standard + limits.basic;

    const results = await Promise.all(
      Array.from({ length: totalLimit * 3 }, () => reserveAnyTier(row)),
    );

    const granted = results.filter((r) => r.granted).length;
    const consumed = row.premium_used + row.standard_used + row.basic_used;

    assert.equal(granted, totalLimit, `granted ${granted} must equal limit ${totalLimit}`);
    assert.equal(consumed, granted, "every granted reservation is accounted once");
  });

  test("a refund makes the credit reusable", async () => {
    const row = makeRow();
    const spent = await reserveAnyTier(row);
    assert.equal(spent.tier, "premium");
    await refund(row, "premium");
    assert.equal(row.premium_used, 0);
    const again = await reserveAnyTier(row);
    assert.equal(again.granted, true);
  });

  test("refunds never drive a counter negative", async () => {
    const row = makeRow();
    await refund(row, "premium");
    await refund(row, "standard");
    assert.ok(row.premium_used >= 0 && row.standard_used >= 0);
  });

  test("repeated reservations past the limit never increment", async () => {
    const limits = getTierLimits();
    const row = makeRow({
      premium_used: limits.premium,
      standard_used: limits.standard,
      basic_used: limits.basic,
    });
    const before = JSON.stringify(row);

    for (let i = 0; i < 5; i++) {
      const result = await reserveAnyTier(row);
      assert.equal(result.granted, false);
      assert.equal(result.tier, null);
    }

    assert.equal(JSON.stringify(row), before);
  });

  test("a lost CAS race is retried and still accounted exactly once", async () => {
    const row = makeRow();
    const [a, b] = await Promise.all([reserveAnyTier(row), reserveAnyTier(row)]);
    assert.equal(a.granted, true);
    assert.equal(b.granted, true);
    assert.equal(row.premium_used + row.standard_used + row.basic_used, 2);
  });
});

describe("AI quota: provider fallback charging (regression)", () => {
  test("a successful primary call charges the primary tier exactly once", async () => {
    const row = makeRow();
    const result = await meteredCall(row, { premium: "ok", standard: "ok", basic: "ok" });
    assert.equal(result.charged, "premium");
    assert.equal(row.premium_used, 1);
    assert.equal(row.standard_used, 0);
  });

  test("a successful fallback charges the standard tier (regression OH-102)", async () => {
    // Previously the standard credits were only *read* and the premium
    // reservation was refunded, so this successful call cost nothing at all.
    const row = makeRow();
    const before = row.premium_used + row.standard_used + row.basic_used;

    const result = await meteredCall(row, { premium: "fail", standard: "ok", basic: "ok" });

    const after = row.premium_used + row.standard_used + row.basic_used;
    assert.equal(result.charged, "standard");
    assert.equal(row.standard_used, 1, "the fallback tier must be charged");
    assert.equal(after - before, 1, "exactly one credit per successful response");
  });

  test("repeated successful fallbacks cannot exceed the standard limit", async () => {
    const row = makeRow();
    const limits = getTierLimits();

    for (let i = 0; i < limits.standard + limits.premium + 5; i++) {
      await meteredCall(row, { premium: "fail", standard: "ok", basic: "ok" });
    }

    assert.ok(
      row.standard_used <= limits.standard,
      `standard_used ${row.standard_used} exceeded limit ${limits.standard}`,
    );
  });

  test("when both models fail nothing is charged", async () => {
    const row = makeRow();
    const result = await meteredCall(row, { premium: "fail", standard: "fail", basic: "ok" });
    assert.equal(result.charged, null);
    assert.equal(row.premium_used + row.standard_used + row.basic_used, 0);
  });

  test("a failed fallback does not refund the same tier twice", async () => {
    const row = makeRow();
    await meteredCall(row, { premium: "fail", standard: "fail", basic: "ok" });
    // premium was reserved then refunded exactly once; a double refund would
    // leave a free credit available for the next call.
    const next = await meteredCall(row, { premium: "ok", standard: "ok", basic: "ok" });
    assert.equal(next.charged, "premium");
    assert.equal(row.premium_used, 1);
  });

  test("an exhausted standard tier does not fall back at all", async () => {
    const limits = getTierLimits();
    const row = makeRow({ standard_used: limits.standard });
    const result = await meteredCall(row, { premium: "fail", standard: "ok", basic: "ok" });
    assert.equal(result.charged, null);
    assert.equal(row.premium_used, 0);
  });

  test("tier ids map to the database columns used by the RPC", () => {
    assert.deepEqual(TIER_COLUMN, {
      premium: "premium_used",
      standard: "standard_used",
      basic: "basic_used",
    });
    assert.deepEqual(
      AI_TIERS.map((t) => t.id),
      ["premium", "standard"],
    );
  });
});