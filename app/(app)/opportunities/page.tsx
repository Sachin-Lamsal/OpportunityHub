import { Suspense } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import OpportunityFilters from "@/components/opportunities/OpportunityFilters";
import OpportunityList from "@/components/opportunities/OpportunityList";
import {
  getOpportunities,
  getSavedOpportunityIds,
} from "@/lib/queries/opportunities";
import { getCuratedOpportunitySections } from "@/lib/queries/curated-opportunities";
import CuratedOpportunitySections from "@/components/opportunities/CuratedOpportunitySections";
import { hasActiveFilterParams } from "@/lib/opportunities/filters";

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

  const [opportunities, savedIds, curated] = await Promise.all([
    getOpportunities({
      q: params.q,
      subject: params.subject,
      type: params.type,
      deadline: params.deadline,
      format: params.format,
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
        {hasFilters ? " matching your filters" : ""}, newest first.
      </p>
      <OpportunityList
        opportunities={opportunities}
        savedIds={savedIds}
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
      <PageHeader
        title="Opportunities"
        description="Discover competitions, workshops, internships, and more."
        action={
          <div className="flex items-center gap-2">
            <Button href="/my-opportunities" variant="outline" size="sm">
              My Submissions
            </Button>
            <Button href="/opportunities/new" size="sm">
              + Add opportunity
            </Button>
          </div>
        }
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
