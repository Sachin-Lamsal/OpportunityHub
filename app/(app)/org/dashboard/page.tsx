import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import PublisherOpportunityList from "@/components/opportunities/PublisherOpportunityList";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getProfile } from "@/lib/actions/auth";
import {
  getOpportunitiesCreatedByUser,
  getPublisherOpportunityStats,
} from "@/lib/queries/opportunities";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Organization dashboard",
};

export default async function OrgDashboardPage() {
  const profile = await getProfile();

  if (!profile || profile.account_type !== "organization") {
    redirect("/login/organization");
  }

  const [published, stats] = await Promise.all([
    getOpportunitiesCreatedByUser(profile.id, 10),
    getPublisherOpportunityStats(profile.id),
  ]);

  return (
    <>
      <PageHeader
        title={profile.organization_name ?? "Organization dashboard"}
        description="Publish and manage opportunities for students on OpportunityHub."
        action={
          <Button href="/org/participation" variant="outline" size="sm">
            Confirm participation
          </Button>
        }
      />

      <section className="mb-8 grid gap-4 sm:grid-cols-4">
        <Link href="/my-opportunities?status=draft" className="block transition-transform hover:-translate-y-0.5">
          <Card>
            <p className="text-sm text-slate-500">Drafts</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.draft}</p>
          </Card>
        </Link>
        <Link href="/my-opportunities?status=pending_review" className="block transition-transform hover:-translate-y-0.5">
          <Card>
            <p className="text-sm text-slate-500">Awaiting review</p>
            <p className="mt-1 text-3xl font-bold text-amber-700">{stats.pendingReview}</p>
          </Card>
        </Link>
        <Link href="/my-opportunities?status=published" className="block transition-transform hover:-translate-y-0.5">
          <Card>
            <p className="text-sm text-slate-500">Published</p>
            <p className="mt-1 text-3xl font-bold text-emerald-700">{stats.published}</p>
          </Card>
        </Link>
        <Link href="/my-opportunities?status=rejected" className="block transition-transform hover:-translate-y-0.5">
          <Card>
            <p className="text-sm text-slate-500">Needs changes</p>
            <p className="mt-1 text-3xl font-bold text-rose-700">{stats.needsAttention}</p>
          </Card>
        </Link>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Your opportunities
            </h2>
            <Link
              href="/my-opportunities"
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600"
            >
              Manage all ({stats.total})
            </Link>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              href="/opportunities/ingest"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              Import from web or document
            </Button>
            <Button
              href="/opportunities/new"
              size="sm"
              className="w-full sm:w-auto"
            >
              Add opportunity
            </Button>
          </div>
        </div>
        <PublisherOpportunityList
          opportunities={published}
          emptyMessage="You haven't published any opportunities yet. Create one to reach students across the platform."
        />
      </section>
    </>
  );
}
