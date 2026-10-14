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
  if (forceRefresh && opportunity.registration_link) {
    webText = await fetchPageText(opportunity.registration_link);
  } else if (!opportunity.ai_enriched_at && opportunity.registration_link) {
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

  const updatePayload: Record<string, unknown> = {
    ai_summary: enrichment.ai_summary,
    prep_resources: enrichment.prep_resources,
    application_steps: enrichment.application_steps,
    eligibility_details: enrichment.eligibility_details,
    contact_info: enrichment.contact_info,
    portfolio_tips: enrichment.portfolio_tips,
    ai_enriched_at: now,
    source_url: opportunity.registration_link,
    tags: enrichment.tags.length > 0 ? enrichment.tags : opportunity.tags,
  };

  // Only fill gaps — never overwrite trusted seed/database facts with AI guesses
  if (enrichment.deadline && !opportunity.deadline) {
    updatePayload.deadline = enrichment.deadline;
  }
  if (enrichment.start_date && !opportunity.start_date) {
    updatePayload.start_date = enrichment.start_date;
  }
  if (enrichment.end_date && !opportunity.end_date) {
    updatePayload.end_date = enrichment.end_date;
  }
  if (enrichment.cost && !opportunity.cost) {
    updatePayload.cost = enrichment.cost;
  }
  if (enrichment.time_commitment && !opportunity.time_commitment) {
    updatePayload.time_commitment = enrichment.time_commitment;
  }
  if (enrichment.location && !opportunity.location) {
    updatePayload.location = enrichment.location;
  }
  if (enrichment.grade_requirements && !opportunity.grade_requirements) {
    updatePayload.grade_requirements = enrichment.grade_requirements;
  }
  if (enrichment.skills_gained && !opportunity.skills_gained) {
    updatePayload.skills_gained = enrichment.skills_gained;
  }
  if (enrichment.difficulty_level && !opportunity.difficulty_level) {
    updatePayload.difficulty_level = enrichment.difficulty_level;
  }

  const { error } = await supabase.rpc("save_opportunity_ai_enrichment", {
    opp_id: opportunityId,
    patch: updatePayload,
  });

  if (error) {
    return {
      error: `Could not save enriched data: ${error.message}. Run supabase/migration-opportunity-ai-enrich-rpc.sql in Supabase SQL Editor.`,
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
