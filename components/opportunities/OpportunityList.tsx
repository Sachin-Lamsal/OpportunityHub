import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import OpportunityCard from "@/components/opportunities/OpportunityCard";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface OpportunityListProps {
  opportunities: Opportunity[];
  savedIds: Set<string>;
  emptyMessage?: string;
  compact?: boolean;
  showViewAll?: boolean;
}

export default function OpportunityList({
  opportunities,
  savedIds,
  emptyMessage = "No opportunities found.",
  compact = false,
  showViewAll = false,
}: OpportunityListProps) {
  if (opportunities.length === 0) {
    return (
      <Card className="text-center py-10">
        <p className="text-slate-600">{emptyMessage}</p>
        {showViewAll && (
          <div className="mt-4">
            <Button href="/opportunities" variant="outline" size="sm">
              Browse all opportunities
            </Button>
          </div>
        )}
      </Card>
    );
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((opportunity) => (
          <OpportunityCard
            key={opportunity.id}
            opportunity={opportunity}
            isSaved={savedIds.has(opportunity.id)}
            compact={compact}
          />
        ))}
      </div>

      {showViewAll && opportunities.length > 0 && (
        <div className="mt-6 text-center">
          <Link
            href="/opportunities"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            View all opportunities →
          </Link>
        </div>
      )}
    </div>
  );
}
