import Link from "next/link";
import { Card } from "@/components/ui/Card";
import PublisherListingReviewActions from "@/components/admin/PublisherListingReviewActions";
import PublisherProfileReviewActions from "@/components/admin/PublisherProfileReviewActions";
import {
  getPendingPublisherListings,
  getPendingPublisherProfiles,
} from "@/lib/queries/publisher-review";
import { sanitizeRegistrationUrl } from "@/lib/utils/url";

export const metadata = { title: "Publisher review" };

export default async function PublisherReviewPage() {
  const [listings, profiles] = await Promise.all([
    getPendingPublisherListings(),
    getPendingPublisherProfiles(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <Link href="/admin/dashboard" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Admin dashboard
        </Link>
        <h2 className="mt-3 text-3xl font-bold text-slate-900">Publisher review</h2>
        <p className="mt-2 text-slate-600">
          Review organization and school identities separately from the opportunities they submit.
        </p>
      </div>

      <section>
        <h3 className="mb-4 text-xl font-semibold text-slate-900">
          Publisher verification requests ({profiles.length})
        </h3>
        <div className="space-y-4">
          {profiles.map((profile) => {
            const website = sanitizeRegistrationUrl(profile.website_url);
            return (
              <Card key={profile.id} className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-900">
                      {profile.organization_name || "Unnamed publisher"}
                    </h4>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {profile.account_type}
                    </span>
                  </div>
                  {profile.organization_description ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {profile.organization_description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    {profile.contact_info ? <span>Contact: {profile.contact_info}</span> : null}
                    {website ? (
                      <a href={website} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600">
                        Official website ↗
                      </a>
                    ) : null}
                  </div>
                </div>
                <PublisherProfileReviewActions publisherId={profile.id} />
              </Card>
            );
          })}
          {profiles.length === 0 ? <Card className="text-sm text-slate-600">No publisher profiles are awaiting review.</Card> : null}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-xl font-semibold text-slate-900">
          Submitted opportunities ({listings.length})
        </h3>
        <div className="space-y-4">
          {listings.map((listing) => {
            const source = sanitizeRegistrationUrl(listing.source_url ?? listing.registration_link);
            return (
              <Card key={listing.id} className="space-y-4">
                <div>
                  <h4 className="font-semibold text-slate-900">{listing.title}</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    {listing.organizer || "Unknown publisher"} · {listing.type}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{listing.description}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    {listing.deadline ? <span>Deadline: {listing.deadline}</span> : null}
                    {listing.grade_requirements ? <span>Eligibility: {listing.grade_requirements}</span> : null}
                    {source ? (
                      <a href={source} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-600">
                        Official source ↗
                      </a>
                    ) : null}
                  </div>
                </div>
                <PublisherListingReviewActions opportunityId={listing.id} />
              </Card>
            );
          })}
          {listings.length === 0 ? <Card className="text-sm text-slate-600">No publisher opportunities are awaiting review.</Card> : null}
        </div>
      </section>
    </div>
  );
}
