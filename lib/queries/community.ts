import { createClient } from "@/lib/supabase/server";
import type { OpportunityComment, OpportunityReview } from "@/lib/types";

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
        email,
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

  return (data || []).map((row: any) => ({
    id: row.id,
    opportunity_id: row.opportunity_id,
    user_id: row.user_id,
    content: row.content,
    parent_id: row.parent_id,
    created_at: row.created_at,
    user_email: row.profiles?.email,
    account_type: row.profiles?.account_type,
    organization_name: row.profiles?.organization_name,
  }));
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
        email
      )
    `)
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[getOpportunityReviews error]", error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    opportunity_id: row.opportunity_id,
    user_id: row.user_id,
    difficulty_rating: row.difficulty_rating,
    prep_tips: row.prep_tips,
    common_mistakes: row.common_mistakes,
    skills_developed: row.skills_developed,
    verified_participant: row.verified_participant,
    created_at: row.created_at,
    user_email: row.profiles?.email,
  }));
}
