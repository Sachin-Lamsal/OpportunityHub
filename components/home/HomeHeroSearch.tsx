"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";

export default function HomeHeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/opportunities?q=${encodeURIComponent(q)}` : "/opportunities");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center"
    >
      <label htmlFor="hero-search" className="sr-only">
        Search opportunities
      </label>
      <input
        id="hero-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search robotics, scholarships, MUN, olympiads…"
        className="w-full flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      />
      <Button type="submit" size="md" className="shrink-0 sm:px-6">
        Search
      </Button>
    </form>
  );
}
