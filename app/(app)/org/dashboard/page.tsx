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
      />

      <section className="mb-8 grid gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Drafts</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{stats.draft}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Awaiting review</p>
          <p className="mt-1 text-3xl font-bold text-amber-700">{stats.pendingReview}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Published</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{stats.published}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Needs changes</p>
          <p className="mt-1 text-3xl font-bold text-rose-700">{stats.needsAttention}</p>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your opportunities
          </h2>
          <div className="flex items-center gap-2">
            <Button href="/opportunities/ingest" variant="outline" size="sm">
              ⚡ Web / OCR Ingest
            </Button>
            <Button href="/opportunities/new" size="sm">
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
