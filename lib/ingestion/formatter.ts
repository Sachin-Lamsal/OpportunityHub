import { getGeminiApiKey } from "@/lib/ai/gemini";
import { GEMINI_TIMEOUT_MS, runMeteredAi } from "@/lib/ai/metered-call";
import { OPPORTUNITY_TYPES, SUBJECT_AREAS } from "@/lib/constants";
import type { SourceType, VerificationStatus } from "@/lib/types";

export interface OpportunityDraft {
  title: string;
  type: string;
  description: string;
  organizer: string;
  registration_link: string;
  deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string;
  is_online: boolean;
  subject_area: string;
  grade_requirements: string;
  cost: string;
  time_commitment: string;
  skills_gained: string;
  difficulty_level: string;
  tags: string[];
  application_steps: string;
  eligibility_details: string;
  contact_info: string;
  source_url: string;
  is_verified: boolean;
  verification_status: VerificationStatus;
  source_type: SourceType;
  raw_source_text: string;
}

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Uses Gemini AI to format raw unstructured text (scraped web text or OCR extraction)
 * into a structured OpportunityDraft matching OpportunityHub's schema.
 */
export async function formatRawTextToOpportunity({
  rawText,
  sourceUrl,
  sourceType = "scraped",
  pageTitle,
  userId,
}: {
  rawText: string;
  sourceUrl?: string;
  sourceType?: SourceType;
  pageTitle?: string;
  /** Authenticated caller. Required: unmetered AI calls are not permitted. */
  userId: string;
}): Promise<OpportunityDraft> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return fallbackRuleBasedFormat(rawText, sourceUrl, sourceType, pageTitle);
  }

  const prompt = `You are an expert Opportunity Analyst for OpportunityHub.
Analyze the following unstructured raw text extracted from the internet (web scrape or OCR document).
Extract and structure the opportunity into JSON according to these rules:

1. "title": Exact official title of the opportunity / competition / scholarship.
2. "type": Must be exactly one of: ${JSON.stringify(OPPORTUNITY_TYPES)}. Default to "Competition" or "Workshop" if unclear.
3. "description": A concise, clear summary (2-4 sentences) explaining what the opportunity is and why a student should join.
4. "organizer": Name of the organizing body, school, foundation, or company.
5. "registration_link": Official signup, portal, or website URL (or fall back to source URL if none).
6. "deadline": ISO date format "YYYY-MM-DD" if a deadline is mentioned, otherwise null.
7. "start_date": ISO date format "YYYY-MM-DD" or null.
8. "end_date": ISO date format "YYYY-MM-DD" or null.
9. "location": City, country, or "Online" if virtual.
10. "is_online": boolean (true if virtual/remote, false if in-person).
11. "subject_area": Must be exactly one of: ${JSON.stringify(SUBJECT_AREAS)}. Choose the closest fit.
12. "grade_requirements": Eligible grades/ages (e.g. "Grades 9-12", "Undergraduates", "Ages 14-18").
13. "cost": Fee details (e.g. "Free", "$25 application fee").
14. "time_commitment": Estimated duration (e.g. "3-day hackathon", "6-week summer program").
15. "skills_gained": Key skills (e.g. "Public speaking, diplomacy, research").
16. "difficulty_level": "Beginner", "Intermediate", or "Advanced".
17. "tags": Array of 3-6 lowercase keywords (e.g. ["hackathon", "ai", "coding"]).
18. "application_steps": 1-3 concise numbered steps on how to register.
19. "eligibility_details": Key restrictions, prerequisites, or nationality rules.
20. "contact_info": Contact email, website, or organizer handle.

Raw source input:
Title Hint: ${pageTitle || "N/A"}
Source URL: ${sourceUrl || "N/A"}

Text content:
"""
${rawText.slice(0, 10000)}
"""

Return ONLY a valid JSON object matching the fields above with no markdown code fences.`;

  const models = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-lite-latest"];

  // Metered: reserve a credit before calling Gemini, refund on failure.
  const metered = await runMeteredAi(userId, async (): Promise<OpportunityDraft | null> => {
    for (const model of models) {
      try {
        const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
            maxOutputTokens: 2048,
          },
        };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
        });

        if (!res.ok) {
          continue;
        }

        const json = await res.json();
        const rawResponse = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

        if (!rawResponse) continue;

        const parsed = JSON.parse(rawResponse) as Partial<OpportunityDraft>;

        return {
          title: (parsed.title || pageTitle || "Untitled Scraped Opportunity").trim(),
          type: OPPORTUNITY_TYPES.includes(parsed.type as (typeof OPPORTUNITY_TYPES)[number])
            ? parsed.type!
            : "Other",
          description: (parsed.description || rawText.slice(0, 200)).trim(),
          organizer: (parsed.organizer || "Unknown Organizer").trim(),
          registration_link: parsed.registration_link || sourceUrl || "",
          deadline: parseDateOrNull(parsed.deadline),
          start_date: parseDateOrNull(parsed.start_date),
          end_date: parseDateOrNull(parsed.end_date),
          location: parsed.location || (parsed.is_online ? "Online" : "Nepal / Global"),
          is_online: Boolean(parsed.is_online),
          subject_area: SUBJECT_AREAS.includes(
            parsed.subject_area as (typeof SUBJECT_AREAS)[number],
          )
            ? parsed.subject_area!
            : "Technology",
          grade_requirements: parsed.grade_requirements || "High school and secondary students",
          cost: parsed.cost || "Check organizer website",
          time_commitment: parsed.time_commitment || "",
          skills_gained: parsed.skills_gained || "",
          difficulty_level: parsed.difficulty_level || "Intermediate",
          tags: Array.isArray(parsed.tags) ? parsed.tags : ["scraped", "internet-source"],
          application_steps: parsed.application_steps || "",
          eligibility_details: parsed.eligibility_details || "",
          contact_info: parsed.contact_info || "",
          source_url: sourceUrl || "",
          is_verified: false,
          verification_status: "unverified",
          source_type: sourceType,
          raw_source_text: rawText,
        };
      } catch (err) {
        console.warn(`[AI Opportunity Formatter] ${model} failed`, err);
      }
    }
    return null;
  });

  if (!metered.ok) {
    console.warn(`[AI Opportunity Formatter] request refused: ${metered.reason}`);
  } else if (metered.value) {
    return metered.value;
  }

  return fallbackRuleBasedFormat(rawText, sourceUrl, sourceType, pageTitle);
}

function parseDateOrNull(val: unknown): string | null {
  if (typeof val !== "string" || !val.trim()) return null;
  const match = val.match(/^\d{4}-\d{2}-\d{2}$/);
  return match ? match[0] : null;
}

/**
 * Fallback parser when AI API is unavailable.
 */
function fallbackRuleBasedFormat(
  rawText: string,
  sourceUrl?: string,
  sourceType: SourceType = "scraped",
  pageTitle?: string,
): OpportunityDraft {
  const firstLine = rawText.split("\n").map((l) => l.trim()).filter(Boolean)[0] || "";
  const title = pageTitle || firstLine.slice(0, 80) || "Scraped Opportunity";

  return {
    title,
    type: "Other",
    description: rawText.slice(0, 300) || "Opportunity extracted from internet source.",
    organizer: "Internet Source",
    registration_link: sourceUrl || "",
    deadline: null,
    start_date: null,
    end_date: null,
    location: "Online",
    is_online: true,
    subject_area: "Technology",
    grade_requirements: "Secondary and high school students",
    cost: "Check source website",
    time_commitment: "",
    skills_gained: "",
    difficulty_level: "Intermediate",
    tags: ["unverified", "internet-source"],
    application_steps: "1) Visit source website for official application steps.",
    eligibility_details: "Please verify eligibility directly on the official website.",
    contact_info: "",
    source_url: sourceUrl || "",
    is_verified: false,
    verification_status: "unverified",
    source_type: sourceType,
    raw_source_text: rawText,
  };
}
