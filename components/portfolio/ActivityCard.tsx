"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteActivity,
  requestParticipationConfirmation,
  setSchoolActivityVerification,
} from "@/lib/actions/activities";
import type { Activity } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface ActivityCardProps {
  activity: Activity;
  showDelete?: boolean;
  showSchoolVerification?: boolean;
}

const categoryColors: Record<string, string> = {
  Academic: "bg-blue-50 text-blue-700",
  Leadership: "bg-purple-50 text-purple-700",
  Service: "bg-emerald-50 text-emerald-700",
  Projects: "bg-amber-50 text-amber-700",
  "Work Experience": "bg-rose-50 text-rose-700",
  Creative: "bg-pink-50 text-pink-700",
};

export default function ActivityCard({
  activity,
  showDelete = true,
  showSchoolVerification = false,
}: ActivityCardProps) {
  const [isPending, startTransition] = useTransition();
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Delete this activity?")) return;

    startTransition(async () => {
      const result = await deleteActivity(activity.id);
      if (result.error) alert(result.error);
    });
  }

  function handleVerification() {
    setVerificationError(null);
    startTransition(async () => {
      const result = await setSchoolActivityVerification(
        activity.id,
        participationStatus !== "confirmed",
      );

      if (result.error) {
        setVerificationError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleRequestConfirmation() {
    setVerificationError(null);
    startTransition(async () => {
      const result = await requestParticipationConfirmation(activity.id);
      if (result.error) {
        setVerificationError(result.error);
        return;
      }

      router.refresh();
    });
  }

  const colorClass =
    categoryColors[activity.category] ?? "bg-slate-100 text-slate-700";
  const participationStatus = activity.participation_status ?? (
    activity.school_verified ? "confirmed" : "unverified"
  );
  const canRequestConfirmation =
    showDelete && Boolean(activity.opportunity_id) && participationStatus !== "confirmed";
  const schoolCanConfirm =
    showSchoolVerification && participationStatus === "pending";
  const schoolCanRemoveConfirmation =
    showSchoolVerification && participationStatus === "confirmed";

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
            >
              {activity.category}
            </span>
            <span className="text-xs text-slate-500">
              {formatDate(activity.date)}
            </span>
            {participationStatus === "confirmed" && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                Participation confirmed
              </span>
            )}
            {participationStatus === "pending" && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Confirmation requested
              </span>
            )}
            {participationStatus === "declined" && (
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                Confirmation declined
              </span>
            )}
          </div>
          <h3 className="mt-2 text-base font-semibold text-slate-900">
            {activity.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {activity.description}
          </p>
          {activity.notes && (
            <p className="mt-2 text-sm italic text-slate-500">
              Note: {activity.notes}
            </p>
          )}
        </div>

        {(showDelete || schoolCanConfirm || schoolCanRemoveConfirmation) && (
          <div className="flex shrink-0 flex-col items-end gap-2">
            {showDelete &&
              activity.opportunity_id &&
              participationStatus === "confirmed" && (
                <Button
                  href={`/opportunities/${activity.opportunity_id}`}
                  variant="outline"
                  size="sm"
                >
                  Share experience
                </Button>
              )}
            {schoolCanConfirm && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleVerification}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isPending ? "Saving…" : "Confirm participation"}
              </Button>
            )}
            {schoolCanRemoveConfirmation && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleVerification}
                disabled={isPending}
                className="text-slate-700"
              >
                {isPending ? "Saving…" : "Remove confirmation"}
              </Button>
            )}
            {canRequestConfirmation && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRequestConfirmation}
                disabled={isPending}
              >
                {isPending
                  ? "Sending…"
                  : participationStatus === "pending"
                    ? "Resend confirmation"
                    : "Request confirmation"}
              </Button>
            )}
            {showDelete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                {isPending ? "…" : "Delete"}
              </Button>
            )}
          </div>
        )}
      </div>
      {verificationError && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {verificationError}
        </p>
      )}
    </Card>
  );
}
