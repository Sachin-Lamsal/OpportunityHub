import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import OpportunityForm from "@/components/opportunities/OpportunityForm";
import { getOpportunityForOwnerEdit } from "@/lib/queries/opportunities";
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

  // Ownership is enforced inside the query: a listing whose `created_by` is
  // NULL (legacy/seed data) must not be editable by an unrelated publisher.
  const opportunity = await getOpportunityForOwnerEdit(id, profile.id);

  if (!opportunity) {
    notFound();
  }

  const backHref =
    profile.account_type === "school"
      ? "/school/dashboard"
      : profile.account_type === "organization"
        ? "/org/dashboard"
        : "/dashboard";

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
