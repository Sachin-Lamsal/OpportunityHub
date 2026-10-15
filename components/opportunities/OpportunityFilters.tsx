"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition, type FormEvent } from "react";
import {
  DEADLINE_FILTERS,
  FORMAT_FILTERS,
  OPPORTUNITY_TYPES,
  SUBJECT_AREAS,
} from "@/lib/constants";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function OpportunityFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const subject = searchParams.get("subject") ?? "";
  const type = searchParams.get("type") ?? "";
  const deadline = searchParams.get("deadline") ?? "";
  const format = searchParams.get("format") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      startTransition(() => {
        router.push(`/opportunities?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    updateParams({
      q: (formData.get("q") as string) ?? "",
      subject: (formData.get("subject") as string) ?? "",
      type: (formData.get("type") as string) ?? "",
      deadline: (formData.get("deadline") as string) ?? "",
      format: (formData.get("format") as string) ?? "",
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.push("/opportunities");
    });
  }

  const hasFilters = q || subject || type || deadline || format;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
    >
      <Input
        label="Search"
        name="q"
        type="search"
        defaultValue={q}
        placeholder="Search title, description, organizer…"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label="Subject"
          name="subject"
          value={subject}
          options={SUBJECT_AREAS.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          label="Type"
          name="type"
          value={type}
          options={OPPORTUNITY_TYPES.map((t) => ({ value: t, label: t }))}
        />
        <FilterSelect
          label="Deadline"
          name="deadline"
          value={deadline}
          options={DEADLINE_FILTERS.filter((d) => d.value !== "").map((d) => ({
            value: d.value,
            label: d.label,
          }))}
        />
        <FilterSelect
          label="Format"
          name="format"
          value={format}
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
  options,
}: {
  label: string;
  name: string;
  value: string;
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
        defaultValue={value}
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
