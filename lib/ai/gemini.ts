import type { AiTier } from "@/lib/ai/tiers";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Fallback when no user tier is specified (e.g. test script). */
const DEFAULT_MODELS = [
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
] as const;

export function getGeminiApiKey(): string | null {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    null;

  return key && key.length > 10 ? key : null;
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey() !== null;
}

export interface GenerateTextResult {
  text: string | null;
  error?: string;
}

interface GeminiErrorBody {
  error?: {
    message?: string;
    status?: string;
    code?: number;
  };
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function friendlyGeminiError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("retry in")) {
    return `Gemini free-tier quota reached. Wait about 1 minute and try again, or check usage at https://ai.dev/rate-limit. Details: ${message}`;
  }

  if (lower.includes("denied access") || lower.includes("permission")) {
    return `Gemini project access issue. Open Google AI Studio, confirm your project is active, and that the Generative Language API is enabled. Details: ${message}`;
  }

  if (lower.includes("api key not valid") || lower.includes("invalid api key")) {
    return `Invalid API key. Create a new key at https://aistudio.google.com/apikey and update GEMINI_API_KEY in .env.local.`;
  }

  return message;
}

async function callGenerateContent(
  apiKey: string,
  model: string,
  prompt: string,
  config: { temperature: number; maxOutputTokens: number },
): Promise<GenerateTextResult> {
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent`;

  // SECURITY: Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature,
          maxOutputTokens: config.maxOutputTokens,
        },
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const body = (await response.json()) as GeminiGenerateResponse & GeminiErrorBody;

    if (!response.ok) {
      const message =
        body.error?.message ??
        `Gemini API returned ${response.status} for model ${model}`;
      return { text: null, error: friendlyGeminiError(message) };
    }

    const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? null;

    if (!text) {
      return {
        text: null,
        error: `Gemini returned an empty response for model ${model}`,
      };
    }

    return { text };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return {
        text: null,
        error: "Gemini API request timed out after 15 seconds. Please try again.",
      };
    }
    throw error;
  }
}

export async function generateText(prompt: string): Promise<string | null> {
  const result = await generateTextWithError(prompt);
  return result.text;
}

/**
 * Native Gemini REST API with x-goog-api-key header.
 * Supports both legacy AIza keys and new AQ. auth keys from Google AI Studio.
 */
async function generateWithModels(
  prompt: string,
  models: readonly string[],
  config: { temperature: number; maxOutputTokens: number },
): Promise<GenerateTextResult> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return {
      text: null,
      error:
        "GEMINI_API_KEY is missing from .env.local. Restart the dev server after adding it.",
    };
  }

  let lastError = "All Gemini models failed. Run: npm run test:gemini";

  for (const model of models) {
    try {
      const result = await callGenerateContent(apiKey, model, prompt, config);

      if (result.text) {
        return result;
      }

      if (result.error) {
        lastError = result.error;
        console.error(`Gemini (${model}):`, result.error);

        if (
          result.error.toLowerCase().includes("quota") ||
          result.error.toLowerCase().includes("not found")
        ) {
          continue;
        }

        if (
          result.error.toLowerCase().includes("invalid api key") ||
          result.error.toLowerCase().includes("denied access")
        ) {
          break;
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`Gemini network error (${model}):`, lastError);
    }
  }

  return { text: null, error: lastError };
}

/** Use a specific user tier's models (best tier first within that tier). */
export async function generateTextWithTier(
  prompt: string,
  tier: AiTier,
): Promise<GenerateTextResult> {
  return generateWithModels(prompt, tier.models, {
    temperature: tier.temperature,
    maxOutputTokens: tier.maxOutputTokens,
  });
}

export async function generateTextWithError(
  prompt: string,
): Promise<GenerateTextResult> {
  return generateWithModels(prompt, DEFAULT_MODELS, {
    temperature: 0.2,
    maxOutputTokens: 4096,
  });
}
