"use server";

import { isGeminiConfigured } from "@/lib/ai/gemini";
import {
  buildCVPrompt,
  buildSuggestionsPrompt,
  buildAiTalkPrompt,
  parseCVJSON,
  parseSuggestionsJSON,
  type AICVEnhancement,
  type AISuggestionResult,
  type ChatTurn,
} from "@/lib/ai/prompts";
import { getFallbackSuggestions } from "@/lib/ai/fallback";
import { generateWithUserQuota } from "@/lib/ai/usage";
import { getTotalTalksLimit } from "@/lib/ai/tiers";
import {
  buildCVFromProfile,
  cvToPlainText,
  summarizeActivitiesForAI,
  summarizeProfileForAI,
} from "@/lib/cv/generate";
import { getProfile } from "@/lib/actions/auth";
import { getActivities } from "@/lib/queries/activities";
import { createClient } from "@/lib/supabase/server";

export interface AIActionResult<T> {
  data: T;
  source: "ai" | "fallback";
  error?: string;
  tierLabel?: string;
  quotaExhausted?: boolean;
}

export interface AiTalkResponse {
  reply: string;
  source: "ai" | "fallback";
  tierLabel?: string;
  error?: string;
  quotaExhausted?: boolean;
}

async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getAISuggestions(): Promise<
  AIActionResult<AISuggestionResult>
> {
  const [profile, activities, userId] = await Promise.all([
    getProfile(),
    getActivities(),
    getUserId(),
  ]);

  if (!profile || !userId) {
    return {
      data: getFallbackSuggestions(null, []),
      source: "fallback",
      error: "Not logged in.",
    };
  }

  if (!isGeminiConfigured()) {
    return {
      data: getFallbackSuggestions(profile, activities),
      source: "fallback",
    };
  }

  const prompt = buildSuggestionsPrompt(
    summarizeProfileForAI(profile),
    summarizeActivitiesForAI(activities),
  );

  const {
    text: response,
    error: geminiError,
    tierLabel,
    quotaExhausted,
  } = await generateWithUserQuota(userId, prompt);

  if (!response) {
    return {
      data: getFallbackSuggestions(profile, activities),
      source: "fallback",
      error: geminiError ?? "AI unavailable. Showing offline portfolio review instead.",
      quotaExhausted,
    };
  }

  const parsed = parseSuggestionsJSON(response);

  if (!parsed) {
    return {
      data: getFallbackSuggestions(profile, activities),
      source: "fallback",
      error: "Could not parse AI response. Showing offline portfolio review.",
    };
  }

  return { data: parsed, source: "ai", tierLabel };
}

export async function sendAiTalkMessage(
  history: ChatTurn[],
  newMessage: string,
): Promise<AiTalkResponse> {
  const trimmed = newMessage.trim();
  if (!trimmed) {
    return {
      reply: "Please type a question or topic to discuss with your advisor.",
      source: "fallback",
      error: "Empty message.",
    };
  }

  const [profile, activities, userId] = await Promise.all([
    getProfile(),
    getActivities(),
    getUserId(),
  ]);

  if (!profile || !userId) {
    return {
      reply: "Please log in to your account to speak with the AI Advisor.",
      source: "fallback",
      error: "Not logged in.",
    };
  }

  if (!isGeminiConfigured()) {
    const fallback = getFallbackSuggestions(profile, activities);
    return {
      reply: `AI service is currently operating in offline mode.\n\nHere is your profile guidance:\n${fallback.explanation}\n\nNext steps:\n1. ${fallback.nextSteps[0] ?? "Add activities"}\n2. ${fallback.nextSteps[1] ?? "Update profile"}`,
      source: "fallback",
      error: "Gemini API key not configured.",
    };
  }

  const prompt = buildAiTalkPrompt(
    summarizeProfileForAI(profile),
    summarizeActivitiesForAI(activities),
    history,
    trimmed,
  );

  const {
    text: response,
    error: geminiError,
    tierLabel,
    quotaExhausted,
  } = await generateWithUserQuota(userId, prompt);

  if (!response) {
    const fallback = getFallbackSuggestions(profile, activities);
    const prefix = quotaExhausted
      ? `You have used all ${getTotalTalksLimit()} of your monthly AI talks (resets on the 1st of next month).`
      : "The live AI advisor is temporarily unavailable.";

    return {
      reply: `${prefix}\n\nAutomated offline portfolio review:\n${fallback.explanation}\n\nRecommended next steps:\n${fallback.nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
      source: "fallback",
      error: geminiError,
      quotaExhausted,
    };
  }

  return {
    reply: response,
    source: "ai",
    tierLabel,
  };
}

export async function enhanceCVWithAI(): Promise<
  AIActionResult<AICVEnhancement | null>
> {
  const [profile, activities, userId] = await Promise.all([
    getProfile(),
    getActivities(),
    getUserId(),
  ]);

  if (!profile || !userId) {
    return { data: null, source: "fallback", error: "Not logged in." };
  }

  if (activities.length === 0) {
    return {
      data: null,
      source: "fallback",
      error: "Add some activities first before using AI enhancement.",
    };
  }

  const cv = buildCVFromProfile(profile, activities);
  const plainText = cvToPlainText(cv);

  if (!isGeminiConfigured()) {
    return {
      data: null,
      source: "fallback",
      error: "Gemini API key not configured. CV shown without AI enhancement.",
    };
  }

  const prompt = buildCVPrompt(
    summarizeProfileForAI(profile),
    summarizeActivitiesForAI(activities),
    plainText,
  );

  const {
    text: response,
    error: geminiError,
    tierLabel,
  } = await generateWithUserQuota(userId, prompt);

  if (!response) {
    return {
      data: null,
      source: "fallback",
      error: geminiError ?? "AI unavailable right now. Your CV is still shown below.",
    };
  }

  const parsed = parseCVJSON(response);

  if (!parsed) {
    return {
      data: null,
      source: "fallback",
      error: "Could not parse AI response.",
    };
  }

  return { data: parsed, source: "ai", tierLabel };
}
