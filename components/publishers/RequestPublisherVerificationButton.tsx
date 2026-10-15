"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestPublisherVerification } from "@/lib/actions/organization-profile";
import type { PublisherVerificationStatus } from "@/lib/types";
import Button from "@/components/ui/Button";

const statusCopy: Record<PublisherVerificationStatus, string> = {
  unverified: "Your profile has not been verified yet.",
  pending: "Your verification request is awaiting review.",
  verified: "OpportunityHub has verified this publisher profile.",
  rejected: "Your last verification request needs attention. Update your details and request another review.",
};

export default function RequestPublisherVerificationButton({
  status = "unverified",
}: {
  status?: PublisherVerificationStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const canRequest = status === "unverified" || status === "rejected";
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-sm text-slate-600">{message ?? statusCopy[status]}</p>
      {canRequest ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await requestPublisherVerification();
              setMessage(result.error ?? result.success ?? "Unable to request verification.");
              if (!result.error) router.refresh();
            });
          }}
        >
          {isPending ? "Requesting…" : "Request verification"}
        </Button>
      ) : null}
    </div>
  );
}
