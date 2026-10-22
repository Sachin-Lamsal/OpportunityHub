/**
 * Deadline helpers shared by the browse list, the detail page and the saved
 * list. Kept pure (no React, no database) so they can be unit tested.
 */

/** Today's date as `YYYY-MM-DD` in UTC, matching how deadlines are stored. */
export function todayDate(now: Date = new Date()): string {
  return now.toISOString().split("T")[0];
}

/**
 * True when the opportunity's deadline is in the past.
 *
 * An opportunity without a deadline is *not* expired — "no deadline given" is
 * different from "the deadline has passed", and the first one is still open.
 */
export function isDeadlinePast(
  deadline: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!deadline) return false;
  return deadline < todayDate(now);
}

/** Whole days until the deadline. Negative once the deadline has passed. */
export function daysUntilDeadline(
  deadline: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!deadline) return null;

  const target = new Date(`${deadline}T00:00:00Z`).getTime();
  const start = new Date(`${todayDate(now)}T00:00:00Z`).getTime();

  if (Number.isNaN(target) || Number.isNaN(start)) return null;

  return Math.round((target - start) / (1000 * 60 * 60 * 24));
}

/**
 * A deadline inside three days deserves a visible warning on cards and lists.
 */
export function isDeadlineUrgent(
  deadline: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const days = daysUntilDeadline(deadline, now);
  return days !== null && days >= 0 && days <= 3;
}

/**
 * Sorts opportunities by deadline, soonest first.
 *
 * Opportunities without a deadline keep a stable position at the end — they
 * are still open, they just cannot be compared by urgency.
 */
export function sortByDeadline<T extends { deadline?: string | null }>(
  opportunities: T[],
): T[] {
  return [...opportunities].sort((a, b) => {
    const aDeadline = a.deadline ?? null;
    const bDeadline = b.deadline ?? null;

    if (aDeadline === bDeadline) return 0;
    if (!aDeadline) return 1;
    if (!bDeadline) return -1;

    return aDeadline < bDeadline ? -1 : 1;
  });
}
