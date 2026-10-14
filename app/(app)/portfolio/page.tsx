import PageHeader from "@/components/layout/PageHeader";
import PortfolioScoreSummary from "@/components/portfolio/PortfolioScoreSummary";
import ActivityList from "@/components/portfolio/ActivityList";
import { getActivities } from "@/lib/queries/activities";
import { calculatePortfolioScores } from "@/lib/portfolio/score";
import Button from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";

export const metadata = {
  title: "Portfolio",
};

export default async function PortfolioPage() {
  const activities = await getActivities();
  const scores = calculatePortfolioScores(activities);

  const recentAdditions = [...activities]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, 3);

  const activitiesByCategory = scores.categories.map((cat) => ({
    ...cat,
    items: activities.filter((a) => a.category === cat.category),
  }));

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Track your activities and see your portfolio strength."
        action={
          <Button href="/portfolio/add" size="sm">
            + Add activity
          </Button>
        }
      />

      <div className="space-y-8">
        <PortfolioScoreSummary scores={scores} />

        {recentAdditions.length > 0 && (
          <section>
            <CardHeader title="Recent additions" />
            <ActivityList activities={recentAdditions} showDelete={false} />
          </section>
        )}

        <section>
          <CardHeader
            title="By category"
            description="Activities grouped by portfolio category."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activitiesByCategory.map(({ category, activityCount, score, items }) => (
              <Card key={category}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{category}</h3>
                  <span className="text-sm font-medium text-indigo-600">
                    {score}/100
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {activityCount} activit{activityCount === 1 ? "y" : "ies"}
                </p>
                {items.length > 0 ? (
                  <ul className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {items.slice(0, 3).map((item) => (
                      <li key={item.id} className="text-sm text-slate-700">
                        {item.title}
                      </li>
                    ))}
                    {items.length > 3 && (
                      <li className="text-xs text-slate-500">
                        +{items.length - 3} more
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">No activities yet</p>
                )}
              </Card>
            ))}
          </div>
        </section>

        <section>
          <CardHeader title="All activities" />
          <ActivityList
            activities={activities}
            emptyMessage="You haven't added any activities yet. Start building your portfolio!"
            showAddButton
          />
        </section>
      </div>
    </>
  );
}
