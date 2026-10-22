import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { getProfile } from "@/lib/actions/auth";
import { getLinkedStudentsForSchool } from "@/lib/queries/school";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Students",
};

export default async function SchoolStudentsPage() {
  const profile = await getProfile();

  if (!profile || profile.account_type !== "school") {
    redirect("/login/school");
  }

  const students = await getLinkedStudentsForSchool();

  return (
    <>
      <PageHeader
        title="Linked students"
        description={`Students who joined with school code ${profile.school_code ?? ""}.`}
      />

      {students.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-slate-600">
            No students have linked to your school yet. Share your school code
            from the dashboard when they create a student account.
          </p>
        </Card>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500 sm:hidden">
            Swipe sideways to see every student detail.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-[44rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Education level</th>
                  <th className="px-4 py-3 font-medium">Dream university</th>
                  <th className="px-4 py-3 font-medium">Activities logged</th>
                  <th className="px-4 py-3 font-medium">Last activity</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link
                        href={`/school/students/${student.id}`}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        {student.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {student.education_level ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {student.dream_universities ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {student.activity_count}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {student.last_activity_date ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/school/students/${student.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
