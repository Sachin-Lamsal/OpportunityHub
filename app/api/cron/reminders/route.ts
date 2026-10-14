import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendDeadlineReminderEmail } from "@/lib/email/brevo";

export const dynamic = "force-dynamic";

/**
 * Cron route to dispatch application deadline reminders via Brevo
 * Can be scheduled (e.g. daily at 08:00 UTC) via Vercel Cron or custom scheduler.
 */
export async function GET(request: Request) {
  // SECURITY: Cron endpoint MUST require authentication
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[CRON/REMINDERS] SECURITY ERROR: CRON_SECRET not configured. Endpoint is open to public abuse.");
    return NextResponse.json(
      { error: "Cron endpoint not properly configured. Set CRON_SECRET environment variable." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SECURITY: Use service role admin client to bypass RLS - require it, don't fallback
  const adminClient = createAdminClient();
  if (!adminClient) {
    console.error("[CRON/REMINDERS] SECURITY ERROR: SUPABASE_SERVICE_ROLE_KEY not configured. Cannot bypass RLS safely.");
    return NextResponse.json(
      { error: "Cron job misconfigured: missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 503 }
    );
  }
  const supabase = adminClient;


  // Find saved opportunities with upcoming deadlines where student opted in
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(today.getDate() + 8);

  const { data: records, error } = await supabase
    .from("saved_opportunities")
    .select(`
      id,
      user_id,
      opportunity_id,
      remind_deadline,
      reminder_sent_at,
      opportunities (*)
    `)
    .eq("remind_deadline", true);

  if (error) {
    console.error("[Reminders Cron Query Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = Array.from(new Set((records || []).map((r) => r.user_id)));
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, email_reminders")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  let sentCount = 0;
  const errors: string[] = [];
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityhub.app";

  for (const item of records || []) {
    const profile = profileMap.get(item.user_id);
    const opp = item.opportunities as unknown as { id: string; title: string; organizer?: string; deadline: string } | null;

    if (!profile?.email || profile.email_reminders === false || !opp?.deadline) {
      continue;
    }

    // SECURITY: Validate deadline is a valid date
    const deadlineDate = new Date(opp.deadline);
    if (isNaN(deadlineDate.getTime())) {
      console.warn(`[Reminders] Skipping opportunity with invalid deadline: ${opp.deadline}`);
      continue;
    }

    const diffTime = deadlineDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Send reminders at 7 days, 3 days, and 1 day remaining
    const isTargetWindow = daysRemaining === 7 || daysRemaining === 3 || daysRemaining === 1;

    if (!isTargetWindow) {
      continue;
    }

    // Check if reminder was already sent in the last 20 hours to prevent duplicate sends
    if (item.reminder_sent_at) {
      const lastSent = new Date(item.reminder_sent_at);
      const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 20) {
        continue;
      }
    }

    const result = await sendDeadlineReminderEmail({
      toEmail: profile.email,
      opportunityTitle: opp.title,
      organizer: opp.organizer,
      deadline: opp.deadline,
      daysRemaining,
      opportunityUrl: `${origin}/opportunities/${opp.id}`,
    });

    if (result.success) {
      sentCount++;
      await supabase
        .from("saved_opportunities")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", item.id);
    } else if (result.error) {
      errors.push(`${profile.email} (${opp.title}): ${result.error}`);
    }
  }

  return NextResponse.json({
    success: true,
    processed: records?.length || 0,
    remindersSent: sentCount,
    errors,
  });
}
