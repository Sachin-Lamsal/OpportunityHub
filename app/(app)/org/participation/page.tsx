import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import ParticipationConfirmationQueue from "@/components/organizations/ParticipationConfirmationQueue";
import { getProfile } from "@/lib/actions/auth";
import { getOrganizationParticipationRequests } from "@/lib/queries/activities";

export const metadata = {
  title: "Participation confirmations",
};

export default async function OrganizationParticipationPage() {
  const profile = await getProfile();

  if (!profile || profile.account_type !== "organization") {
    redirect("/login/organization");
  }

  const requests = await getOrganizationParticipationRequests();
  const pendingCount = requests.filter(
    (request) => request.participation_status === "pending",
  ).length;

  return (
    <>
      <PageHeader
        title="Participation confirmations"
        description="Confirm participation only for students who added one of your published opportunities to their portfolio."
      />
      <div className="space-y-5">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-sm text-indigo-950">
          <p className="font-semibold">
            {pendingCount} request{pendingCount === 1 ? "" : "s"} awaiting confirmation
          </p>
          <p className="mt-1 text-xs leading-relaxed text-indigo-800">
            Confirmed students can publish a participant review. This queue shows participation records only, never student reviews.
          </p>
        </div>
        <ParticipationConfirmationQueue requests={requests} />
      </div>
    </>
  );
}
