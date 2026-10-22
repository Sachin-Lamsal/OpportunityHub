import type { VerificationStatus } from "@/lib/types";

interface VerificationBadgeProps {
  status?: VerificationStatus | null;
  isVerified?: boolean;
  className?: string;
}

export default function VerificationBadge({
  status,
  isVerified,
  className = "",
}: VerificationBadgeProps) {
  // If explicitly verified or status is verified
  const verified = isVerified === true || status === "verified";
  const rejected = status === "rejected";

  if (verified) {
    return (
      <span
        title="Official opportunity verified by OpportunityHub"
        className={`inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-300/70 px-2 py-0.5 text-xs font-medium text-emerald-800 ${className}`}
      >
        <svg
          className="h-3 w-3 text-emerald-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Verified
      </span>
    );
  }

  if (rejected) {
    return (
      <span
        title="Rejected or invalid listing"
        className={`inline-flex items-center gap-1.5 rounded-md bg-rose-50 border border-rose-300/70 px-2 py-0.5 text-xs font-medium text-rose-700 ${className}`}
      >
        <svg
          className="h-3 w-3 text-rose-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Rejected
      </span>
    );
  }

  // Default: unverified / internet source
  return (
    <span
      title="Automated extraction from internet source. Not verified yet."
      className={`inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-300/70 px-2 py-0.5 text-xs font-medium text-amber-800 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Internet Source (Unverified)
    </span>
  );
}
