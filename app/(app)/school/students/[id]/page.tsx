import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import ActivityList from "@/components/portfolio/ActivityList";
import PortfolioScoreSummary from "@/components/portfolio/PortfolioScoreSummary";
import { Card } from "@/components/ui/Card";
import { getLinkedStudentForSchool } from "@/lib/queries/school";
import { getActivitiesForUser } from "@/lib/queries/activities";
import { calculatePortfolioScores, getWeakestCategories } from "@/lib/portfolio/score";
import { getProfile } from "@/lib/actions/auth";

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: StudentDetailPageProps) {
  const { id } = await params;
  const student = await getLinkedStudentForSchool(id);
  return {
    title: student ? `${student.email} · Student` : "Student",
  };
}

export default async function SchoolStudentDetailPage({
  params,
}: StudentDetailPageProps) {
  const profile = await getProfile();

  if (!profile || profile.account_type !== "school") {
    notFound();
  }

  const { id } = await params;
  const student = await getLinkedStudentForSchool(id);

  if (!student) {
    notFound();
  }

  const activities = await getActivitiesForUser(student.id);
  const scores = calculatePortfolioScores(activities);
  const weakCategories = getWeakestCategories(scores);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "School dashboard", href: "/school/dashboard" },
          { label: "Students", href: "/school/students" },
          { label: student.email },
        ]}
      />
      <PageHeader
        title={student.email}
        description="Portfolio progress for a student linked to your school."
        action={
          <Link
            href="/school/students"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← All students
          </Link>
        }
      />

      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <p className="text-sm font-medium text-slate-500">Education level</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {student.education_level ?? "Not set"}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-500">Dream university</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {student.dream_universities ?? "Not set"}
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-500">Activities logged</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {scores.totalActivities}
            </p>
          </Card>
        </section>

        {(student.interests || student.career_interests || student.subjects) && (
          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Profile notes
            </h2>
            <dl className="mt-3 space-y-2 text-sm text-slate-700">
              {student.subjects ? (
                <div>
                  <dt className="font-medium text-slate-900">Subjects</dt>
                  <dd>{student.subjects}</dd>
                </div>
              ) : null}
              {student.interests ? (
                <div>
                  <dt className="font-medium text-slate-900">Interests</dt>
                  <dd>{student.interests}</dd>
                </div>
              ) : null}
              {student.career_interests ? (
                <div>
                  <dt className="font-medium text-slate-900">Career interests</dt>
                  <dd>{student.career_interests}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        )}

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Portfolio score
          </h2>
          {scores.totalActivities === 0 ? (
            <Card className="py-8 text-center text-sm text-slate-600">
              This student has not logged any activities yet.
            </Card>
          ) : (
            <>
              {weakCategories.length > 0 ? (
                <p className="mb-3 text-sm text-slate-600">
                  Could be stronger in: {weakCategories.join(", ")}.
                </p>
              ) : null}
              <PortfolioScoreSummary scores={scores} />
            </>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Activities
          </h2>
          {activities.length > 0 ? (
            <ActivityList activities={activities} showDelete={false} />
          ) : (
            <Card className="py-8 text-center text-sm text-slate-600">
              No activities to show.
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
