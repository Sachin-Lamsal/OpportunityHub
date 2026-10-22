import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getOpportunityById,
  getSavedOpportunityInfo,
} from "@/lib/queries/opportunities";
import { formatDate } from "@/lib/utils/format";
import PageHeader from "@/components/layout/PageHeader";
import SaveOpportunityButton from "@/components/opportunities/SaveOpportunityButton";
import OpportunityTimeline from "@/components/opportunities/OpportunityTimeline";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getProfile } from "@/lib/actions/auth";
import { sanitizeRegistrationUrl } from "@/lib/utils/url";
import VerificationBadge from "@/components/opportunities/VerificationBadge";
import OpportunityLifecycleBadge from "@/components/opportunities/OpportunityLifecycleBadge";
import CommunitySection from "@/components/community/CommunitySection";
import OpportunityEditionsPanel from "@/components/opportunities/OpportunityEditionsPanel";
import {
  getOpportunityComments,
  getOpportunityReviews,
} from "@/lib/queries/community";
import {
  getPublicPublisherProfile,
  getRelatedEditions,
  publisherPublicPath,
} from "@/lib/queries/publishers";

interface OpportunityDetailPageProps {
  params: Promise<{ id: string }>;
}

function DetailSection({
  title,
  content,
  badge,
}: {
  title: string;
  content: string | null | undefined;
  badge?: string;
}) {
  if (!content?.trim()) return null;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              badge.includes("Official")
                ? "bg-emerald-100 text-emerald-800"
                : badge.includes("Community")
                  ? "bg-amber-100 text-amber-900"
                  : "bg-violet-100 text-violet-800"
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
        {content}
      </div>
    </Card>
  );
}

export async function generateMetadata({ params }: OpportunityDetailPageProps) {
  const { id } = await params;
  const opportunity = await getOpportunityById(id);

  return {
    title: opportunity?.title ?? "Opportunity",
  };
}

export default async function OpportunityDetailPage({
  params,
}: OpportunityDetailPageProps) {
  const { id } = await params;
  const opportunity = await getOpportunityById(id);

  if (!opportunity) {
    notFound();
  }

  const [savedInfo, profile, comments, reviews, editions] = await Promise.all([
    getSavedOpportunityInfo(id),
    getProfile(),
    getOpportunityComments(id),
    getOpportunityReviews(id),
    getRelatedEditions(opportunity),
  ]);

  const publisherProfile = opportunity.created_by
    ? await getPublicPublisherProfile(opportunity.created_by)
    : null;

  const isCreator = Boolean(
    profile && opportunity.created_by && opportunity.created_by === profile.id,
  );
  const safeRegistrationLink = sanitizeRegistrationUrl(
    opportunity.registration_link,
  );
  const safeSourceUrl = sanitizeRegistrationUrl(opportunity.source_url);

  const detailRows = [
    { label: "Organizer", value: opportunity.organizer },
    { label: "Location", value: opportunity.location },
    {
      label: "Format",
      value: opportunity.is_online ? "Online" : "In person",
    },
    { label: "Category", value: opportunity.type },
    { label: "Subject area", value: opportunity.subject_area },
    { label: "Cost", value: opportunity.cost },
    { label: "Time commitment", value: opportunity.time_commitment },
    { label: "Skills gained", value: opportunity.skills_gained },
    { label: "Difficulty", value: opportunity.difficulty_level },
    { label: "Contact", value: opportunity.contact_info },
  ].filter((row) => row.value);

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

      {!profile && (
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-semibold text-indigo-950">
              Exploring as a guest
            </p>
            <p className="text-xs text-indigo-700 mt-0.5">
              Sign in to save this opportunity to your tracker, calculate portfolio scores, and chat with the AI Advisor.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              href={`/login/student?next=${encodeURIComponent(`/opportunities/${opportunity.id}`)}`}
              size="sm"
              variant="outline"
            >
              Log in
            </Button>
            <Button href="/signup/student" size="sm">
              Sign up
            </Button>
          </div>
        </div>
      )}

      {!opportunity.is_verified && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-xs">
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">⚠️</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-amber-950">
                  Internet Source — Not Yet Verified
                </h3>
                <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  Source: {opportunity.source_type || "web"}
                </span>
              </div>
              <p className="mt-1 text-xs text-amber-900/90 leading-relaxed">
                This opportunity was automatically extracted from the web. Dates, deadlines, eligibility criteria, or fees may have changed. Always verify details on the organizer&apos;s official website before applying.
              </p>
              {safeSourceUrl && (
                <div className="mt-2.5">
                  <a
                    href={safeSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-950 underline hover:text-amber-800"
                  >
                    <span>View original source page</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isCreator && opportunity.lifecycle_status !== "published" && (
        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div>
            <p className="font-semibold text-indigo-950">Listing status</p>
            <p className="text-xs text-indigo-700 mt-0.5">
              {opportunity.lifecycle_status === "pending_review"
                ? "An administrator is reviewing this listing. It will become public after approval."
                : opportunity.lifecycle_status === "rejected"
                  ? "Update the details using the reviewer note, then submit the listing for review again."
                  : "This listing is private until you submit it for review and an administrator approves it."}
            </p>
          </div>
          <OpportunityLifecycleBadge status={opportunity.lifecycle_status} />
        </div>
      )}

      <PageHeader
        title={opportunity.title}
        description={opportunity.organizer ?? undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {profile?.account_type === "student" && (
              <Button
                href={`/portfolio/add?opportunityId=${opportunity.id}`}
                variant="outline"
                size="sm"
                title="Log this completed activity in your student portfolio"
              >
                + Add to Portfolio
              </Button>
            )}
            {isCreator && (
              <Button
                href={`/opportunities/${opportunity.id}/edit`}
                variant="outline"
                size="sm"
              >
                Edit opportunity
              </Button>
            )}
            <SaveOpportunityButton
              key={`${savedInfo.saved}-${savedInfo.remindDeadline}`}
              opportunityId={opportunity.id}
              initialSaved={savedInfo.saved}
              initialRemindDeadline={savedInfo.remindDeadline}
              showReminderToggle={true}
              hasDeadline={Boolean(opportunity.deadline)}
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {isCreator ? <OpportunityLifecycleBadge status={opportunity.lifecycle_status} /> : null}
        <VerificationBadge
          isVerified={opportunity.is_verified}
          status={opportunity.verification_status}
        />
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
          {opportunity.type}
        </span>
        {opportunity.subject_area && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {opportunity.subject_area}
          </span>
        )}
        {opportunity.difficulty_level && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
            {opportunity.difficulty_level}
          </span>
        )}
        {opportunity.tags?.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-50 px-3 py-1 text-sm text-slate-500"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {publisherProfile && (
            <Card className="border-slate-200 bg-slate-50/50">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Published by
              </p>
              <Link
                href={publisherPublicPath({
                  id: publisherProfile.id,
                  account_type: publisherProfile.account_type,
                })}
                className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-800"
              >
                {publisherProfile.organization_name ?? "View publisher profile"}
                <span aria-hidden="true">→</span>
              </Link>
            </Card>
          )}

          {opportunity.ai_summary && (
            <Card className="border-indigo-100">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800">
                  AI-generated
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {opportunity.ai_summary}
              </p>
            </Card>
          )}

          <DetailSection title="Description" content={opportunity.description} />

          <DetailSection
            title="Prep resources"
            content={opportunity.prep_resources}
            badge={opportunity.prep_resources ? "AI-generated" : undefined}
          />

          <DetailSection
            title="How to apply"
            content={opportunity.application_steps}
            badge={opportunity.application_steps ? "AI-generated" : undefined}
          />

          <DetailSection
            title="Eligibility"
            content={
              opportunity.eligibility_details ?? opportunity.grade_requirements
            }
            badge={
              opportunity.eligibility_details || opportunity.grade_requirements
                ? opportunity.is_verified
                  ? "Official / verified"
                  : "Community or scraped"
                : undefined
            }
          />

          <DetailSection
            title="Portfolio tips"
            content={opportunity.portfolio_tips}
            badge={opportunity.portfolio_tips ? "AI-generated" : undefined}
          />

          <CommunitySection
            opportunityId={opportunity.id}
            initialComments={comments}
            initialReviews={reviews}
            currentProfile={profile}
          />
        </div>

        <div className="space-y-6">
          <OpportunityEditionsPanel current={opportunity} editions={editions} />
          <OpportunityTimeline opportunity={opportunity} />

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Quick facts</h2>
            <dl className="mt-4 space-y-3">
              {detailRows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {row.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-slate-800">{row.value}</dd>
                </div>
              ))}
              {opportunity.deadline && (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Deadline
                  </dt>
                  <dd className="mt-0.5 text-sm text-slate-800">
                    {formatDate(opportunity.deadline)}
                  </dd>
                </div>
              )}
            </dl>

            {safeRegistrationLink && (
              <div className="mt-6">
                <a
                  href={safeRegistrationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                >
                  Register / Official page
                </a>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
