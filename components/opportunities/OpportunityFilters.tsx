"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition, type FormEvent } from "react";
import {
  DEADLINE_FILTERS,
  FORMAT_FILTERS,
  OPPORTUNITY_TYPES,
  SUBJECT_AREAS,
} from "@/lib/constants";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  applyOpportunityFilters,
  hasActiveOpportunityFilters,
  readOpportunityFilters,
  type OpportunityFilterKey,
  type OpportunityFilterState,
} from "@/lib/opportunities/filters";

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
  const [syncedQuery, setSyncedQuery] = useState(queryString);
  const [hasUnappliedEdits, setHasUnappliedEdits] = useState(false);

  function changeFilter(key: OpportunityFilterKey, value: string) {
    setHasUnappliedEdits(true);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  // Adjust state during render (React's "derive state from props" pattern)
  // rather than in an effect, so no extra paint happens with stale controls.
  //
  // The resync is skipped while the user has unapplied edits: `router.push` runs
  // inside a transition, so a URL update can land hundreds of milliseconds after
  // the click and must not overwrite newer typing.
  if (queryString !== syncedQuery) {
    setSyncedQuery(queryString);

    if (!hasUnappliedEdits) {
      setFilters(readOpportunityFilters(queryString));
    }
  }

  const updateParams = useCallback(
    (updates: Partial<Record<OpportunityFilterKey, string>>) => {
      const next = applyOpportunityFilters(queryString, updates);

      setHasUnappliedEdits(false);

      startTransition(() => {
        router.push(next ? `/opportunities?${next}` : "/opportunities");
      });
    },
    [router, queryString],
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    updateParams(filters);
  }

  function clearFilters() {
    setHasUnappliedEdits(false);
    setFilters(readOpportunityFilters(""));
    startTransition(() => {
      router.push("/opportunities");
    });
  }

  const hasFilters = hasActiveOpportunityFilters(queryString);

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
