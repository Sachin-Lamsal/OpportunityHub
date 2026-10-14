"use client";

import { useTransition } from "react";
import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import { formatDeadline } from "@/lib/utils/format";
import { deleteOpportunity } from "@/lib/actions/create-opportunity";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface PublisherOpportunityListProps {
  opportunities: Opportunity[];
  emptyMessage?: string;
}

export default function PublisherOpportunityList({
  opportunities,
  emptyMessage = "You haven't published any opportunities yet.",
}: PublisherOpportunityListProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    startTransition(async () => {
      await deleteOpportunity(id);
    });
  };

  if (opportunities.length === 0) {
    return (
      <Card className="py-8 text-center text-sm text-slate-600">
        <p>{emptyMessage}</p>
        <div className="mt-3">
          <Button href="/opportunities/new" size="sm">
            Add your first opportunity
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {opportunities.map((opportunity) => (
        <Card
          key={opportunity.id}
          className="flex h-full flex-col justify-between hover:border-indigo-200 transition-colors"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
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

            <p className="mt-1 text-xs text-slate-500">
              Deadline: {formatDeadline(opportunity.deadline)}
              {opportunity.cost ? ` · ${opportunity.cost}` : ""}
            </p>

            <p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-2">
              {opportunity.description}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
            <Link
              href={`/opportunities/${opportunity.id}`}
              className="font-medium text-slate-600 hover:text-slate-900"
            >
              View →
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href={`/opportunities/${opportunity.id}/edit`}
                className="rounded px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
              >
                Edit
              </Link>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleDelete(opportunity.id, opportunity.title)}
                className="rounded px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
