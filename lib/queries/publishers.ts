import { createClient } from "@/lib/supabase/server";
import { UUID_RE } from "@/lib/auth/account";
import type {
  AccountType,
  Opportunity,
  Profile,
  PublisherVerificationStatus,
} from "@/lib/types";
import { PUBLIC_OPPORTUNITY_STATUSES } from "@/lib/opportunities/workflow";

export interface PublicPublisherProfile {
  id: string;
  account_type: Extract<AccountType, "school" | "organization">;
  organization_name: string | null;
  organization_description: string | null;
  school_code: string | null;
  contact_info: string | null;
  website_url: string | null;
  social_links: Record<string, string> | null;
  publisher_verification_status: PublisherVerificationStatus;
  publisher_verified_at: string | null;
  created_at: string;
}

export async function getPublicPublisherProfile(
  id: string,
): Promise<PublicPublisherProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("publisher_profiles")
    .select(
      "id, account_type, organization_name, organization_description, school_code, contact_info, website_url, social_links, publisher_verification_status, publisher_verified_at, created_at",
    )
    .eq("id", id)
    .in("account_type", ["school", "organization"])
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as PublicPublisherProfile;
}

export async function getOpportunitiesByPublisher(
  publisherId: string,
  limit = 24,
): Promise<Opportunity[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("created_by", publisherId)
    .in("lifecycle_status", [...PUBLIC_OPPORTUNITY_STATUSES])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[getOpportunitiesByPublisher]", error.message);
    return [];
  }

  return (data ?? []) as Opportunity[];
}

export async function isFollowingPublisher(
  publisherId: string,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_follows")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", publisherId)
    .maybeSingle();

  return Boolean(data);
}

export async function getFollowerCount(publisherId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("organization_follows")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", publisherId);

  if (error) return 0;
  return count ?? 0;
}

export async function getRelatedEditions(
  opportunity: Opportunity,
): Promise<Opportunity[]> {
  const supabase = await createClient();
  const parentId = opportunity.parent_opportunity_id ?? opportunity.id;

  // This value reaches the PostgREST `.or()` grammar as raw filter syntax, so
  // it must be a well-formed UUID before interpolation.
  if (!UUID_RE.test(parentId ?? "")) {
    return [];
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .or(`id.eq.${parentId},parent_opportunity_id.eq.${parentId}`)
    .order("edition_year", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return [];
  }

  return (data as Opportunity[]).filter((row) => row.id !== opportunity.id);
}

export function publisherPublicPath(profile: Pick<Profile, "id" | "account_type">): string {
  return profile.account_type === "school"
    ? `/school/${profile.id}`
    : `/org/${profile.id}`;
}
