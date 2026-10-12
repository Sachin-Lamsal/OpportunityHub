import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabaseEnv, getNormalizedSupabaseUrl, getSupabaseAnonKey } from "@/lib/env";

export async function createClient() {
  if (!hasSupabaseEnv()) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(
    getNormalizedSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore if middleware refreshes sessions.
          }
        },
      },
    },
  );
}
