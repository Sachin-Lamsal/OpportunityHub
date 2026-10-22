import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import PublisherOpportunityList from "@/components/opportunities/PublisherOpportunityList";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getProfile } from "@/lib/actions/auth";
import { getLinkedStudentsForSchool } from "@/lib/queries/school";
import {
  getOpportunitiesCreatedByUser,
  getPublisherOpportunityStats,
} from "@/lib/queries/opportunities";
import CopySchoolCodeButton from "@/components/school/CopySchoolCodeButton";
import { redirect } from "next/navigation";

export const metadata = {
  title: "School dashboard",
};

export default async function SchoolDashboardPage() {
  const profile = await getProfile();

  if (!profile || profile.account_type !== "school") {
    redirect("/login/school");
  }

  const [students, published, opportunityStats] = await Promise.all([
    getLinkedStudentsForSchool(),
    getOpportunitiesCreatedByUser(profile.id, 5),
    getPublisherOpportunityStats(profile.id),
  ]);

  const activeStudents = students.filter((s) => s.activity_count > 0).length;

  return (
    <>
      <PageHeader
        title={profile.organization_name ?? "School dashboard"}
        description="Monitor student progress and publish opportunities for your school community."
      />

      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-500">School code</p>
              {profile.school_code && (
                <CopySchoolCodeButton code={profile.school_code} />
              )}
            </div>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-slate-900">
              {profile.school_code ?? "—"}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Students enter this when signing up to link their account to your
              school. Manage invite-only rules in{" "}
              <Link href="/school/profile" className="font-medium text-indigo-600">
                Settings
              </Link>
              .
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-500">Linked students</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {students.length}
            </p>
            <Link
              href="/school/students"
              className="mt-2 inline-block text-sm font-medium text-indigo-600"
            >
              View all →
            </Link>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-500">
              Students with portfolio activity
            </p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {activeStudents}
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Based on activities logged in OpportunityHub.
            </p>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-4">
          <Link href="/my-opportunities?status=draft" className="block transition-transform hover:-translate-y-0.5">
            <Card>
              <p className="text-sm text-slate-500">Drafts</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{opportunityStats.draft}</p>
            </Card>
          </Link>
          <Link href="/my-opportunities?status=pending_review" className="block transition-transform hover:-translate-y-0.5">
            <Card>
              <p className="text-sm text-slate-500">Awaiting review</p>
              <p className="mt-1 text-3xl font-bold text-amber-700">{opportunityStats.pendingReview}</p>
            </Card>
          </Link>
          <Link href="/my-opportunities?status=published" className="block transition-transform hover:-translate-y-0.5">
            <Card>
              <p className="text-sm text-slate-500">Published</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">{opportunityStats.published}</p>
            </Card>
          </Link>
          <Link href="/my-opportunities?status=rejected" className="block transition-transform hover:-translate-y-0.5">
            <Card>
              <p className="text-sm text-slate-500">Needs changes</p>
              <p className="mt-1 text-3xl font-bold text-rose-700">{opportunityStats.needsAttention}</p>
            </Card>
          </Link>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Your listings (drafts, in review and published)
              </h2>
              <Link
                href="/my-opportunities"
                className="text-xs font-semibold text-slate-600 hover:text-indigo-600"
              >
                Manage all ({opportunityStats.total}) →
              </Link>
            </div>
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
            emptyMessage="You haven't published any opportunities yet. Add one for your students to discover."
          />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Student snapshot
            </h2>
            <Link
              href="/school/students"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Full list
            </Link>
          </div>
          {students.length === 0 ? (
            <Card className="py-8 text-center text-sm text-slate-600">
              No linked students yet. Share your school code when students sign
              up.
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Level</th>
                    <th className="px-4 py-3 font-medium">Activities</th>
                    <th className="px-4 py-3 font-medium">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.slice(0, 5).map((student) => (
                    <tr key={student.id}>
                      <td className="px-4 py-3 text-slate-900">
                        <Link
                          href={`/school/students/${student.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {student.email}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {student.education_level ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {student.activity_count}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {student.last_activity_date ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
