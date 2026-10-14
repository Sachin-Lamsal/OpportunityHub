import { createClient } from "@supabase/supabase-js";
import { getNormalizedSupabaseUrl } from "@/lib/env";

/**
 * Service role client that bypasses Row Level Security (RLS).
 * Only use in secure server-side environments such as background cron jobs or webhooks.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the client/browser.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return null;

  return createClient(getNormalizedSupabaseUrl(), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
