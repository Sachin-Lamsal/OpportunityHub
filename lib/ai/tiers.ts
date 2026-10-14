export type AiTierId = "premium" | "standard" | "basic";

export interface AiTier {
  id: AiTierId;
  label: string;
  models: readonly string[];
  maxOutputTokens: number;
  temperature: number;
}

/** Primary model first, then smaller fallback model before offline rule-based fallback */
export const AI_TIERS: readonly AiTier[] = [
  {
    id: "premium",
    label: "Primary Model (Flash)",
    models: ["gemini-flash-latest", "gemini-3.6-flash", "gemini-3.5-flash"],
    maxOutputTokens: 2048,
    temperature: 0.2,
  },
  {
    id: "standard",
    label: "Fallback Model (Flash-Lite)",
    models: ["gemini-flash-lite-latest", "gemini-3.5-flash-lite"],
    maxOutputTokens: 1024,
    temperature: 0.2,
  },
] as const;

function parseLimit(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const DEFAULT_STUDENT_TOTAL_TALKS = 10;

export function getTierLimits(): Record<AiTierId, number> {
  const totalTalks = parseLimit(
    process.env.STUDENT_AI_TALKS_LIMIT ?? process.env.AI_TALKS_LIMIT,
    DEFAULT_STUDENT_TOTAL_TALKS,
  );

  const premiumLimit = parseLimit(
    process.env.AI_TIER_PREMIUM_LIMIT,
    Math.max(1, Math.round(totalTalks * 0.6)), // 6 of 10 by default
  );

  const standardLimit = parseLimit(
    process.env.AI_TIER_STANDARD_LIMIT,
    Math.max(1, totalTalks - premiumLimit), // 4 of 10 by default
  );

  return {
    premium: premiumLimit,
    standard: standardLimit,
    basic: 0,
  };
}

export function getTotalTalksLimit(): number {
  const limits = getTierLimits();
  return limits.premium + limits.standard + limits.basic;
}

export function getTierById(id: AiTierId): AiTier {
  const tier = AI_TIERS.find((t) => t.id === id);
  if (!tier) {
    throw new Error(`Unknown AI tier: ${id}`);
  }
  return tier;
}
