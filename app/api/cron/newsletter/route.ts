import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewsletterEmail } from "@/lib/email/brevo";

export const dynamic = "force-dynamic";

/**
 * Monthly newsletter for students with newsletter_subscribed = true.
 * Schedule via Vercel Cron (e.g. 0 9 1 * *).
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is required for the newsletter cron.",
      },
      { status: 500 },
    );
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityhub.app";

  const { data: subscribers, error: subError } = await adminClient
    .from("profiles")
    .select("id, email")
    .eq("account_type", "student")
    .eq("newsletter_subscribed", true)
    .not("email", "is", null);

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  const { data: opportunities, error: oppError } = await adminClient
    .from("opportunities")
    .select("id, title, organizer, deadline, type")
    .eq("is_verified", true)
    .order("created_at", { ascending: false })
    .limit(8);

  if (oppError) {
    return NextResponse.json({ error: oppError.message }, { status: 500 });
  }

  const oppList = (opportunities ?? []).map((o) => ({
    title: o.title,
    organizer: o.organizer,
    deadline: o.deadline,
    type: o.type,
    url: `${origin}/opportunities/${o.id}`,
  }));

  if (oppList.length === 0) {
    return NextResponse.json({
      success: true,
      sent: 0,
      message: "No verified opportunities to include.",
    });
  }

  const monthLabel = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  let sent = 0;
  const errors: string[] = [];

  for (const sub of subscribers ?? []) {
    if (!sub.email?.trim()) continue;

    const result = await sendNewsletterEmail({
      to: [{ email: sub.email.trim() }],
      subject: `OpportunityHub — ${monthLabel} opportunity roundup`,
      headline: `What's new in ${monthLabel}`,
      introText:
        "Here are recently verified opportunities and programs for secondary and high-school students.",
      opportunities: oppList,
    });

    if (result.success) {
      sent++;
    } else if (result.error) {
      errors.push(`${sub.email}: ${result.error}`);
    }
  }

  return NextResponse.json({
    success: true,
    subscribers: subscribers?.length ?? 0,
    sent,
    errors,
  });
}
