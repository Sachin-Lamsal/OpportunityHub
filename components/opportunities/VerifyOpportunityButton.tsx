"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  verifyOpportunityAction,
  rejectOpportunityAction,
} from "@/lib/actions/ingestion";
import Button from "@/components/ui/Button";

interface VerifyOpportunityButtonProps {
  opportunityId: string;
}

export default function VerifyOpportunityButton({
  opportunityId,
}: VerifyOpportunityButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  function handleVerify() {
    setError(null);
    startTransition(async () => {
      const res = await verifyOpportunityAction(opportunityId);
      if (res.success) {
        setSuccess("Opportunity verified successfully!");
        router.refresh();
      } else {
        setError(res.error || "Failed to verify opportunity.");
      }
    });
  }

  function handleReject() {
    if (!confirm("Are you sure you want to reject this opportunity listing?")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await rejectOpportunityAction(opportunityId);
      if (res.success) {
        setSuccess("Opportunity marked as rejected.");
        router.refresh();
      } else {
        setError(res.error || "Failed to reject opportunity.");
      }
    });
  }

  if (success) {
    return (
      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
        ✓ {success}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 items-end">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleVerify}
          disabled={isPending}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isPending ? "Verifying..." : "✓ Approve & Verify"}
        </Button>
        <Button
          onClick={handleReject}
          disabled={isPending}
          variant="outline"
          size="sm"
          className="text-rose-600 hover:bg-rose-50 border-rose-200"
        >
          Reject
        </Button>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
