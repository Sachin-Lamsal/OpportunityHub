import {
  getOverallScoreLabel,
  type CategoryScore,
  type PortfolioScores,
} from "@/lib/portfolio/score";
import { Card } from "@/components/ui/Card";

interface PortfolioScoreSummaryProps {
  scores: PortfolioScores;
  compact?: boolean;
}

function ScoreBar({ item }: { item: CategoryScore }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-800">{item.category}</span>
        <span className="text-slate-500">
          {item.score}/100 · {item.activityCount} activit
          {item.activityCount === 1 ? "y" : "ies"}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${item.score}%` }}
        />
      </div>
    </div>
  );
}

export default function PortfolioScoreSummary({
  scores,
  compact = false,
}: PortfolioScoreSummaryProps) {
  const overallLabel = getOverallScoreLabel(scores.overall);

  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Portfolio strength
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Based on {scores.totalActivities} logged activit
            {scores.totalActivities === 1 ? "y" : "ies"}. This is an estimate —
            not an official university score.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-indigo-50 px-5 py-3">
          <span className="text-3xl font-bold text-indigo-700">
            {scores.overall}
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              Overall
            </p>
            <p className="text-sm text-indigo-800">{overallLabel}</p>
          </div>
        </div>
      </div>

      <div className={`mt-6 space-y-4 ${compact ? "grid gap-4 sm:grid-cols-2" : ""}`}>
        {scores.categories.map((item) => (
          <ScoreBar key={item.category} item={item} />
        ))}
      </div>
    </Card>
  );
}
