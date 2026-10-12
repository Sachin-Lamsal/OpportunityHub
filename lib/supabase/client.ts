import { createBrowserClient } from "@supabase/ssr";
import { getNormalizedSupabaseUrl, getSupabaseAnonKey } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    getNormalizedSupabaseUrl(),
    getSupabaseAnonKey(),
  );
}

