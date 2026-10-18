"use client";

import { useEffect, useState } from "react";
import { getAIUsageSummary } from "@/lib/actions/ai-usage";
import type { AiUsageSummary } from "@/lib/ai/usage";

export default function AITokenBadge() {
  const [usage, setUsage] = useState<AiUsageSummary | null>(null);

  useEffect(() => {
    let active = true;

    // A rejected call (expired session, database error) must not surface as an
    // unhandled rejection; the badge simply stays hidden, exactly as it does
    // when no AI usage row exists yet.
    getAIUsageSummary()
      .then((summary) => {
        if (active) setUsage(summary);
      })
      .catch(() => {
        if (active) setUsage(null);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!usage) return null;

  const isExhausted = usage.activeTier === "exhausted" || usage.totalRemaining === 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800">
          Monthly AI Talks
        </span>
        <span
          className={`font-semibold tabular-nums px-2 py-0.5 rounded-full ${
            isExhausted
              ? "bg-amber-100 text-amber-800"
              : "bg-indigo-50 text-indigo-700"
          }`}
        >
          {usage.totalRemaining} / {usage.totalLimit} left
        </span>
      </div>

      <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isExhausted ? "bg-amber-500" : "bg-indigo-600"
          }`}
          style={{
            width: `${Math.min(
              100,
              Math.max(0, (usage.totalRemaining / usage.totalLimit) * 100),
            )}%`,
          }}
        />
      </div>

      <ul className="mt-2.5 space-y-1 text-[11px]">
        {usage.tiers.map((tier) => (
          <li key={tier.id} className="flex justify-between gap-4 text-slate-500">
            <span>
              {tier.label}
              {usage.activeTier === tier.id && tier.remaining > 0 ? " (active)" : ""}
            </span>
            <span className="tabular-nums font-medium text-slate-700">
              {tier.remaining} / {tier.limit} talks
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[11px] text-slate-500 leading-normal border-t border-slate-100 pt-2">
        {isExhausted
          ? `All ${usage.totalLimit} monthly AI talks used. Offline rule-based guidance is active. Talks reset on the 1st.`
          : `Active: ${usage.activeTierLabel}. When exhausted, system falls back to offline portfolio suggestions.`}
      </p>
    </div>
  );
}
