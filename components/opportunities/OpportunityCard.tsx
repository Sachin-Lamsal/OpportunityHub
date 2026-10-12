import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import { formatDate, formatDeadline } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import SaveOpportunityButton from "@/components/opportunities/SaveOpportunityButton";

import VerificationBadge from "@/components/opportunities/VerificationBadge";

interface OpportunityCardProps {
  opportunity: Opportunity;
  isSaved?: boolean;
  compact?: boolean;
}

export default function OpportunityCard({
  opportunity,
  isSaved = false,
  compact = false,
}: OpportunityCardProps) {
  return (
    <Card className="flex h-full flex-col hover:border-indigo-200 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge
              isVerified={opportunity.is_verified}
              status={opportunity.verification_status}
            />
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
              {opportunity.type}
            </span>
            {opportunity.subject_area && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {opportunity.subject_area}
              </span>
            )}
            {opportunity.is_online ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Online
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                In person
              </span>
            )}
          </div>

          <Link
            href={`/opportunities/${opportunity.id}`}
            className="mt-2 block text-lg font-semibold text-slate-900 hover:text-indigo-700"
          >
            {opportunity.title}
          </Link>

          {opportunity.organizer && (
            <p className="mt-1 text-sm text-slate-500">{opportunity.organizer}</p>
          )}
        </div>

        <SaveOpportunityButton
          key={`${opportunity.id}-${isSaved}`}
          opportunityId={opportunity.id}
          initialSaved={isSaved}
          size="sm"
        />
      </div>

      {!compact && (
        <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 line-clamp-3">
          {opportunity.description}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm">
        <span className="text-slate-500">
          Deadline:{" "}
          <span className="font-medium text-slate-700">
            {formatDeadline(opportunity.deadline)}
          </span>
          {opportunity.start_date && (
            <span className="ml-2 text-slate-400">
              · Starts {formatDate(opportunity.start_date)}
            </span>
          )}
        </span>
        <Link
          href={`/opportunities/${opportunity.id}`}
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          View details →
        </Link>
      </div>
    </Card>
  );
}
