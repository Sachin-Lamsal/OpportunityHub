import { createClient } from "@/lib/supabase/server";
import type { OpportunityComment, OpportunityReview, AccountType } from "@/lib/types";

export async function getOpportunityComments(
  opportunityId: string,
): Promise<OpportunityComment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunity_comments")
    .select(`
      id,
      opportunity_id,
      user_id,
      content,
      parent_id,
      created_at,
      profiles (
        account_type,
        organization_name
      )
    `)
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[getOpportunityComments error]", error.message);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>): OpportunityComment => {
    const profiles = row.profiles as Record<string, unknown> | undefined;
    return {
      id: row.id as string,
      opportunity_id: row.opportunity_id as string,
      user_id: row.user_id as string,
      content: row.content as string,
      parent_id: row.parent_id as string | null,
      created_at: row.created_at as string,
      account_type: profiles?.account_type as AccountType | undefined,
      organization_name: profiles?.organization_name as string | null | undefined,
    };
  });
}

export async function getOpportunityReviews(
  opportunityId: string,
): Promise<OpportunityReview[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunity_reviews")
    .select(`
      id,
      opportunity_id,
      user_id,
      difficulty_rating,
      prep_tips,
      common_mistakes,
      skills_developed,
      verified_participant,
      created_at,
      profiles (
        account_type,
        organization_name
      )
    `)
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getOpportunityReviews error]", error.message);
    return [];
  }

  return (data || []).map((row: Record<string, unknown>): OpportunityReview => {
    const profiles = row.profiles as Record<string, unknown> | undefined;
    return {
      id: row.id as string,
      opportunity_id: row.opportunity_id as string,
      user_id: row.user_id as string,
      difficulty_rating: row.difficulty_rating as "Beginner" | "Intermediate" | "Advanced" | "Challenging" | null,
      prep_tips: row.prep_tips as string,
      common_mistakes: row.common_mistakes as string | null,
      skills_developed: row.skills_developed as string | null,
      verified_participant: row.verified_participant as boolean,
      created_at: row.created_at as string,
      account_type: profiles?.account_type as AccountType | undefined,
      organization_name: profiles?.organization_name as string | null | undefined,
    };
  });
}
