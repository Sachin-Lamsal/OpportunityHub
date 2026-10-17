/**
 * Environment access with configuration validation.
 *
 * A placeholder value (`REPLACE_WITH_…`, `your-anon-key`, …) is not a usable
 * credential: Supabase answers `401 {"message":"Invalid API key"}`, which used
 * to surface as silently empty pages ("No opportunities yet. Complete the
 * database setup…") and as a confusing login failure. Placeholder detection
 * turns that into an explicit configuration error.
 */

const PLACEHOLDER_PREFIXES = [
  "replace_with",
  "replace-with",
  "your-",
  "your_",
  "changeme",
  "change-me",
  "placeholder",
  "todo",
  "xxx",
  "<",
];

function looksLikePlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return PLACEHOLDER_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function getNormalizedSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return raw
    .trim()
    .replace(/\/rest\/v1\/?$/, "")
    .replace(/\/+$/, "");
}

export function getSupabaseAnonKey(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
}

export function hasSupabaseEnv(): boolean {
  return (
    !looksLikePlaceholder(getNormalizedSupabaseUrl()) &&
    !looksLikePlaceholder(getSupabaseAnonKey())
  );
}

/**
 * Human-readable reason the Supabase configuration is unusable, or null when it
 * looks usable. Safe to show to developers; contains no credential values.
 */
export function describeSupabaseEnvProblem(): string | null {
  const url = getNormalizedSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (looksLikePlaceholder(url)) {
    return "NEXT_PUBLIC_SUPABASE_URL is missing or still a placeholder. Copy the Project URL from supabase.com → your project → Settings → API.";
  }

  if (looksLikePlaceholder(anonKey)) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or still a placeholder. Copy the anon / publishable key from supabase.com → your project → Settings → API Keys (it must NOT be the secret/service key).";
  }

  return null;
}

export function hasGeminiEnv(): boolean {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  return !!key && key.length > 10 && !looksLikePlaceholder(key);
}
