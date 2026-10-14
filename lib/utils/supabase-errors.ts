/**
 * Maps common Postgres / Supabase errors to user-facing messages.
 */
export function formatOpportunityInsertError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("duplicate key") &&
    (lower.includes("opportunities_title") || lower.includes("title"))
  ) {
    return "An opportunity with this title already exists. Please use a different title.";
  }
  if (lower.includes("unique constraint") && lower.includes("title")) {
    return "An opportunity with this title already exists. Please use a different title.";
  }
  return message;
}
