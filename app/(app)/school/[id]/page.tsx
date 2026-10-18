import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublisherPublicProfileView from "@/components/publishers/PublisherPublicProfile";
import { getSavedOpportunityIds } from "@/lib/queries/opportunities";
import {
  getFollowerCount,
  getOpportunitiesByPublisher,
  getPublicPublisherProfile,
  isFollowingPublisher,
} from "@/lib/queries/publishers";

interface SchoolPublicPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SchoolPublicPageProps) {
  const { id } = await params;
  const profile = await getPublicPublisherProfile(id);
  return {
    title: profile?.organization_name ?? "School",
  };
}

export default async function SchoolPublicPage({ params }: SchoolPublicPageProps) {
  const { id } = await params;
  const profile = await getPublicPublisherProfile(id);

  if (!profile || profile.account_type !== "school") {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [opportunities, followerCount, following, savedIds] = await Promise.all([
    getOpportunitiesByPublisher(id),
    getFollowerCount(id),
    isFollowingPublisher(id, user?.id ?? null),
    // Without this the cards on the publisher page always render "Save", even
    // for a visitor who already saved the listing.
    getSavedOpportunityIds(),
  ]);

  return (
    <PublisherPublicProfileView
      profile={profile}
      opportunities={opportunities}
      followerCount={followerCount}
      isFollowing={following}
      currentUserId={user?.id ?? null}
      savedIds={savedIds}
    />
  );
}
