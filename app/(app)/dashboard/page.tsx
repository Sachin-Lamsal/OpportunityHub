import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import OpportunityList from "@/components/opportunities/OpportunityList";
import PortfolioScoreSummary from "@/components/portfolio/PortfolioScoreSummary";
import ActivityList from "@/components/portfolio/ActivityList";
import AISuggestionsPanel from "@/components/ai/AISuggestionsPanel";
import { Card } from "@/components/ui/Card";
import {
  getOpportunities,
  getSavedOpportunities,
  getSavedOpportunityIds,
  getOpportunitiesCreatedByUser,
} from "@/lib/queries/opportunities";
import PublisherOpportunityList from "@/components/opportunities/PublisherOpportunityList";
import { getActivities, getRecentActivities } from "@/lib/queries/activities";
import { calculatePortfolioScores, getWeakestCategories } from "@/lib/portfolio/score";
import { getProfile } from "@/lib/actions/auth";
import Button from "@/components/ui/Button";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const [
    latestOpportunities,
    savedOpportunities,
    savedIds,
    profile,
    activities,
    recentActivities,
  ] = await Promise.all([
    getOpportunities({ limit: 3 }),
    getSavedOpportunities(),
    getSavedOpportunityIds(),
    getProfile(),
    getActivities(),
    getRecentActivities(3),
  ]);

  const scores = calculatePortfolioScores(activities);
  const weakCategories = getWeakestCategories(scores);
  const myCreatedOpportunities = profile?.id
    ? await getOpportunitiesCreatedByUser(profile.id, 5)
    : [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          profile?.dream_universities
            ? `Working toward ${profile.dream_universities} — here's your overview.`
            : "Your overview of opportunities, portfolio progress, and next steps."
        }
      />

      <div className="space-y-8">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              1. Latest opportunities
            </h2>
            <Link
              href="/opportunities"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all
            </Link>
          </div>
          <OpportunityList
            opportunities={latestOpportunities}
            savedIds={savedIds}
            compact
            emptyMessage="No opportunities yet. Complete the database setup in supabase/README.md."
            showViewAll
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            2. How to get there
          </h2>
          <Card>
            <p className="text-sm text-slate-600">
              {profile?.education_level
                ? `As a ${profile.education_level} student, focus on building a balanced portfolio — mix academics, leadership, and service.`
                : "Complete your profile to get personalised guidance."}
              {weakCategories.length > 0 && scores.totalActivities > 0
                ? ` Your portfolio could be stronger in: ${weakCategories.join(" and ")}.`
                : scores.totalActivities === 0
                  ? " Add your first activity to start tracking your progress."
                  : " Keep adding activities across different categories."}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/portfolio/add"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Add activity →
              </Link>
              <Link
                href="/profile"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Update profile →
              </Link>
            </div>
          </Card>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              3. Portfolio score
            </h2>
            <Link
              href="/portfolio"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              View portfolio
            </Link>
          </div>
          <PortfolioScoreSummary scores={scores} compact />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              4. AI Advisor & Guidance
            </h2>
            <Link
              href="/ai-suggestions"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Talk to Advisor →
            </Link>
          </div>
          <AISuggestionsPanel compact />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              5. Saved opportunities
            </h2>
            {savedOpportunities.length > 0 && (
              <Link
                href="/opportunities"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Browse more
              </Link>
            )}
          </div>
          <OpportunityList
            opportunities={savedOpportunities.slice(0, 3)}
            savedIds={savedIds}
            compact
            emptyMessage="You haven't saved any opportunities yet. Browse the feed and click Save on ones you like."
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              6. Recent activities
            </h2>
            {recentActivities.length > 0 && (
              <Link
                href="/portfolio"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                View all
              </Link>
            )}
          </div>
          {recentActivities.length > 0 ? (
            <ActivityList activities={recentActivities} showDelete={false} />
          ) : (
            <Card className="text-center py-8">
              <p className="text-sm text-slate-600">
                No activities logged yet.
              </p>
              <div className="mt-3">
                <Button href="/portfolio/add" size="sm">
                  Add your first activity
                </Button>
              </div>
            </Card>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              7. Opportunities you shared
            </h2>
            <Link
              href="/opportunities/new"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              + Add opportunity
            </Link>
          </div>
          {myCreatedOpportunities.length > 0 ? (
            <PublisherOpportunityList
              opportunities={myCreatedOpportunities}
              emptyMessage="You haven't shared any opportunities yet."
            />
          ) : (
            <Card className="py-8 text-center">
              <p className="text-sm text-slate-600">
                Know about a competition, workshop, or program? Share it with students across Kathmandu!
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button href="/opportunities/new" size="sm">
                  Add an opportunity
                </Button>
                <Button href="/opportunities/ingest" variant="outline" size="sm">
                  AI Link / Poster Ingest
                </Button>
              </div>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
