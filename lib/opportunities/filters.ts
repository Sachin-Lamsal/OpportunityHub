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
 * Sort is not a filter (it does not narrow the result set), so it is kept out
 * of `OPPORTUNITY_FILTER_KEYS` and handled separately. That way "Clear all"
 * resets narrowing only, while the chosen order is preserved.
 */
export const OPPORTUNITY_SORT_KEYS = ["newest", "deadline", "title"] as const;

export type OpportunitySort = (typeof OPPORTUNITY_SORT_KEYS)[number];

export const DEFAULT_OPPORTUNITY_SORT: OpportunitySort = "newest";

/** True when the value is one of the supported sort orders. */
export function isOpportunitySort(value: unknown): value is OpportunitySort {
  return (
    typeof value === "string" &&
    (OPPORTUNITY_SORT_KEYS as readonly string[]).includes(value)
  );
}

/**
 * Reads the sort order out of a query string, falling back to the default for
 * missing or unrecognised values (a hand-edited URL must not break the page).
 */
export function readOpportunitySort(current: string): OpportunitySort {
  const value = new URLSearchParams(current).get("sort");
  return isOpportunitySort(value) ? value : DEFAULT_OPPORTUNITY_SORT;
}

/**
 * Reads the sort order out of a `searchParams` object, like the server page
 * receives from Next.js. Missing or unrecognised values fall back to the
 * default.
 */
export function readOpportunitySortParams(
  params: Record<string, string | string[] | undefined>,
): OpportunitySort {
  const raw = params.sort;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return isOpportunitySort(value) ? value : DEFAULT_OPPORTUNITY_SORT;
}

/** Human-readable label for the active sort order, used in the results summary. */
export function opportunitySortLabel(sort: OpportunitySort): string {
  switch (sort) {
    case "deadline":
      return "soonest deadline first";
    case "title":
      return "title A–Z";
    default:
      return "newest first";
  }
}

/**
 * Returns the next query string after applying `updates` to `current`.
 * Empty/whitespace-only values delete their key.
 *
 * The `sort` key is handled here too so a single navigation helper can build
 * the whole URL, but it is not part of `OPPORTUNITY_FILTER_KEYS`: sorting does
 * not narrow results, so "Clear all" must not silently reset the chosen order.
 */
export function applyOpportunityFilters(
  current: string,
  updates: Partial<Record<OpportunityFilterKey | "sort", string>>,
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

  if ("sort" in updates) {
    const value = (updates.sort ?? "").trim();

    if (!value || value === DEFAULT_OPPORTUNITY_SORT) {
      // The default order is implicit — keep the URL short.
      params.delete("sort");
    } else if (isOpportunitySort(value)) {
      params.set("sort", value);
    } else {
      params.delete("sort");
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

/**
 * True when two query strings describe the same browse state.
 *
 * Compared by value rather than by raw string so a difference in parameter
 * order or percent-encoding does not make two identical states look
 * different.
 */
export function browseStatesEqual(
  a: string,
  b: string,
): boolean {
  return (
    filtersEqual(readOpportunityFilters(a), readOpportunityFilters(b)) &&
    readOpportunitySort(a) === readOpportunitySort(b)
  );
}
