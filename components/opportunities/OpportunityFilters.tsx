"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  DEADLINE_FILTERS,
  FORMAT_FILTERS,
  OPPORTUNITY_SORT_OPTIONS,
  OPPORTUNITY_TYPES,
  SUBJECT_AREAS,
} from "@/lib/constants";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  applyOpportunityFilters,
  browseStatesEqual,
  hasActiveOpportunityFilters,
  readOpportunityFilters,
  readOpportunitySort,
  type OpportunityFilterKey,
  type OpportunityFilterState,
  type OpportunitySort,
} from "@/lib/opportunities/filters";

const FILTER_LABELS: Record<OpportunityFilterKey, string> = {
  q: "Search",
  subject: "Subject",
  type: "Type",
  deadline: "Deadline",
  format: "Format",
};

/** Maps a filter value to the label shown on its chip. */
function chipLabel(key: OpportunityFilterKey, value: string): string {
  if (key === "subject") {
    return SUBJECT_AREAS.find((s) => s === value) ?? value;
  }
  if (key === "type") {
    return OPPORTUNITY_TYPES.find((t) => t === value) ?? value;
  }
  if (key === "deadline") {
    return DEADLINE_FILTERS.find((d) => d.value === value)?.label ?? value;
  }
  if (key === "format") {
    return FORMAT_FILTERS.find((f) => f.value === value)?.label ?? value;
  }
  return value;
}

/** How long to wait after the last keystroke before searching. */
const SEARCH_DEBOUNCE_MS = 450;

export default function OpportunityFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const queryString = searchParams.toString();

  // The visible controls are the source of truth while the user is typing, and
  // are re-synced from the URL whenever the URL changes for another reason
  // ("Clear all", browser Back/Forward, a curated link). Previously the inputs
  // were uncontrolled with a `defaultValue` that React only ever reads at mount,
  // so the form kept showing filters that were no longer applied.
  const [filters, setFilters] = useState<OpportunityFilterState>(() =>
    readOpportunityFilters(queryString),
  );
  const [sort, setSort] = useState<OpportunitySort>(() =>
    readOpportunitySort(queryString),
  );
  const [syncedQuery, setSyncedQuery] = useState(queryString);

  // The browse state this component last pushed to the URL. A URL update that
  // matches it is the echo of our own navigation and must not overwrite what
  // the user has typed since; any other URL change (Back/Forward, a curated
  // link) wins over the form.
  const [pushedQuery, setPushedQuery] = useState<string | null>(null);

  // The search text that is currently reflected in the URL. Used to decide
  // whether the debounced auto-search still has work to do.
  const appliedSearch = readOpportunityFilters(queryString).q;

  // Handle of the pending debounced search, so an explicit submit or a reset
  // can cancel it instead of firing a second, redundant request.
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function changeFilter(key: OpportunityFilterKey, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function cancelPendingSearch() {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }

  // Adjust state during render (React's "derive state from props" pattern)
  // rather than in an effect, so no extra paint happens with stale controls.
  if (queryString !== syncedQuery) {
    setSyncedQuery(queryString);

    const isOwnNavigation =
      pushedQuery !== null && browseStatesEqual(queryString, pushedQuery);

    if (isOwnNavigation) {
      // The echo of our own navigation has landed. Remembering it as "ours"
      // for longer would make a later Back/Forward navigation look like our
      // own push and leave the form out of sync with the URL.
      setPushedQuery(null);
    } else {
      setFilters(readOpportunityFilters(queryString));
      setSort(readOpportunitySort(queryString));
    }
  }

  /**
   * Pushes the current state of the controls to the URL.
   *
   * The visible controls are always the source of truth, so the whole state is
   * written on every navigation. That way a pending dropdown choice is never
   * dropped because a search push landed in between.
   */
  const updateParams = useCallback(
    (overrides: Partial<Record<OpportunityFilterKey | "sort", string>> = {}) => {
      const next = applyOpportunityFilters(queryString, {
        ...filters,
        ...overrides,
        sort: overrides.sort ?? sort,
      });

      setPushedQuery(next);

      startTransition(() => {
        router.push(next ? `/opportunities?${next}` : "/opportunities");
      });
    },
    [router, queryString, filters, sort],
  );

  // Auto-apply the search box once the user stops typing. Typing a query fires
  // a request per keystroke otherwise, and most of those requests are thrown
  // away by the next keystroke. The dropdowns keep the explicit
  // "Apply filters" button so that changing several of them at once still
  // costs a single request.
  useEffect(() => {
    if (filters.q === appliedSearch) return;

    const timer = setTimeout(() => {
      debounceTimer.current = null;
      updateParams();
    }, SEARCH_DEBOUNCE_MS);

    debounceTimer.current = timer;

    return () => {
      clearTimeout(timer);
      if (debounceTimer.current === timer) debounceTimer.current = null;
    };
  }, [filters, sort, appliedSearch, updateParams]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    cancelPendingSearch();
    updateParams();
  }

  function clearFilters() {
    cancelPendingSearch();

    const cleared = readOpportunityFilters("");
    setFilters(cleared);

    // Clearing the filters must not silently reset the chosen order, so the
    // sort is carried over to the cleaned-up URL.
    const next = applyOpportunityFilters(queryString, {
      ...cleared,
      sort,
    });

    setPushedQuery(next);

    startTransition(() => {
      router.push(next ? `/opportunities?${next}` : "/opportunities");
    });
  }

  function removeFilter(key: OpportunityFilterKey) {
    cancelPendingSearch();

    const next = { ...filters, [key]: "" };
    setFilters(next);

    updateParams({ [key]: "" });
  }

  function handleSortChange(value: string) {
    setSort(value as OpportunitySort);
    updateParams({ sort: value });
  }

  const hasFilters = hasActiveOpportunityFilters(queryString);
  const activeChips = (Object.keys(FILTER_LABELS) as OpportunityFilterKey[])
    .map((key) => ({ key, value: filters[key] }))
    .filter(({ value }) => value.trim().length > 0);

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
    >
      <Input
        label="Search"
        name="q"
        type="search"
        value={filters.q}
        onChange={(e) => changeFilter("q", e.target.value)}
        placeholder="Search title, description, organizer…"
        hint="Results update automatically as you type."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label="Subject"
          name="subject"
          value={filters.subject}
          onChange={(value) => changeFilter("subject", value)}
          options={SUBJECT_AREAS.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          label="Type"
          name="type"
          value={filters.type}
          onChange={(value) => changeFilter("type", value)}
          options={OPPORTUNITY_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <FilterSelect
          label="Deadline"
          name="deadline"
          value={filters.deadline}
          onChange={(value) => changeFilter("deadline", value)}
          options={DEADLINE_FILTERS.filter((d) => d.value !== "").map((d) => ({
            value: d.value,
            label: d.label,
          }))}
        />
        <FilterSelect
          label="Format"
          name="format"
          value={filters.format}
          onChange={(value) => changeFilter("format", value)}
          options={FORMAT_FILTERS.filter((f) => f.value !== "").map((f) => ({
            value: f.value,
            label: f.label,
          }))}
        />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full sm:w-56">
          <label
            htmlFor="sort"
            className="block text-sm font-medium text-slate-700"
          >
            Sort by
          </label>
          <select
            id="sort"
            name="sort"
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {OPPORTUNITY_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Filtering…" : "Apply filters"}
          </Button>
          {hasFilters && (
            <Button type="button" variant="outline" onClick={clearFilters}>
              Clear all
            </Button>
          )}
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Active filters
          </span>
          {activeChips.map(({ key, value }) => (
            <button
              key={key}
              type="button"
              onClick={() => removeFilter(key)}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
              aria-label={`Remove ${FILTER_LABELS[key]} filter ${value}`}
            >
              {FILTER_LABELS[key]}: {chipLabel(key, value)}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

function FilterSelect({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: OpportunityFilterKey;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
