import { refundTierCredit, reserveTierCredit } from "@/lib/ai/usage";

export const GEMINI_TIMEOUT_MS = 20_000;

export type MeteredAiResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: "quota" | "provider"; message: string };

/**
 * The single entry point for any AI provider call that costs money.
 *
 * Guarantees:
 *  - The caller must supply an authenticated user id; there is no anonymous
 *    path, so there is no unmetered route into the provider.
 *  - A credit is RESERVED before the provider is called, so concurrent
 *    requests cannot collectively exceed the limit.
 *  - A failed call refunds the credit, so users are not charged for provider
 *    errors.
 *  - Internal retries never re-charge: the reservation is taken once and the
 *    retry loop lives inside `execute`.
 *  - Accounting failure is fatal. If we cannot reserve, we do not call the
 *    provider at all, rather than silently allowing unmetered usage.
 */
export async function runMeteredAi<T>(
  userId: string,
  execute: () => Promise<T>,
): Promise<MeteredAiResult<T>> {
  if (!userId) {
    return {
      ok: false,
      reason: "provider",
      message: "AI requests require an authenticated account.",
    };
  }

  const reservation = await reserveTierCredit(userId);

  if (!reservation.granted) {
    return { ok: false, reason: "quota", message: reservation.message };
  }

  try {
    const value = await execute();
    return { ok: true, value };
  } catch (err) {
    // Never leave a user charged for our failure.
    await refundTierCredit(userId, reservation.tier.id);
    return {
      ok: false,
      reason: "provider",
      message:
        err instanceof Error
          ? err.message
          : "The AI provider could not be reached. Please try again.",
    };
  }
}

/**
 * Human-facing text for a quota rejection, used by callers that render their
 * own error UI.
 */
export function quotaMessage(reason: "quota" | "provider", message: string): string {
  if (reason === "quota") return message;
  return `AI request failed: ${message}`;
}