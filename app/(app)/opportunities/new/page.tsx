import Link from "next/link";
import { redirect } from "next/navigation";
import OpportunityForm from "@/components/opportunities/OpportunityForm";
import { getProfile } from "@/lib/actions/auth";
import { canManageOpportunities } from "@/lib/auth/account";

export const metadata = {
  title: "Add opportunity",
};

export default async function NewOpportunityPage() {
  const profile = await getProfile();

  if (!profile || !canManageOpportunities(profile.account_type)) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div>
          <p className="font-semibold text-indigo-950 flex items-center gap-1.5">
            <span>⚡</span> Automated Web Scraper & Poster OCR
          </p>
          <p className="text-xs text-indigo-700 mt-0.5">
            Save time typing manually! Paste a URL or upload an event flyer to auto-extract details with Gemini AI.
          </p>
        </div>
        <Link
          href="/opportunities/ingest"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
        >
          <span>Use Web / OCR Ingestion →</span>
        </Link>
      </div>

      <OpportunityForm />
    </div>
  );
}
