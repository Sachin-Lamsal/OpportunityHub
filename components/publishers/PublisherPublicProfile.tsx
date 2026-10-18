import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import OpportunityList from "@/components/opportunities/OpportunityList";
import FollowPublisherButton from "@/components/publishers/FollowPublisherButton";
import { Card } from "@/components/ui/Card";
import type { Opportunity } from "@/lib/types";
import type { PublicPublisherProfile } from "@/lib/queries/publishers";
import { sanitizeRegistrationUrl } from "@/lib/utils/url";

interface PublisherPublicProfileProps {
  profile: PublicPublisherProfile;
  opportunities: Opportunity[];
  followerCount: number;
  isFollowing: boolean;
  currentUserId: string | null;
  /** Opportunities the viewer already saved, so their Save buttons are honest. */
  savedIds: Set<string>;
}

export default function PublisherPublicProfileView({
  profile,
  opportunities,
  followerCount,
  isFollowing,
  currentUserId,
  savedIds,
}: PublisherPublicProfileProps) {
  const isSchool = profile.account_type === "school";
  const displayName =
    profile.organization_name ||
    (isSchool ? "School" : "Organization");

  const websiteUrl = sanitizeRegistrationUrl(profile.website_url);
  const socialLinks = Object.entries(profile.social_links ?? {}).filter(
    ([, value]) => Boolean(sanitizeRegistrationUrl(value)),
  );
  const currentOpportunities = opportunities.filter(
    (opportunity) => opportunity.lifecycle_status === "published",
  );
  const previousOpportunities = opportunities.filter(
    (opportunity) =>
      opportunity.lifecycle_status === "expired" ||
      opportunity.lifecycle_status === "archived",
  );
  const verification = profile.publisher_verification_status ?? "unverified";

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
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            verification === "verified"
              ? "bg-emerald-50 text-emerald-800"
              : verification === "pending"
                ? "bg-amber-50 text-amber-800"
                : verification === "rejected"
                  ? "bg-rose-50 text-rose-800"
                  : "bg-slate-100 text-slate-700"
          }`}
        >
          {verification === "verified"
            ? "Publisher verified"
            : verification === "pending"
              ? "Publisher verification pending"
              : "Publisher not verified"}
        </span>
        <span className="text-sm text-slate-600">
          {followerCount} follower{followerCount === 1 ? "" : "s"}
        </span>
        {isSchool && profile.school_code && (
          <span className="text-sm text-slate-500">
            School code: <strong>{profile.school_code}</strong>
          </span>
        )}
      </div>

      {(profile.organization_description || profile.contact_info || websiteUrl || socialLinks.length > 0) && (
        <Card className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900">About</h2>
          {profile.organization_description ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
              {profile.organization_description}
            </p>
          ) : null}
          {profile.contact_info && (
            <p className="mt-3 text-sm text-slate-500">
              Contact: {profile.contact_info}
            </p>
          )}
          {websiteUrl || socialLinks.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              {websiteUrl ? (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Official website ↗
                </a>
              ) : null}
              {socialLinks.map(([name, url]) => {
                const safeUrl = sanitizeRegistrationUrl(url);
                if (!safeUrl) return null;
                return (
                  <a
                    key={name}
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {name} ↗
                  </a>
                );
              })}
            </div>
          ) : null}
        </Card>
      )}

      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-900">Current opportunities</h2>
          <OpportunityList
            opportunities={currentOpportunities}
            savedIds={savedIds}
            emptyMessage="This publisher has no current opportunities."
          />
        </section>
        {previousOpportunities.length > 0 ? (
          <section>
            <h2 className="mb-4 text-xl font-bold text-slate-900">Previous opportunities</h2>
            <OpportunityList opportunities={previousOpportunities} savedIds={savedIds} />
          </section>
        ) : null}
      </div>
    </>
  );
}
