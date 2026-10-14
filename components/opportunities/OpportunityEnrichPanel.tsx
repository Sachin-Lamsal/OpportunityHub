"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enrichOpportunityWithAI } from "@/lib/actions/opportunity-enrich";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import AITokenBadge from "@/components/ai/AITokenBadge";
import { formatDate } from "@/lib/utils/format";

interface OpportunityEnrichPanelProps {
  opportunityId: string;
  aiEnrichedAt: string | null;
  hasStoredDetails: boolean;
}

export default function OpportunityEnrichPanel({
  opportunityId,
  aiEnrichedAt,
  hasStoredDetails,
}: OpportunityEnrichPanelProps) {
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function runEnrich(forceRefresh: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = await enrichOpportunityWithAI(opportunityId, forceRefresh);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else if (result.success) {
        setMessage({ type: "success", text: result.success });
        router.refresh();
      }
    });
  }

  return (
    <Card className="border-indigo-100 bg-indigo-50/40">
      <h2 className="text-sm font-semibold text-slate-900">AI opportunity details</h2>
      <p className="mt-1 text-xs text-slate-600">
        {hasStoredDetails
          ? "Showing saved details from the database — no credits used on page load."
          : "Generate prep resources and application steps once — saved for everyone. Uses one of your AI credits."}
      </p>

      <div className="mt-3">
        <AITokenBadge />
      </div>

      {aiEnrichedAt && (
        <p className="mt-2 text-xs text-slate-500">
          Last AI update: {formatDate(aiEnrichedAt.split("T")[0])}
        </p>
      )}

      {message && (
        <p
          className={`mt-3 text-sm rounded-lg px-3 py-2 ${
            message.type === "error"
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {!hasStoredDetails && (
          <Button
            type="button"
            size="sm"
            onClick={() => runEnrich(false)}
            disabled={isPending}
          >
            {isPending ? "Generating…" : "Generate AI details"}
          </Button>
        )}
        {hasStoredDetails && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => runEnrich(true)}
            disabled={isPending}
          >
            {isPending ? "Refreshing…" : "Refresh with AI (latest)"}
          </Button>
        )}
      </div>
    </Card>
  );
}
