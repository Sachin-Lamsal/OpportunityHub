import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import OpportunityForm from "@/components/opportunities/OpportunityForm";
import { getProfile } from "@/lib/actions/auth";
import { UUID_RE, canManageOpportunities } from "@/lib/auth/account";
import { getOpportunityById } from "@/lib/queries/opportunities";
import type { Opportunity } from "@/lib/types";

export const metadata = {
  title: "Add opportunity",
};

interface NewOpportunityPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function NewOpportunityPage({
  searchParams,
}: NewOpportunityPageProps) {
  const profile = await getProfile();

  if (!profile || !canManageOpportunities(profile.account_type)) {
    redirect("/login");
  }

  const { from } = await searchParams;
  let copyFrom: Opportunity | undefined;

  if (from) {
    if (!UUID_RE.test(from)) notFound();
    const source = await getOpportunityById(from);
    if (!source) notFound();
    const isOwner = source.created_by === profile.id;
    const isVerifiedOrPublic =
      Boolean(source.is_verified) ||
      source.verification_status === "verified" ||
      source.lifecycle_status === "published";
    if (!isOwner && !isVerifiedOrPublic) notFound();
    copyFrom = source;
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

      <OpportunityForm copyFrom={copyFrom} />
    </div>
  );
}
