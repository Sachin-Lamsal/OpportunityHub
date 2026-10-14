import Link from "next/link";
import type { Opportunity } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";

interface OpportunityEditionsPanelProps {
  current: Opportunity;
  editions: Opportunity[];
}

export default function OpportunityEditionsPanel({
  current,
  editions,
}: OpportunityEditionsPanelProps) {
  if (editions.length === 0 && !current.parent_opportunity_id && !current.edition_year) {
    return null;
  }

  const all = [current, ...editions.filter((e) => e.id !== current.id)].sort((a, b) => {
    const yearA = a.edition_year ?? "";
    const yearB = b.edition_year ?? "";
    return yearB.localeCompare(yearA);
  });

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Editions & history</h2>
      <p className="mt-1 text-xs text-slate-500">
        Recurring programs grouped by series — switch between annual editions when available.
      </p>
      <ul className="mt-4 space-y-2">
        {all.map((edition) => {
          const isCurrent = edition.id === current.id;
          return (
            <li key={edition.id}>
              {isCurrent ? (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-sm">
                  <span className="font-semibold text-indigo-900">
                    {edition.edition_year ? `${edition.edition_year} · ` : ""}
                    {edition.title}
                  </span>
                  <span className="ml-2 text-xs text-indigo-700">(viewing)</span>
                  {edition.deadline && (
                    <p className="text-xs text-indigo-800 mt-0.5">
                      Deadline {formatDate(edition.deadline)}
                    </p>
                  )}
                </div>
              ) : (
                <Link
                  href={`/opportunities/${edition.id}`}
                  className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-indigo-300 transition-colors"
                >
                  <span className="font-medium text-slate-900">
                    {edition.edition_year ? `${edition.edition_year} · ` : ""}
                    {edition.title}
                  </span>
                  {edition.deadline && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Deadline {formatDate(edition.deadline)}
                    </p>
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
