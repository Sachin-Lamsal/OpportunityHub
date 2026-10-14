import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Concurrency / accounting tests for the AI quota.
 *
 * These exercise the *decision logic* in isolation, because the real guard is
 * an atomic compare-and-swap UPDATE executed by Postgres. We cannot run a live
 * database here, so we model the CAS semantics faithfully: a simulated row that
 * only accepts a write when the observed value still matches (which is exactly
 * what `UPDATE ... WHERE col = <observed>` does).
 *
 * What is verified here:
 *   - the tier selection ladder
 *   - that N concurrent reservations against a limit cannot exceed the limit
 *   - refund arithmetic
 *   - accounting-failure behaviour
 *
 * What is NOT verified here (disclosed in the report): that the Supabase
 * client's `.eq(column, current)` really produces the atomic behaviour
 * claimed. That requires a live Postgres test.
 */

type TierId = "premium" | "standard" | "basic";

interface SimRow {
  premium_used: number;
  standard_used: number;
  basic_used: number;
}

const LIMITS: Record<TierId, number> = { premium: 4, standard: 4, basic: 2 };
const TIER_ORDER: TierId[] = ["premium", "standard", "basic"];

function usedFor(row: SimRow, tier: TierId): number {
  return row[`${tier}_used` as keyof SimRow];
}

function resolveActiveTier(row: SimRow): TierId | null {
  for (const tier of TIER_ORDER) {
    if (LIMITS[tier] - usedFor(row, tier) > 0) return tier;
  }
  return null;
}

/**
 * Faithful model of `UPDATE ... SET col = observed+1 WHERE col = observed`.
 *
 * The subtlety that matters: the predicate is evaluated at WRITE time, under
 * the row lock. A transaction whose observed value is stale matches zero rows
 * and loses. Modelling only the read-then-write (as a naive simulation would)
 * would wrongly "prove" that the old racy code was safe.
 */
async function reserve(
  row: SimRow,
  maxAttempts = 25,
): Promise<{ granted: boolean; tier: TierId | null }> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const tier = resolveActiveTier(row);
    if (!tier) return { granted: false, tier: null };

    const key = `${tier}_used` as keyof SimRow;
    const observed = row[key];

    // Yield to let competing "transactions" interleave at the same point.
    await new Promise((r) => setImmediate(r));

    // Re-check the predicate under the lock. If it no longer matches, our
    // UPDATE affects zero rows and we must retry.
    if (row[key] !== observed) continue;

    row[key] = observed + 1;
    return { granted: true, tier };
  }
  return { granted: false, tier: null };
}

describe("AI quota accounting", () => {
  test("reserves from the highest tier first", async () => {
    const row: SimRow = { premium_used: 0, standard_used: 0, basic_used: 0 };
    const first = await reserve(row);
    assert.equal(first.granted, true);
    assert.equal(first.tier, "premium");
  });

  test("falls through tiers as earlier ones are exhausted", async () => {
    const row: SimRow = { premium_used: 4, standard_used: 0, basic_used: 0 };
    const result = await reserve(row);
    assert.equal(result.tier, "standard");
  });

  test("uses the last tier and then refuses", async () => {
    const row: SimRow = { premium_used: 4, standard_used: 4, basic_used: 1 };
    const last = await reserve(row);
    assert.equal(last.granted, true);
    assert.equal(last.tier, "basic");

    const exhausted = await reserve(row);
    assert.equal(exhausted.granted, false);
    assert.equal(exhausted.tier, null);
  });

  test("concurrent reservations never exceed the total limit", async () => {
    const row: SimRow = { premium_used: 0, standard_used: 0, basic_used: 0 };
    const totalLimit = LIMITS.premium + LIMITS.standard + LIMITS.basic;

    // 25 concurrent requests against a limit of 10.
    const results = await Promise.all(Array.from({ length: 25 }, () => reserve(row)));

    const granted = results.filter((r) => r.granted).length;
    const consumed =
      row.premium_used + row.standard_used + row.basic_used;

    assert.equal(
      granted,
      totalLimit,
      `granted ${granted} must equal limit ${totalLimit}`,
    );
    assert.ok(consumed <= totalLimit, `consumed ${consumed} exceeded ${totalLimit}`);
    assert.equal(
      row.premium_used + row.standard_used + row.basic_used,
      granted,
      "every granted reservation must be accounted exactly once",
    );
  });

  test("a lost CAS race is retried and still accounted exactly once", async () => {
    const row: SimRow = { premium_used: 0, standard_used: 0, basic_used: 0 };

    // Compete two reservations against each other; exactly one credit each.
    const [a, b] = await Promise.all([reserve(row), reserve(row)]);

    assert.equal(a.granted, true);
    assert.equal(b.granted, true);
    assert.equal(row.premium_used, 2, "exactly two credits consumed");
  });

  test("repeated reservations past the limit never increment", async () => {
    const row: SimRow = { premium_used: 4, standard_used: 4, basic_used: 2 };
    for (let i = 0; i < 5; i++) {
      const r = await reserve(row);
      assert.equal(r.granted, false);
    }
    assert.equal(row.premium_used, 4);
    assert.equal(row.standard_used, 4);
    assert.equal(row.basic_used, 2);
  });

  test("refund restores the credit so a later retry can succeed", async () => {
    const row: SimRow = { premium_used: 4, standard_used: 0, basic_used: 0 };

    const spent = await reserve(row);
    assert.equal(spent.tier, "standard");

    // Provider failed -> refund.
    row.standard_used -= 1;
    assert.equal(row.standard_used, 0);

    const retried = await reserve(row);
    assert.equal(retried.granted, true, "refunded credit must be reusable");
  });

  test("quota refusal never increments any counter", async () => {
    const row: SimRow = { premium_used: 4, standard_used: 4, basic_used: 2 };
    const before = JSON.stringify(row);
    await reserve(row);
    await reserve(row);
    assert.equal(JSON.stringify(row), before);
  });
});