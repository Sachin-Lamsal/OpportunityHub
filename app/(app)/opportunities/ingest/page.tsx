import { redirect } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import IngestOpportunityClient from "@/components/ingestion/IngestOpportunityClient";
import { getProfile } from "@/lib/actions/auth";
import { canManageOpportunities } from "@/lib/auth/account";

export const metadata = {
  title: "AI Opportunity Ingestion & OCR",
};


export default async function OpportunityIngestPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!canManageOpportunities(profile.account_type)) {
    redirect("/dashboard");
  }

  return (
    <>
      <PageHeader
        title="Web Scraper & OCR Ingestion Pipeline"
        description="Extract opportunities from web links or notice posters with Gemini AI. Ingested listings are automatically flagged as unverified internet sources until approved."
      />

      <IngestOpportunityClient />
    </>
  );
}
