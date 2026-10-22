import Link from "next/link";
import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import PublisherOpportunityList from "@/components/opportunities/PublisherOpportunityList";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getProfile } from "@/lib/actions/auth";
import { canManageOpportunities } from "@/lib/auth/account";
import {
  getOpportunitiesCreatedByUser,
  getPublisherOpportunityStats,
} from "@/lib/queries/opportunities";

export const metadata = {
  title: "My Opportunities",
};

interface MyOpportunitiesPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function MyOpportunitiesPage({
  searchParams,
}: MyOpportunitiesPageProps) {
  const profile = await getProfile();

  if (!profile || !canManageOpportunities(profile.account_type)) {
    redirect("/login");
  }

  const { status: rawStatus } = await searchParams;
  const currentStatus = rawStatus?.trim() || "all";

  const [stats, opportunities] = await Promise.all([
    getPublisherOpportunityStats(profile.id),
    getOpportunitiesCreatedByUser(
      profile.id,
      100,
      currentStatus === "all" ? undefined : currentStatus,
    ),
  ]);

  const tabs = [
    { key: "all", label: "All Submissions", count: stats.total },
    { key: "published", label: "Published & Live", count: stats.published },
    { key: "pending_review", label: "Awaiting Verification", count: stats.pendingReview },
    { key: "draft", label: "Drafts", count: stats.draft },
    { key: "rejected", label: "Needs Changes", count: stats.needsAttention },
  ];

  return (
    <>
      <PageHeader
        title="My Opportunities"
        description="Track your submissions, monitor admin verification status, and spawn new editions for recurring programs."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button href="/opportunities/ingest" variant="outline" size="sm">
              ⚡ Web / OCR Ingest
            </Button>
            <Button href="/opportunities/new" size="sm">
              + Add opportunity
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Submissions
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
              Published & Live
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.published}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
              Awaiting Verification
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{stats.pendingReview}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Drafts
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{stats.draft}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-rose-600">
              Needs Changes
            </p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{stats.needsAttention}</p>
          </Card>
        </div>

        {/* Recurring Opportunity Guidance Box */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-white p-5 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-indigo-950 flex items-center gap-2">
                <span>🔄</span> Managing Recurring Programs & Annual Editions
              </p>
              <p className="mt-1 text-xs text-indigo-800 leading-relaxed max-w-2xl">
                Does your program, competition, or conference run annually? Click <strong>+ New edition</strong> on any opportunity card below to create the next instance. Basic info is cloned automatically. All new edition suggestions await administrator verification before appearing publicly.
              </p>
            </div>
            <div className="shrink-0">
              <Button href="/opportunities/new" size="sm" variant="outline">
                Submit New Instance
              </Button>
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-3">
          {tabs.map((tab) => {
            const isActive = currentStatus === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.key === "all" ? "/my-opportunities" : `/my-opportunities?status=${tab.key}`}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Opportunities List */}
        <PublisherOpportunityList
          opportunities={opportunities}
          emptyMessage={
            currentStatus === "pending_review"
              ? "You don't have any opportunities currently awaiting verification."
              : currentStatus === "published"
                ? "You haven't had any opportunities published live yet."
                : currentStatus === "draft"
                  ? "You don't have any saved drafts."
                  : currentStatus === "rejected"
                    ? "None of your submissions currently require changes."
                    : "You haven't added any opportunities yet. Share your first one to reach students across the platform!"
          }
        />
      </div>
    </>
  );
}
