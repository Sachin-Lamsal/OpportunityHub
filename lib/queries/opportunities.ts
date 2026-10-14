import { createClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";

export interface OpportunityFilters {
  q?: string;
  subject?: string;
  type?: string;
  deadline?: string;
  format?: string;
  verificationStatus?: string;
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

  return (data ?? []) as Opportunity[];
}

export async function getOpportunities(
  filters: OpportunityFilters = {},
): Promise<Opportunity[]> {
  const supabase = await createClient();

  let query = supabase
    .from("opportunities")
    .select("*")
    .order("created_at", { ascending: false });

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
    const searchTerm = filters.q.trim();
    if (searchTerm.length > 0 && searchTerm.length <= 200) {
      // Use ilike with wildcards - Supabase properly escapes the searchTerm value
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

  return (data ?? []) as Opportunity[];
}

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

  return data as Opportunity;
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

  return (data ?? [])
    .map((row) => row.opportunities as unknown as Opportunity)
    .filter(Boolean);
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
