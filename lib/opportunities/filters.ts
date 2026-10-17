/**
 * Query-string helpers for the opportunities browse page.
 *
 * Kept pure (no React, no Next) so the filter behaviour can be unit tested and
 * so the server page and the filter form agree on what "a filter is active"
 * means. An empty or whitespace-only value is not a filter: the database query
 * sanitises it away (`sanitizePostgrestSearchTerm`), so counting it as active
 * would show "0 opportunities matching your filters" for a link like
 * `/opportunities?q=%20` with no visible way to clear it.
 */

export const OPPORTUNITY_FILTER_KEYS = [
  "q",
  "subject",
  "type",
  "deadline",
  "format",
] as const;

export type OpportunityFilterKey = (typeof OPPORTUNITY_FILTER_KEYS)[number];

/**
 * Returns the next query string after applying `updates` to `current`.
 * Empty/whitespace-only values delete their key.
 */
export function applyOpportunityFilters(
  current: string,
  updates: Partial<Record<OpportunityFilterKey, string>>,
): string {
  const params = new URLSearchParams(current);

  for (const key of OPPORTUNITY_FILTER_KEYS) {
    if (!(key in updates)) continue;

    const value = updates[key] ?? "";
    if (value.trim()) {
      params.set(key, value.trim());
    } else {
      params.delete(key);
    }
  }

  return params.toString();
}

/** True when at least one browse filter is active in the given query string. */
export function hasActiveOpportunityFilters(current: string): boolean {
  const params = new URLSearchParams(current);
  return OPPORTUNITY_FILTER_KEYS.some((key) => {
    const value = params.get(key);
    return Boolean(value && value.trim());
  });
}

/**
 * True when at least one browse filter is active in a `searchParams` object.
 * Used by the server page so it renders the same state the filter form shows.
 */
export function hasActiveFilterParams(
  params: Record<string, string | string[] | undefined>,
): boolean {
  return OPPORTUNITY_FILTER_KEYS.some((key) => {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return Boolean(value && value.trim());
  });
}
export type OpportunityFilterState = Record<OpportunityFilterKey, string>;

/** Reads the five browse filters out of a query string (missing = ""). */
export function readOpportunityFilters(current: string): OpportunityFilterState {
  const params = new URLSearchParams(current);
  const state = {} as OpportunityFilterState;

  for (const key of OPPORTUNITY_FILTER_KEYS) {
    state[key] = params.get(key) ?? "";
  }

  return state;
}

/** Shallow equality over the five filter values. */
export function filtersEqual(
  a: OpportunityFilterState,
  b: OpportunityFilterState,
): boolean {
  return OPPORTUNITY_FILTER_KEYS.every((key) => a[key] === b[key]);
}
