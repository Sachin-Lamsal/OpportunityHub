"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isGeminiConfigured } from "@/lib/ai/gemini";
import { fetchPageText } from "@/lib/ai/fetch-page-text";
import {
  buildEnrichOpportunityPrompt,
  parseEnrichmentJSON,
} from "@/lib/ai/enrich-opportunity";
import { generateWithUserQuota } from "@/lib/ai/usage";
import { getOpportunityById } from "@/lib/queries/opportunities";
import {
  buildEnrichmentPatch,
  isOpportunityOwner,
} from "@/lib/opportunities/enrichment-policy";

export interface EnrichState {
  error?: string;
  success?: string;
  enrichedAt?: string;
  tierLabel?: string;
}

export async function enrichOpportunityWithAI(
  opportunityId: string,
  forceRefresh = false,
): Promise<EnrichState> {
  if (!isGeminiConfigured()) {
    return {
      error:
        "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Log in to generate or refresh AI details." };
  }

  const opportunity = await getOpportunityById(opportunityId);

  if (!opportunity) {
    return { error: "Opportunity not found." };
  }

  if (
    !forceRefresh &&
    opportunity.ai_enriched_at &&
    opportunity.ai_summary &&
    opportunity.prep_resources
  ) {
    return {
      success: "Showing saved details — no AI credits used.",
      enrichedAt: opportunity.ai_enriched_at,
    };
  }

  let webText: string | null = null;
  if (opportunity.registration_link && (forceRefresh || !opportunity.ai_enriched_at)) {
    webText = await fetchPageText(opportunity.registration_link);
  }

  const prompt = buildEnrichOpportunityPrompt(opportunity, webText);
  const {
    text: response,
    error: geminiError,
    tierLabel,
  } = await generateWithUserQuota(user.id, prompt);

  if (!response) {
    return {
      error:
        geminiError ??
        "AI request failed. Check GEMINI_API_KEY and try again.",
    };
  }

  const enrichment = parseEnrichmentJSON(response);

  if (!enrichment) {
    return { error: "Could not parse AI response. Try again." };
  }

  const now = new Date().toISOString();

  // `save_opportunity_ai_enrichment` is SECURITY DEFINER and bypasses RLS, so
  // this action is the only authorization boundary. AI-derived narrative is
  // written for any signed-in user (the documented per-opportunity AI detail
  // feature); publisher facts are only written by the listing owner, and only
  // when currently empty.
  const isOwner = isOpportunityOwner(opportunity, user.id);

  const updatePayload = buildEnrichmentPatch({
    narrative: {
      ai_summary: enrichment.ai_summary,
      prep_resources: enrichment.prep_resources,
      application_steps: enrichment.application_steps,
      eligibility_details: enrichment.eligibility_details,
      portfolio_tips: enrichment.portfolio_tips,
    },
    facts: {
      deadline: enrichment.deadline,
      start_date: enrichment.start_date,
      end_date: enrichment.end_date,
      cost: enrichment.cost,
      time_commitment: enrichment.time_commitment,
      location: enrichment.location,
      grade_requirements: enrichment.grade_requirements,
      skills_gained: enrichment.skills_gained,
      difficulty_level: enrichment.difficulty_level,
      tags: enrichment.tags,
      contact_info: enrichment.contact_info,
    },
    existing: opportunity,
    isOwner,
    enrichedAt: now,
  });

  const { error } = await supabase.rpc("save_opportunity_ai_enrichment", {
    opp_id: opportunityId,
    patch: updatePayload,
  });

  if (error) {
    return {
      error: `Could not save enriched data: ${error.message}. Complete the database setup described in supabase/README.md.`,
    };
  }

  revalidatePath(`/opportunities/${opportunityId}`);
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");

  return {
    success: forceRefresh
      ? `Latest AI details saved${tierLabel ? ` (${tierLabel})` : ""}.`
      : `AI details generated and saved for future visits${tierLabel ? ` (${tierLabel})` : ""}.`,
    enrichedAt: now,
    tierLabel,
  };
}
