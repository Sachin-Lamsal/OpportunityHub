import type { OpportunityLifecycleStatus } from "@/lib/types";
import { lifecycleLabel } from "@/lib/opportunities/workflow";

const statusClasses: Record<OpportunityLifecycleStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-700",
  pending_review: "border-amber-200 bg-amber-50 text-amber-800",
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
  expired: "border-slate-200 bg-slate-100 text-slate-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
  archived: "border-slate-200 bg-slate-100 text-slate-700",
};

export default function OpportunityLifecycleBadge({
  status,
}: {
  status?: OpportunityLifecycleStatus | null;
}) {
  const resolvedStatus = status ?? "draft";

  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClasses[resolvedStatus]}`}
    >
      {lifecycleLabel(resolvedStatus)}
    </span>
  );
}
