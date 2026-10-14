import type { Opportunity } from "@/lib/types";
import { formatDate, formatDeadline } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";

export default function OpportunityTimeline({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const items = [
    { label: "Registration deadline", value: opportunity.deadline, highlight: true },
    { label: "Starts", value: opportunity.start_date },
    { label: "Ends", value: opportunity.end_date },
  ].filter((item) => item.value);

  if (items.length === 0) return null;

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Timeline</h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                item.highlight ? "bg-amber-500" : "bg-indigo-400"
              }`}
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <p className="text-sm font-medium text-slate-800">
                {item.highlight
                  ? formatDeadline(item.value)
                  : formatDate(item.value)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
