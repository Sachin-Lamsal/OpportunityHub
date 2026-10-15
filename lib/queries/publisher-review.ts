import { createClient } from "@/lib/supabase/server";
import type { Opportunity } from "@/lib/types";
import type { PublicPublisherProfile } from "@/lib/queries/publishers";

export async function getPendingPublisherListings(): Promise<Opportunity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("lifecycle_status", "pending_review")
    .order("submitted_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Failed to load publisher listing review queue:", error.message);
    return [];
  }

  return (data ?? []) as Opportunity[];
}

export async function getPendingPublisherProfiles(): Promise<PublicPublisherProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("publisher_profiles")
    .select("*")
    .eq("publisher_verification_status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load publisher verification queue:", error.message);
    return [];
  }

  return (data ?? []) as PublicPublisherProfile[];
}
