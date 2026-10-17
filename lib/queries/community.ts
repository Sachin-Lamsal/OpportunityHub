import { createClient } from "@/lib/supabase/server";
import type { OpportunityComment, OpportunityReview, AccountType } from "@/lib/types";

/**
 * Author details for community rows.
 *
 * `opportunity_comments.user_id` and `opportunity_reviews.user_id` reference
 * `auth.users`, not `public.profiles`, so PostgREST has no foreign key to follow
 * and the `profiles(...)` embed fails. The whole query then returns an error and
 * the section silently rendered "No questions or discussions yet" even when rows
 * existed. Author names are therefore fetched in a second, RLS-limited query and
 * joined in memory; an author whose profile is not readable stays anonymous.
 */
async function getAuthorProfiles(
  userIds: string[],
): Promise<Map<string, { account_type: AccountType | null; organization_name: string | null }>> {
  const profiles = new Map<
    string,
    { account_type: AccountType | null; organization_name: string | null }
  >();

  const unique = Array.from(new Set(userIds.filter(Boolean)));
  if (unique.length === 0) return profiles;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, account_type, organization_name")
    .in("id", unique);

  if (error) {
    // RLS hides other users' profiles from most viewers: that is expected and
    // simply leaves those authors anonymous.
    console.warn("[community] author profiles unavailable:", error.message);
    return profiles;
  }

  for (const row of data ?? []) {
    profiles.set(row.id as string, {
      account_type: (row.account_type as AccountType | undefined) ?? null,
      organization_name: (row.organization_name as string | null) ?? null,
    });
  }

  return profiles;
}

export async function getOpportunityComments(
  opportunityId: string,
): Promise<OpportunityComment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunity_comments")
    .select("id, opportunity_id, user_id, content, parent_id, created_at")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[getOpportunityComments error]", error.message);
    return [];
  }

  const rows = data ?? [];
  const authors = await getAuthorProfiles(
    rows.map((row) => row.user_id as string),
  );

  return rows.map((row: Record<string, unknown>): OpportunityComment => {
    const author = authors.get(row.user_id as string);
    return {
      id: row.id as string,
      opportunity_id: row.opportunity_id as string,
      user_id: row.user_id as string,
      content: row.content as string,
      parent_id: row.parent_id as string | null,
      created_at: row.created_at as string,
      account_type: author?.account_type ?? undefined,
      organization_name: author?.organization_name ?? null,
    };
  });
}

export async function getOpportunityReviews(
  opportunityId: string,
): Promise<OpportunityReview[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunity_reviews")
    .select(
      "id, opportunity_id, user_id, difficulty_rating, prep_tips, common_mistakes, skills_developed, verified_participant, created_at",
    )
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getOpportunityReviews error]", error.message);
    return [];
  }

  const rows = data ?? [];
  const authors = await getAuthorProfiles(
    rows.map((row) => row.user_id as string),
  );

  return rows.map((row: Record<string, unknown>): OpportunityReview => {
    const author = authors.get(row.user_id as string);
    return {
      id: row.id as string,
      opportunity_id: row.opportunity_id as string,
      user_id: row.user_id as string,
      difficulty_rating: row.difficulty_rating as
        | "Beginner"
        | "Intermediate"
        | "Advanced"
        | "Challenging"
        | null,
      prep_tips: row.prep_tips as string,
      common_mistakes: row.common_mistakes as string | null,
      skills_developed: row.skills_developed as string | null,
      verified_participant: row.verified_participant as boolean,
      created_at: row.created_at as string,
      account_type: author?.account_type ?? undefined,
      organization_name: author?.organization_name ?? null,
    };
  });
}