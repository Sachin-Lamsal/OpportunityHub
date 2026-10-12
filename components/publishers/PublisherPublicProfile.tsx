import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import OpportunityList from "@/components/opportunities/OpportunityList";
import FollowPublisherButton from "@/components/publishers/FollowPublisherButton";
import VerificationBadge from "@/components/opportunities/VerificationBadge";
import { Card } from "@/components/ui/Card";
import type { Opportunity } from "@/lib/types";
import type { PublicPublisherProfile } from "@/lib/queries/publishers";

interface PublisherPublicProfileProps {
  profile: PublicPublisherProfile;
  opportunities: Opportunity[];
  followerCount: number;
  isFollowing: boolean;
  currentUserId: string | null;
}

export default function PublisherPublicProfileView({
  profile,
  opportunities,
  followerCount,
  isFollowing,
  currentUserId,
}: PublisherPublicProfileProps) {
  const isSchool = profile.account_type === "school";
  const displayName =
    profile.organization_name ||
    (isSchool ? "School" : "Organization");

  const verifiedCount = opportunities.filter((o) => o.is_verified).length;

  return (
    <>
      <div className="mb-6">
        <Link
          href="/opportunities"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to opportunities
        </Link>
      </div>

      <PageHeader
        title={displayName}
        description={
          isSchool
            ? "School publisher on OpportunityHub"
            : "Organization on OpportunityHub"
        }
        action={
          currentUserId && currentUserId !== profile.id ? (
            <FollowPublisherButton
              publisherId={profile.id}
              initialFollowing={isFollowing}
            />
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isSchool
              ? "bg-emerald-50 text-emerald-800"
              : "bg-violet-50 text-violet-800"
          }`}
        >
          {isSchool ? "School" : "Organization"}
        </span>
        {verifiedCount > 0 && (
          <VerificationBadge isVerified={true} status="verified" />
        )}
        <span className="text-sm text-slate-600">
          {followerCount} follower{followerCount === 1 ? "" : "s"}
        </span>
        {isSchool && profile.school_code && (
          <span className="text-sm text-slate-500">
            School code: <strong>{profile.school_code}</strong>
          </span>
        )}
      </div>

      {profile.organization_description && (
        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">About</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
            {profile.organization_description}
          </p>
          {profile.contact_info && (
            <p className="mt-3 text-sm text-slate-500">
              Contact: {profile.contact_info}
            </p>
          )}
        </Card>
      )}

      <h2 className="text-xl font-bold text-slate-900 mb-4">
        {opportunities.length > 0 ? "Active & past listings" : "Listings"}
      </h2>
      <OpportunityList
        opportunities={opportunities}
        savedIds={new Set()}
        emptyMessage="This publisher has not posted any opportunities yet."
      />
    </>
  );
}
