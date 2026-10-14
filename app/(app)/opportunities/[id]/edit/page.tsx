import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import OpportunityForm from "@/components/opportunities/OpportunityForm";
import { getOpportunityById } from "@/lib/queries/opportunities";
import { getProfile } from "@/lib/actions/auth";
import { canManageOpportunities } from "@/lib/auth/account";

interface EditOpportunityPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Edit opportunity",
};

export default async function EditOpportunityPage({
  params,
}: EditOpportunityPageProps) {
  const profile = await getProfile();

  if (!profile || !canManageOpportunities(profile.account_type)) {
    redirect("/login");
  }

  const { id } = await params;
  const opportunity = await getOpportunityById(id);

  if (!opportunity) {
    notFound();
  }

  // Ensure only the creator can edit
  if (opportunity.created_by && opportunity.created_by !== profile.id) {
    notFound();
  }

  const backHref =
    profile.account_type === "school" ? "/school/dashboard" : "/org/dashboard";

  return (
    <>
      <div className="mb-4">
        <Link
          href={backHref}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← Back to dashboard
        </Link>
      </div>
      <PageHeader
        title={`Edit: ${opportunity.title}`}
        description="Update details, dates, or links for this opportunity."
      />
      <OpportunityForm initialData={opportunity} />
    </>
  );
}
