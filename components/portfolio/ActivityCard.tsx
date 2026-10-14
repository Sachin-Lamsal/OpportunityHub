"use client";

import { useTransition } from "react";
import { deleteActivity } from "@/lib/actions/activities";
import type { Activity } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ActivityCardProps {
  activity: Activity;
  showDelete?: boolean;
}

const categoryColors: Record<string, string> = {
  Academic: "bg-blue-50 text-blue-700",
  Leadership: "bg-purple-50 text-purple-700",
  Service: "bg-emerald-50 text-emerald-700",
  Projects: "bg-amber-50 text-amber-700",
  "Work Experience": "bg-rose-50 text-rose-700",
  Creative: "bg-pink-50 text-pink-700",
};

export default function ActivityCard({
  activity,
  showDelete = true,
}: ActivityCardProps) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this activity?")) return;

    startTransition(async () => {
      const result = await deleteActivity(activity.id);
      if (result.error) alert(result.error);
    });
  }

  const colorClass =
    categoryColors[activity.category] ?? "bg-slate-100 text-slate-700";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
            >
              {activity.category}
            </span>
            <span className="text-xs text-slate-500">
              {formatDate(activity.date)}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold text-slate-900">
            {activity.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {activity.description}
          </p>
          {activity.notes && (
            <p className="mt-2 text-sm italic text-slate-500">
              Note: {activity.notes}
            </p>
          )}
        </div>

        {showDelete && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            {isPending ? "…" : "Delete"}
          </Button>
        )}
      </div>
    </Card>
  );
}
