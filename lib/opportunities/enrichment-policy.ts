import type { Opportunity } from "@/lib/types";

/**
 * Authorization policy for AI enrichment writes.
 *
 * `save_opportunity_ai_enrichment` is a SECURITY DEFINER function: it runs with
 * the table owner's rights and therefore bypasses RLS. The server action is the
 * only guard, so the rules live here as a pure, testable function.
 *
 * Two classes of column exist:
 *
 *  1. AI-derived narrative (`ai_summary`, `prep_resources`, `application_steps`,
 *     `eligibility_details`, `portfolio_tips`, `ai_enriched_at`). Generated
 *     text: any signed-in user may contribute — this is the documented
 *     per-opportunity "Generate AI details" feature.
 *  2. Publisher facts (`deadline`, `cost`, `location`, `tags`, `contact_info`,
 *     `source_url`, ...). Only the account that created the listing may write
 *     them, otherwise any student could rewrite a publisher's official link,
 *     contact details or dates.
 *
 * The two lists below are the single source of truth for both the TypeScript
 * patch builder and the tests, so a column added to one cannot silently escape
 * the authorization rules.
 */

/** Columns any authenticated user may write. */
export const AI_DERIVED_ENRICHMENT_FIELDS = [
  "ai_summary",
  "prep_resources",
  "application_steps",
  "eligibility_details",
  "portfolio_tips",
  "ai_enriched_at",
] as const;

/** Columns only the listing owner (or an admin) may write. */
export const OWNER_ONLY_ENRICHMENT_FIELDS = [
  "deadline",
  "start_date",
  "end_date",
  "cost",
  "time_commitment",
  "location",
  "grade_requirements",
  "skills_gained",
  "difficulty_level",
  "tags",
  "contact_info",
  "source_url",
] as const;

/**
 * Owner-only fields that enrichment may FILL when they are empty.
 *
 * `source_url` is deliberately excluded: it is the publisher's official-source
 * link, never an AI-derived value. It is still listed as owner-only because it
 * must never be written by enrichment at all.
 */
export const FILLABLE_ENRICHMENT_FACT_FIELDS = OWNER_ONLY_ENRICHMENT_FIELDS.filter(
  (field): field is Exclude<(typeof OWNER_ONLY_ENRICHMENT_FIELDS)[number], "source_url"> =>
    field !== "source_url",
);

export type EnrichmentFacts = Partial<
  Record<(typeof OWNER_ONLY_ENRICHMENT_FIELDS)[number], string | string[] | null | undefined>
>;

export type EnrichmentNarrative = Partial<
  Record<(typeof AI_DERIVED_ENRICHMENT_FIELDS)[number], string | null | undefined>
>;

export function isOpportunityOwner(
  opportunity: Pick<Opportunity, "created_by">,
  userId: string | null,
): boolean {
  if (!userId || !opportunity.created_by) return false;
  return opportunity.created_by === userId;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

/**
 * Builds the `patch` argument for `save_opportunity_ai_enrichment`.
 *
 * - AI-derived narrative is written for every signed-in caller.
 * - Publisher facts are only filled when currently empty, and only by the owner.
 * - `source_url` is never written from enrichment, by anyone.
 */
export function buildEnrichmentPatch(args: {
  narrative: EnrichmentNarrative;
  facts: EnrichmentFacts;
  /** Current row values, used to decide which facts are still empty. */
  existing: Pick<
    Opportunity,
    (typeof OWNER_ONLY_ENRICHMENT_FIELDS)[number]
  >;
  isOwner: boolean;
  enrichedAt: string;
}): Record<string, unknown> {
  const { narrative, facts, existing, isOwner, enrichedAt } = args;

  const patch: Record<string, unknown> = {};

  for (const field of AI_DERIVED_ENRICHMENT_FIELDS) {
    if (field === "ai_enriched_at") {
      patch[field] = enrichedAt;
      continue;
    }

    const value = narrative[field];
    if (typeof value === "string") {
      patch[field] = value;
    }
  }

  if (!isOwner) return patch;

  // Only fill gaps — never overwrite facts the publisher already supplied.
  for (const field of FILLABLE_ENRICHMENT_FACT_FIELDS) {
    const incoming = facts[field];
    if (!hasValue(incoming)) continue;

    if (Array.isArray(incoming)) {
      if (!hasValue(existing[field])) patch[field] = incoming;
      continue;
    }

    if (!hasValue(existing[field])) patch[field] = String(incoming).trim();
  }

  return patch;
}