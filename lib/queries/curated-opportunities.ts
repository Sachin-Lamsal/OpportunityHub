import { createClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";
import { getOpportunities } from "@/lib/queries/opportunities";

export interface CuratedOpportunitySections {
  deadlinesThisWeek: Opportunity[];
  popular: Opportunity[];
  featured: Opportunity[];
}

export async function getCuratedOpportunitySections(): Promise<CuratedOpportunitySections> {
  const [deadlinesThisWeek, popular, featured] = await Promise.all([
    getOpportunities({ deadline: "week", limit: 8 }),
    getPopularOpportunities(8),
    getFeaturedOpportunities(8),
  ]);

  return { deadlinesThisWeek, popular, featured };
}

async function getPopularOpportunities(limit: number): Promise<Opportunity[]> {
  const supabase = await createClient();

  const { data: saves, error: savesError } = await supabase
    .from("saved_opportunities")
    .select("opportunity_id");

  if (savesError || !saves?.length) {
    return getOpportunities({ verificationStatus: "verified", limit });
  }

  const counts = new Map<string, number>();
  for (const row of saves) {
    counts.set(row.opportunity_id, (counts.get(row.opportunity_id) ?? 0) + 1);
  }

  const topIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (topIds.length === 0) {
    return getOpportunities({ verificationStatus: "verified", limit });
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .in("id", topIds);

  if (error || !data?.length) {
    return getOpportunities({ verificationStatus: "verified", limit });
  }

  const byId = new Map(data.map((row) => [row.id, row as Opportunity]));
  return topIds
    .map((id) => byId.get(id))
    .filter((opp): opp is Opportunity => Boolean(opp));
}

async function getFeaturedOpportunities(limit: number): Promise<Opportunity[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: tagged, error: taggedError } = await supabase
    .from("opportunities")
    .select("*")
    .contains("tags", ["featured"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!taggedError && tagged && tagged.length >= Math.min(3, limit)) {
    return tagged as Opportunity[];
  }

  const { data: verified, error: verifiedError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("is_verified", true)
    .or(`deadline.is.null,deadline.gte.${today}`)
    .not("ai_summary", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!verifiedError && verified?.length) {
    return verified as Opportunity[];
  }

  return getOpportunities({ verificationStatus: "verified", limit });
}
