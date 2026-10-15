import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditEventInput {
  action: string;
  actor_id?: string;
  actor_type?: string;
  target_type?: string;
  target_id?: string;
  details?: Record<string, unknown>;
  success: boolean;
  error_message?: string;
}

/**
 * Server-only audit logging helper. Intentionally NOT exported from a
 * `"use server"` module: audit writes must never be callable as a public
 * server action endpoint.
 */
export async function logAuditEvent(data: AuditEventInput): Promise<void> {
  try {
    const client = createAdminClient() ?? (await createClient());

    await client.from("audit_events").insert({
      action: data.action,
      actor_id: data.actor_id || null,
      actor_type: data.actor_type || null,
      target_type: data.target_type || null,
      target_id: data.target_id || null,
      details: data.details || null,
      success: data.success,
      error_message: data.error_message || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}
