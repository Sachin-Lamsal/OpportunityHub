"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewPublisherListing } from "@/lib/actions/publisher-review";
import Button from "@/components/ui/Button";

export default function PublisherListingReviewActions({
  opportunityId,
}: {
  opportunityId: string;
}) {
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const review = (decision: "approved" | "rejected") => {
    startTransition(async () => {
      setMessage(null);
      const result = await reviewPublisherListing(opportunityId, decision, notes);
      setMessage(result.error ?? result.success ?? "Unable to save review.");
      if (!result.error) router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Optional note for the publisher"
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={isPending} onClick={() => review("approved")}>
          Approve and publish
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => review("rejected")}
          className="border-rose-200 text-rose-700 hover:bg-rose-50"
        >
          Request changes
        </Button>
      </div>
      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </div>
  );
}
