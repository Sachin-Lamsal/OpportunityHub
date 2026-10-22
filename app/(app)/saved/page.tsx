import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import OpportunityList from "@/components/opportunities/OpportunityList";
import { EmptyState } from "@/components/ui/States";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  getSavedOpportunities,
  getSavedOpportunityIds,
} from "@/lib/queries/opportunities";
import { isDeadlinePast, sortByDeadline } from "@/lib/opportunities/deadline";
import { isPublicLifecycleStatus } from "@/lib/opportunities/workflow";

export const metadata = {
  title: "Saved opportunities",
};

export default async function SavedOpportunitiesPage() {
  const [saved, savedIds] = await Promise.all([
    getSavedOpportunities(),
    getSavedOpportunityIds(),
  ]);

  // A saved listing can be archived or cancelled by its publisher after the
  // student saved it. Those are no longer actionable, so they are moved out of
  // the way instead of being presented as if the student could still apply.
  // A missing lifecycle status means the row predates the column and is
  // treated as live, so a saved item never disappears silently.
  const isLive = (row: (typeof saved)[number]) =>
    isPublicLifecycleStatus(row.lifecycle_status ?? "published");

  const active = saved.filter(isLive);
  const inactive = saved.filter((row) => !isLive(row));

  const closingSoon = sortByDeadline(
    active.filter((row) => !isDeadlinePast(row.deadline)),
  );
  const closed = sortByDeadline(active.filter((row) => isDeadlinePast(row.deadline)));

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Saved" }]}
      />
      <PageHeader
        title="Saved opportunities"
        description={
          saved.length > 0
            ? `${saved.length} ${
                saved.length === 1 ? "opportunity" : "opportunities"
              } you saved. Closing soonest first.`
            : "Keep track of the opportunities you are interested in."
        }
      />

      {saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          description="Browse opportunities and press Save on the ones you like. They will show up here so you can compare them and keep an eye on their deadlines."
          action={
            <Button href="/opportunities" size="sm">
              Browse opportunities
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          {closingSoon.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Still open ({closingSoon.length})
              </h2>
              <OpportunityList
                opportunities={closingSoon}
                savedIds={savedIds}
                linkQuery="from=saved"
              />
            </section>
          )}

          {closed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Deadline passed ({closed.length})
              </h2>
              <p className="mb-3 text-sm text-slate-600">
                These deadlines have passed, so applications are closed. Keep
                them for reference — similar opportunities are posted every week.
              </p>
              <OpportunityList
                opportunities={closed}
                savedIds={savedIds}
                linkQuery="from=saved"
              />
            </section>
          )}

          {inactive.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                No longer available ({inactive.length})
              </h2>
              <Card className="py-6 text-center text-sm text-slate-600">
                <p>
                  {inactive.length} saved opportunit
                  {inactive.length === 1 ? "y is" : "ies are"} no longer
                  published by the organizer.
                </p>
                <div className="mt-4">
                  <Button href="/opportunities" variant="outline" size="sm">
                    Find similar opportunities
                  </Button>
                </div>
              </Card>
            </section>
          )}

          <p className="text-sm text-slate-500">
            Looking for more?{" "}
            <Link
              href="/opportunities"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Browse all opportunities
            </Link>
            .
          </p>
        </div>
      )}
    </>
  );
}
