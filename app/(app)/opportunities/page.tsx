import { Suspense } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import OpportunityFilters from "@/components/opportunities/OpportunityFilters";
import OpportunityList from "@/components/opportunities/OpportunityList";
import {
  getOpportunities,
  getSavedOpportunityIds,
} from "@/lib/queries/opportunities";
import { getCuratedOpportunitySections } from "@/lib/queries/curated-opportunities";
import CuratedOpportunitySections from "@/components/opportunities/CuratedOpportunitySections";
import {
  hasActiveFilterParams,
  opportunitySortLabel,
  readOpportunitySortParams,
} from "@/lib/opportunities/filters";

export const metadata = {
  title: "Opportunities",
};

interface OpportunitiesPageProps {
  searchParams: Promise<{
    q?: string;
    subject?: string;
    type?: string;
    deadline?: string;
    format?: string;
    sort?: string;
  }>;
}

function FiltersSkeleton() {
  return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
}

async function OpportunityResults({
  searchParams,
}: {
  searchParams: OpportunitiesPageProps["searchParams"];
}) {
  const params = await searchParams;
  const hasFilters = hasActiveFilterParams(params);
  const sort = readOpportunitySortParams(params);

  // The active query string is carried into every card link so the detail page
  // can send the student back to the exact list they came from.
  const linkQuery = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => typeof value === "string" && value.trim())
      .map(([key, value]) => [key, value as string]),
  ).toString();

  const [opportunities, savedIds, curated] = await Promise.all([
    getOpportunities({
      q: params.q,
      subject: params.subject,
      type: params.type,
      deadline: params.deadline,
      format: params.format,
      sort,
    }),
    getSavedOpportunityIds(),
    hasFilters ? Promise.resolve(null) : getCuratedOpportunitySections(),
  ]);

  return (
    <>
      {!hasFilters && curated && (
        <div className="mb-10">
          <CuratedOpportunitySections
            deadlinesThisWeek={curated.deadlinesThisWeek}
            popular={curated.popular}
            featured={curated.featured}
            savedIds={savedIds}
          />
        </div>
      )}

      <h2 className="text-lg font-bold text-slate-900 mb-2">
        {hasFilters ? "Search results" : "All opportunities"}
      </h2>
      <p className="mb-4 text-sm text-slate-600">
        {opportunities.length} opportunit{opportunities.length === 1 ? "y" : "ies"} found
        {hasFilters ? " matching your filters" : ""}, {opportunitySortLabel(sort)}.
      </p>
      <OpportunityList
        opportunities={opportunities}
        savedIds={savedIds}
        linkQuery={linkQuery}
        emptyMessage={
          hasFilters
            ? "No opportunities match your filters. Try clearing some filters."
            : "No opportunities yet. Complete the database setup in supabase/README.md."
        }
      />
    </>
  );
}

export default function OpportunitiesPage({ searchParams }: OpportunitiesPageProps) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Opportunities" }]} />
      <PageHeader
        title="Opportunities"
        description="Discover competitions, workshops, internships, and more."
      />

      <div className="space-y-6">
        <Suspense fallback={<FiltersSkeleton />}>
          <OpportunityFilters />
        </Suspense>

        <Suspense fallback={<FiltersSkeleton />}>
          <OpportunityResults searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
