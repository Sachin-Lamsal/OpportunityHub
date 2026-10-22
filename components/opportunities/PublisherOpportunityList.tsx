"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import { formatDeadline } from "@/lib/utils/format";
import {
  deleteOpportunity,
  setOpportunityLifecycle,
} from "@/lib/actions/create-opportunity";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import OpportunityLifecycleBadge from "@/components/opportunities/OpportunityLifecycleBadge";

interface PublisherOpportunityListProps {
  opportunities: Opportunity[];
  emptyMessage?: string;
}

export default function PublisherOpportunityList({
  opportunities,
  emptyMessage = "You haven't published any opportunities yet.",
}: PublisherOpportunityListProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await deleteOpportunity(id);
      if (result.error) setError(result.error);
    });
  };

  const handleLifecycle = (
    id: string,
    title: string,
    status: "cancelled" | "archived",
  ) => {
    const action = status === "cancelled" ? "cancel" : "archive";
    if (!confirm(`Are you sure you want to ${action} "${title}"?`)) return;

    startTransition(async () => {
      setError(null);
      const result = await setOpportunityLifecycle(id, status);
      if (result.error) setError(result.error);
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
    <div className="space-y-3">
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {opportunities.map((opportunity) => {
          const status = opportunity.lifecycle_status ?? "draft";
          const canDelete = ["draft", "rejected", "cancelled"].includes(status);
          const canCancel = ["draft", "pending_review", "published", "rejected"].includes(status);
          const canArchive = ["published", "expired", "cancelled"].includes(status);

          return (
        <Card
          key={opportunity.id}
          className="flex h-full flex-col justify-between hover:border-indigo-200 transition-colors"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                {opportunity.type}
              </span>
              <OpportunityLifecycleBadge status={opportunity.lifecycle_status} />
              {opportunity.edition_year && (
                <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                  {opportunity.edition_year} Edition
                </span>
              )}
              {opportunity.parent_opportunity_id && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  Series
                </span>
              )}
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
            {opportunity.review_note ? (
              <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-800 line-clamp-3">
                Review note: {opportunity.review_note}
              </p>
            ) : null}
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
              <Link
                href={`/opportunities/new?from=${opportunity.id}`}
                className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                title="Propose next edition or instance"
              >
                <span>+</span> New edition
              </Link>
              {canCancel ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleLifecycle(opportunity.id, opportunity.title, "cancelled")}
                  className="rounded px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              ) : null}
              {canArchive ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleLifecycle(opportunity.id, opportunity.title, "archived")}
                  className="rounded px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Archive
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(opportunity.id, opportunity.title)}
                  className="rounded px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  Delete
                </button>
              ) : null}
            </div>
          </div>
        </Card>
          );
        })}
      </div>
    </div>
  );
}
