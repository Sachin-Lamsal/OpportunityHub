import { createClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";

export interface RecommendationFilters {
  limit?: number;
}

export async function getPublishedOpportunitiesForRecommendations(
  filters: RecommendationFilters = {},
): Promise<Opportunity[]> {
  const supabase = await createClient();

  const query = supabase
    .from("opportunities")
    .select("*")
    .in("source_type", ["official", "manual", "scraped"])
    .limit(filters.limit ?? 50)
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    console.error("Recommendation query failed:", error.message);
    return [];
  }
  return (data ?? []) as Opportunity[];
}
