"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { setOrganizationActivityVerification } from "@/lib/actions/activities";
import type { OrganizationParticipationRequest } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";

interface ParticipationConfirmationQueueProps {
  requests: OrganizationParticipationRequest[];
}

export default function ParticipationConfirmationQueue({
  requests,
}: ParticipationConfirmationQueueProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  function updateRequest(activityId: string, shouldVerify: boolean) {
    setMessage(null);
    startTransition(async () => {
      const result = await setOrganizationActivityVerification(
        activityId,
        shouldVerify,
      );
      setMessage(result.error ?? result.success ?? null);
      if (!result.error) router.refresh();
    });
  }

  if (requests.length === 0) {
    return (
      <Card className="py-10 text-center text-sm text-slate-600">
        No student participation confirmations are waiting for your organization.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <p
          role="status"
          className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
        >
          {message}
        </p>
      )}
      {requests.map((request) => {
        const isConfirmed = request.participation_status === "confirmed";

        return (
          <Card key={request.activity_id} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isConfirmed
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {isConfirmed ? "Confirmed" : "Awaiting confirmation"}
                </span>
                <span className="text-xs text-slate-500">
                  {request.requested_at
                    ? `Requested ${formatDate(request.requested_at)}`
                    : "Confirmation requested"}
                </span>
              </div>
              <h2 className="mt-2 text-base font-semibold text-slate-900">
                {request.opportunity_title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Student: {request.student_email}
              </p>
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-medium">Portfolio entry:</span>{" "}
                {request.activity_title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {request.activity_description}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Activity date: {formatDate(request.activity_date)}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={isConfirmed ? "outline" : "primary"}
              className={isConfirmed ? "sm:shrink-0" : "bg-emerald-600 hover:bg-emerald-700 sm:shrink-0"}
              disabled={isPending}
              onClick={() => updateRequest(request.activity_id, !isConfirmed)}
            >
              {isPending
                ? "Saving…"
                : isConfirmed
                  ? "Remove confirmation"
                  : "Confirm participation"}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}
