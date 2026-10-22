"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { approveCandidate, rejectCandidate } from "@/lib/actions/discovery";

export default function CandidateReviewActions({
  candidateId,
}: {
  candidateId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function run(intent: "approve" | "reject") {
    setError(null);
    setStatus(null);

    startTransition(async () => {
      const result =
        intent === "approve"
          ? await approveCandidate(candidateId)
          : await rejectCandidate(candidateId);

      if (!result.success) {
        setError(result.error || "Action failed. Please try again.");
        return;
      }

      setStatus(
        intent === "approve"
          ? "Candidate approved and published."
          : "Candidate rejected.",
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 sm:gap-4">
        <Button
          type="button"
          variant="primary"
          onClick={() => run("approve")}
          disabled={isPending}
        >
          {isPending ? "Working…" : "Approve"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => run("reject")}
          disabled={isPending}
        >
          Reject
        </Button>
        <Button href="/admin/queue" variant="ghost">
          Back to Queue
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {status && (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {status}
        </p>
      )}
    </div>
  );
}
