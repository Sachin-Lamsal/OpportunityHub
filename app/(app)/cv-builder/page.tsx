import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import CVBuilderClient from "@/components/cv/CVBuilderClient";
import { buildCVFromProfile } from "@/lib/cv/generate";
import { getProfile } from "@/lib/actions/auth";
import { getActivities } from "@/lib/queries/activities";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export const metadata = {
  title: "CV Builder",
};

export default async function CVBuilderPage() {
  const [profile, activities] = await Promise.all([
    getProfile(),
    getActivities(),
  ]);

  if (!profile) {
    redirect("/login");
  }

  const cv = buildCVFromProfile(profile, activities);

  return (
    <>
      <PageHeader
        title="CV Builder"
        description="Generate a CV from your profile and stored activities."
      />

      {activities.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-slate-600">
            Add some activities to your portfolio first, then come back to build
            your CV.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button href="/portfolio/add" size="sm">
              Add activity
            </Button>
            <Button href="/portfolio" variant="outline" size="sm">
              View portfolio
            </Button>
          </div>
        </Card>
      ) : (
        <CVBuilderClient cv={cv} hasActivities={activities.length > 0} />
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Tip: Copy your CV and paste into Google Docs or Word to format further.{" "}
        <Link href="/profile" className="text-indigo-600 hover:text-indigo-700">
          Update profile
        </Link>{" "}
        to improve the header section.
      </p>
    </>
  );
}
