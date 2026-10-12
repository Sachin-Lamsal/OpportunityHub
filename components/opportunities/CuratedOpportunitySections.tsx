import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/opportunities/OpportunityCard";

interface CuratedOpportunitySectionsProps {
  deadlinesThisWeek: Opportunity[];
  popular: Opportunity[];
  featured: Opportunity[];
  savedIds?: Set<string>;
}

function CuratedRow({
  emoji,
  title,
  subtitle,
  opportunities,
  savedIds,
  viewAllHref,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  opportunities: Opportunity[];
  savedIds?: Set<string>;
  viewAllHref?: string;
}) {
  if (opportunities.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            <span className="mr-1.5" aria-hidden="true">
              {emoji}
            </span>
            {title}
          </h2>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            View all →
          </Link>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {opportunities.map((opp) => (
          <OpportunityCard
            key={opp.id}
            opportunity={opp}
            isSaved={savedIds?.has(opp.id)}
            compact
          />
        ))}
      </div>
    </section>
  );
}

export default function CuratedOpportunitySections({
  deadlinesThisWeek,
  popular,
  featured,
  savedIds,
}: CuratedOpportunitySectionsProps) {
  const hasAny =
    deadlinesThisWeek.length > 0 ||
    popular.length > 0 ||
    featured.length > 0;

  if (!hasAny) return null;

  return (
    <div className="space-y-10">
      <CuratedRow
        emoji="⚡"
        title="Deadlines This Week"
        subtitle="Apply soon — these opportunities close within the next seven days."
        opportunities={deadlinesThisWeek}
        savedIds={savedIds}
        viewAllHref="/opportunities?deadline=week"
      />
      <CuratedRow
        emoji="🔥"
        title="Popular"
        subtitle="Most saved by students on OpportunityHub right now."
        opportunities={popular}
        savedIds={savedIds}
      />
      <CuratedRow
        emoji="🌟"
        title="Featured / Editor's Picks"
        subtitle="Verified listings with rich details — hand-curated and AI-enriched highlights."
        opportunities={featured}
        savedIds={savedIds}
        viewAllHref="/opportunities?status=verified"
      />
    </div>
  );
}
