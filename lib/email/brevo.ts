/**
 * Brevo (formerly Sendinblue) Email Service
 * Handles transactional emails, application deadline reminders, and newsletters.
 */

interface BrevoRecipient {
  email: string;
  name?: string;
}

interface SendEmailParams {
  to: BrevoRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tags?: string[];
}

export function hasBrevoEnv(): boolean {
  const key = process.env.BREVO_API_KEY?.trim();
  return Boolean(key && key.length > 5);
}

/**
 * Sends a transactional or reminder email via Brevo REST API v3
 */
export async function sendBrevoEmail({
  to,
  subject,
  htmlContent,
  textContent,
  tags,
}: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromEmail = process.env.BREVO_FROM_EMAIL?.trim() || "reminders@opportunityhub.app";
  const fromName = process.env.BREVO_FROM_NAME?.trim() || "OpportunityHub";

  if (!apiKey) {
    console.info(
      `[Brevo Service] BREVO_API_KEY not configured. Email to ${to.map((t) => t.email).join(", ")} simulated in development:\nSubject: ${subject}`,
    );
    return { success: true, messageId: "simulated-dev-id" };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: fromName,
          email: fromEmail,
        },
        to,
        subject,
        htmlContent,
        textContent,
        tags: tags ?? ["opportunity-reminder"],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Brevo API Error]", res.status, errorText);
      return { success: false, error: `Brevo API error (${res.status}): ${errorText}` };
    }

    const data = (await res.json()) as { messageId?: string };
    return { success: true, messageId: data.messageId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Brevo Network Error]", message);
    return { success: false, error: message };
  }
}

/**
 * Sends a deadline reminder email for a saved opportunity
 */
export async function sendDeadlineReminderEmail({
  toEmail,
  studentName,
  opportunityTitle,
  organizer,
  deadline,
  daysRemaining,
  opportunityUrl,
}: {
  toEmail: string;
  studentName?: string;
  opportunityTitle: string;
  organizer?: string | null;
  deadline: string;
  daysRemaining: number;
  opportunityUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  const greeting = studentName ? `Hi ${studentName},` : "Hello,";
  const urgencyLabel =
    daysRemaining <= 1
      ? "🚨 Final Day: Deadline is tomorrow!"
      : daysRemaining <= 3
        ? `⏳ Just ${daysRemaining} days left until deadline`
        : `📅 Reminder: Deadline in ${daysRemaining} days`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; }
    .badge { display: inline-block; background-color: #fef3c7; color: #92400e; font-weight: 600; font-size: 13px; padding: 6px 12px; border-radius: 9999px; }
    .title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 16px 0 8px 0; }
    .organizer { color: #64748b; font-size: 14px; margin-bottom: 20px; }
    .card { background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .deadline-row { font-size: 15px; font-weight: 600; color: #0f172a; }
    .button { display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 15px; padding: 12px 24px; border-radius: 10px; margin-top: 16px; }
    .footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge">${urgencyLabel}</div>
    <h1 class="title">${opportunityTitle}</h1>
    ${organizer ? `<div class="organizer">Organized by ${organizer}</div>` : ""}

    <p>${greeting}</p>
    <p>This is a quick reminder about an opportunity you saved on OpportunityHub. The official application deadline is approaching soon:</p>

    <div class="card">
      <div class="deadline-row">⏰ Application Deadline: ${deadline}</div>
      <div style="font-size: 13px; color: #475569; margin-top: 4px;">Make sure your documents, essays, or team registrations are ready.</div>
    </div>

    <a href="${opportunityUrl}" class="button">View Opportunity Details →</a>

    <div class="footer">
      You are receiving this because you saved this opportunity and opted in to deadline alerts on <a href="https://opportunityhub.app" style="color: #6366f1;">OpportunityHub</a>.<br>
      You can mute deadline alerts for this opportunity anytime on its detail page or update notification preferences in your Profile.
    </div>
  </div>
</body>
</html>
`;

  return sendBrevoEmail({
    to: [{ email: toEmail, name: studentName }],
    subject: `[Deadline Reminder] ${opportunityTitle} (${daysRemaining} days left)`,
    htmlContent,
    tags: ["deadline-reminder", "saved-opportunities"],
  });
}

/**
 * Sends OpportunityHub newsletter digest to subscribed students
 */
export async function sendNewsletterEmail({
  to,
  subject,
  headline,
  introText,
  opportunities,
}: {
  to: BrevoRecipient[];
  subject: string;
  headline: string;
  introText: string;
  opportunities: Array<{
    title: string;
    organizer?: string | null;
    deadline?: string | null;
    type: string;
    url: string;
  }>;
}): Promise<{ success: boolean; error?: string }> {
  const itemsHtml = opportunities
    .map(
      (opp) => `
      <div style="padding: 14px 0; border-bottom: 1px solid #e2e8f0;">
        <span style="display: inline-block; background-color: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px;">${opp.type}</span>
        <h3 style="margin: 6px 0 2px 0; font-size: 16px;"><a href="${opp.url}" style="color: #1e293b; text-decoration: none; font-weight: 700;">${opp.title}</a></h3>
        ${opp.organizer ? `<div style="font-size: 13px; color: #64748b;">${opp.organizer}</div>` : ""}
        ${opp.deadline ? `<div style="font-size: 12px; color: #dc2626; font-weight: 600; margin-top: 4px;">Deadline: ${opp.deadline}</div>` : ""}
      </div>`,
    )
    .join("");

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <h1 style="font-size: 24px; color: #4338ca; margin-bottom: 8px;">OpportunityHub Roundup</h1>
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">${headline}</h2>
    <p style="font-size: 14px; color: #475569; line-height: 1.6;">${introText}</p>

    <div style="margin-top: 24px;">
      ${itemsHtml}
    </div>

    <div style="margin-top: 32px; text-align: center;">
      <a href="https://opportunityhub.app/opportunities" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px;">Explore All Opportunities →</a>
    </div>

    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
      You received this email because you are subscribed to the OpportunityHub newsletter.<br>
      You can manage your email preferences anytime from your profile settings.
    </div>
  </div>
</body>
</html>
`;

  return sendBrevoEmail({
    to,
    subject,
    htmlContent,
    tags: ["newsletter"],
  });
}
