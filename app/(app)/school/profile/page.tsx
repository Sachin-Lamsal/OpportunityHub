import PageHeader from "@/components/layout/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import OrganizationProfileForm from "@/components/auth/OrganizationProfileForm";
import SchoolInvitePanel from "@/components/school/SchoolInvitePanel";
import { getProfile } from "@/lib/actions/auth";
import { getSchoolInviteCodes } from "@/lib/queries/school-invites";
import { redirect } from "next/navigation";

export const metadata = {
  title: "School settings",
};

export default async function SchoolProfilePage() {
  const profile = await getProfile();

  if (!profile || profile.account_type !== "school") {
    redirect("/login/school");
  }

  const invites = await getSchoolInviteCodes();

  return (
    <>
      <Breadcrumbs
        items={[{ label: "School dashboard", href: "/school/dashboard" }, { label: "Settings" }]}
      />
      <PageHeader
        title="School settings"
        description="Update your school profile, registration rules, and student invites."
      />
      <div className="space-y-6">
        <OrganizationProfileForm profile={profile} />
        <SchoolInvitePanel invites={invites} />
      </div>
    </>
  );
}
