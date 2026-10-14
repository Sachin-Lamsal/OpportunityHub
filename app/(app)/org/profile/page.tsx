import PageHeader from "@/components/layout/PageHeader";
import OrganizationProfileForm from "@/components/auth/OrganizationProfileForm";
import { getProfile } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Organization settings",
};

export default async function OrgProfilePage() {
  const profile = await getProfile();

  if (!profile || profile.account_type !== "organization") {
    redirect("/login/organization");
  }

  return (
    <>
      <PageHeader
        title="Organization settings"
        description="Update how your organization appears on published opportunities."
      />
      <OrganizationProfileForm profile={profile} />
    </>
  );
}
