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
  return !!(
    getNormalizedSupabaseUrl() &&
    getSupabaseAnonKey()
  );
}

export function hasGeminiEnv(): boolean {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  return !!key && key.length > 10;
}

