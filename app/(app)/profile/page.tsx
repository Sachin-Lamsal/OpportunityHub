import PageHeader from "@/components/layout/PageHeader";
import ProfileForm from "@/components/auth/ProfileForm";
import { getProfile } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your account and personal details."
      />
      <ProfileForm profile={profile} />
    </>
  );
}
