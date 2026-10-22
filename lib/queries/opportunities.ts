import { createClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";
import { withoutInternalNotes } from "@/lib/opportunities/internal-notes";
import { isDeadlinePast } from "@/lib/opportunities/deadline";
import {
  DEFAULT_OPPORTUNITY_SORT,
  isOpportunitySort,
  type OpportunitySort,
} from "@/lib/opportunities/filters";

export interface OpportunityFilters {
  q?: string;
  subject?: string;
  type?: string;
  deadline?: string;
  format?: string;
  verificationStatus?: string;
  sort?: OpportunitySort;
  limit?: number;
}

function getDeadlineRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));

  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    today: today.toISOString().split("T")[0],
    weekEnd: endOfWeek.toISOString().split("T")[0],
    monthEnd: endOfMonth.toISOString().split("T")[0],
  };
}

export async function getOpportunitiesCreatedByUser(
  userId: string,
  limit = 10,
): Promise<Opportunity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load published opportunities:", error.message);
    return [];
  }

  // Owner view: keep review_note so the publisher can read admin feedback.
  return (data ?? []) as Opportunity[];
}

export interface PublisherOpportunityStats {
  draft: number;
  pendingReview: number;
  published: number;
  needsAttention: number;
}

export async function getPublisherOpportunityStats(
  userId: string,
): Promise<PublisherOpportunityStats> {
  const supabase = await createClient();
  const statuses = ["draft", "pending_review", "published", "rejected"] as const;

  const results = await Promise.all(
    statuses.map(async (lifecycleStatus) => {
      const { count, error } = await supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("created_by", userId)
        .eq("lifecycle_status", lifecycleStatus);
      return { lifecycleStatus, count: error ? 0 : (count ?? 0) };
    }),
  );

  const counts = Object.fromEntries(
    results.map(({ lifecycleStatus, count }) => [lifecycleStatus, count]),
  ) as Record<(typeof statuses)[number], number>;

  return {
    draft: counts.draft,
    pendingReview: counts.pending_review,
    published: counts.published,
    needsAttention: counts.rejected,
  };
}

/**
 * PostgREST `.or()` grammar treats these characters as structural delimiters.
 * Stripping them prevents a user-supplied search term from injecting extra
 * filter expressions (e.g. `,is_verified.eq.true`).
 */
function sanitizePostgrestSearchTerm(term: string): string {
  return term.replace(/[,()"\\]/g, " ").replace(/\s+/g, " ").trim();
}

/** Puts opportunities that are still open before the ones that are closed. */
function orderByStillOpen<T extends { deadline?: string | null }>(rows: T[]): T[] {
  const open = rows.filter((row) => !isDeadlinePast(row.deadline));
  const closed = rows.filter((row) => isDeadlinePast(row.deadline));

  return [...open, ...closed];
}

export async function getOpportunities(
  filters: OpportunityFilters = {},
): Promise<Opportunity[]> {
  const supabase = await createClient();

  const sort: OpportunitySort = isOpportunitySort(filters.sort)
    ? filters.sort
    : DEFAULT_OPPORTUNITY_SORT;

  let query = supabase
    .from("opportunities")
    .select("*")
    .eq("lifecycle_status", "published");

  if (sort === "deadline") {
    // Opportunities without a deadline are still open, but they cannot be
    // "due soon" — park them at the end instead of the top.
    query = query
      .order("deadline", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
  } else if (sort === "title") {
    query = query.order("title", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  if (filters.subject) {
    query = query.eq("subject_area", filters.subject);
  }

  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  if (filters.format === "online") {
    query = query.eq("is_online", true);
  } else if (filters.format === "in_person") {
    query = query.eq("is_online", false);
  }

  if (filters.deadline) {
    const { today, weekEnd, monthEnd } = getDeadlineRange();

    if (filters.deadline === "week") {
      query = query.gte("deadline", today).lte("deadline", weekEnd);
    } else if (filters.deadline === "month") {
      query = query.gte("deadline", today).lte("deadline", monthEnd);
    } else if (filters.deadline === "later") {
      query = query.gt("deadline", monthEnd);
    }
  }

  if (filters.verificationStatus === "verified") {
    query = query.eq("is_verified", true);
  } else if (filters.verificationStatus === "unverified") {
    query = query.eq("is_verified", false);
  }

  if (filters.q) {
    const searchTerm = sanitizePostgrestSearchTerm(filters.q.trim());
    if (searchTerm.length > 0 && searchTerm.length <= 200) {
      query = query.or(
        `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,organizer.ilike.%${searchTerm}%,subject_area.ilike.%${searchTerm}%`,
      );
    }
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    if (error.message.includes("fetch failed")) {
      console.warn(
        "Supabase connection notice: Unable to reach database host. Check if your Supabase project is paused or check NEXT_PUBLIC_SUPABASE_URL in .env.local.",
      );
    } else {
      console.error("Failed to fetch opportunities:", error.message);
    }
    return [];
  }

  return withoutInternalNotes(data ?? []);
}

/**
 * Similar published opportunities for the detail page.
 *
 * Matching is done on the data the publisher actually filled in (type and
 * subject area), with a fallback to "same type" when the opportunity has no
 * subject area. Only published rows are returned, the opportunity itself is
 * excluded, and listings whose deadline has passed are listed after the ones
 * that are still open.
 */
export async function getRelatedOpportunities(
  opportunity: Pick<Opportunity, "id" | "type" | "subject_area">,
  limit = 3,
): Promise<Opportunity[]> {
  const supabase = await createClient();

  let query = supabase
    .from("opportunities")
    .select("*")
    .eq("lifecycle_status", "published")
    .neq("id", opportunity.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opportunity.subject_area) {
    query = query.eq("subject_area", opportunity.subject_area);
  } else {
    query = query.eq("type", opportunity.type);
  }

  const { data, error } = await query;

  if (error) {
    if (!error.message.includes("fetch failed")) {
      console.error("Failed to fetch related opportunities:", error.message);
    }
    return [];
  }

  // A listing a student can still apply to is the more useful suggestion, so
  // the ones whose deadline has passed are moved to the end instead of being
  // hidden — they are shown honestly with an "Applications closed" badge.
  const related = orderByStillOpen(withoutInternalNotes(data ?? []));

  // When a subject-area match is thin, top it up with same-type opportunities
  // so the section is useful rather than empty.
  if (related.length < limit) {
    const seen = new Set(related.map((row) => row.id));
    seen.add(opportunity.id);

    const { data: fallback, error: fallbackError } = await supabase
      .from("opportunities")
      .select("*")
      .eq("lifecycle_status", "published")
      .eq("type", opportunity.type)
      .order("created_at", { ascending: false })
      .limit(limit * 3);

    if (!fallbackError) {
      for (const row of withoutInternalNotes(fallback ?? [])) {
        if (related.length >= limit) break;
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        related.push(row);
      }
    }
  }

  return related.slice(0, limit);
}

/**
 * Opportunities whose deadline has already passed but that are still
 * published. They are hidden from the browse feed (a student cannot apply)
 * but the detail page still explains what the opportunity was.
 */
export async function getOpportunityById(id: string): Promise<Opportunity | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (!error.message.includes("fetch failed")) {
      console.error("Failed to fetch opportunity:", error.message);
    }
    return null;
  }

  // Public detail view: admin review notes must not reach anonymous readers.
  return withoutInternalNotes([data])[0] ?? null;
}

/**
 * Owner-scoped read used by the publisher edit screen.
 *
 * Scoping `created_by` in the query (instead of reading the row and comparing
 * afterwards) means a listing with a NULL `created_by` — legacy/seed rows — is
 * never editable by an unrelated publisher. Unlike the public read, this keeps
 * `review_note`, because it is admin feedback written for this publisher.
 * Returns null when the listing does not exist or is not owned by `userId`.
 */
export async function getOpportunityForOwnerEdit(
  id: string,
  userId: string,
): Promise<Opportunity | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("created_by", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load listing for editing:", error.message);
    return null;
  }

  return (data as Opportunity | null) ?? null;
}

export async function getSavedOpportunityIds(): Promise<Set<string>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Set();

  const { data, error } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to fetch saved opportunities:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.opportunity_id));
}

export async function getSavedOpportunities(): Promise<Opportunity[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id, created_at, opportunities (*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch saved opportunities:", error.message);
    return [];
  }

  return withoutInternalNotes(
    (data ?? [])
      .map((row) => row.opportunities as unknown as Opportunity)
      .filter(Boolean),
  );
}

export async function isOpportunitySaved(opportunityId: string): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("saved_opportunities")
    .select("id")
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  return !!data;
}

export interface SavedOpportunityInfo {
  saved: boolean;
  remindDeadline: boolean;
}

export async function getSavedOpportunityInfo(
  opportunityId: string,
): Promise<SavedOpportunityInfo> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { saved: false, remindDeadline: true };

  const { data } = await supabase
    .from("saved_opportunities")
    .select("id, remind_deadline")
    .eq("user_id", user.id)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();

  if (!data) return { saved: false, remindDeadline: true };

  return {
    saved: true,
    remindDeadline: data.remind_deadline ?? true,
  };
}
