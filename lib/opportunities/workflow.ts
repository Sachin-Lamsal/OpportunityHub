import type { OpportunityLifecycleStatus } from "@/lib/types";

export const OPPORTUNITY_LIFECYCLE_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "expired",
  "cancelled",
  "archived",
] as const satisfies readonly OpportunityLifecycleStatus[];

export const PUBLIC_OPPORTUNITY_STATUSES = [
  "published",
  "expired",
  "archived",
] as const satisfies readonly OpportunityLifecycleStatus[];

const LIFECYCLE_LABELS: Record<OpportunityLifecycleStatus, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  published: "Published",
  rejected: "Needs changes",
  expired: "Expired",
  cancelled: "Cancelled",
  archived: "Archived",
};

export function lifecycleLabel(
  status: OpportunityLifecycleStatus | null | undefined,
): string {
  return LIFECYCLE_LABELS[status ?? "draft"];
}

export function isPublicLifecycleStatus(
  status: OpportunityLifecycleStatus | null | undefined,
): boolean {
  return (PUBLIC_OPPORTUNITY_STATUSES as readonly string[]).includes(status ?? "draft");
}

export function isSubmissionIntent(value: unknown): value is "draft" | "review" {
  return value === "draft" || value === "review";
}
