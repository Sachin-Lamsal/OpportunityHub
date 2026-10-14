import type { Opportunity } from "@/lib/types";

export interface OpportunityEnrichment {
  ai_summary: string;
  prep_resources: string;
  application_steps: string;
  eligibility_details: string;
  contact_info: string;
  portfolio_tips: string;
  deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  cost: string | null;
  time_commitment: string | null;
  location: string | null;
  grade_requirements: string | null;
  skills_gained: string | null;
  difficulty_level: string | null;
  tags: string[];
}

export function buildEnrichOpportunityPrompt(
  opportunity: Opportunity,
  webPageText: string | null,
): string {
  const existing = [
    `Title: ${opportunity.title}`,
    `Type: ${opportunity.type}`,
    `Subject: ${opportunity.subject_area ?? "unknown"}`,
    `Description: ${opportunity.description}`,
    `Organizer: ${opportunity.organizer ?? "unknown"}`,
    `Deadline: ${opportunity.deadline ?? "unknown"}`,
    `Start: ${opportunity.start_date ?? "unknown"}`,
    `End: ${opportunity.end_date ?? "unknown"}`,
    `Location: ${opportunity.location ?? "unknown"}`,
    `Online: ${opportunity.is_online ? "yes" : "no"}`,
    `Cost: ${opportunity.cost ?? "unknown"}`,
    `Time: ${opportunity.time_commitment ?? "unknown"}`,
    `Grades: ${opportunity.grade_requirements ?? "unknown"}`,
    `Skills: ${opportunity.skills_gained ?? "unknown"}`,
    `Difficulty: ${opportunity.difficulty_level ?? "unknown"}`,
    `Tags: ${(opportunity.tags ?? []).join(", ")}`,
    `Registration URL: ${opportunity.registration_link ?? "none"}`,
  ].join("\n");

  const webSection = webPageText
    ? `\nOPTIONAL WEB PAGE TEXT (may be wrong or outdated — treat as hints only):\n${webPageText.slice(0, 4000)}`
    : "\nNo web page was fetched — use ONLY the database record above.";

  return `You help secondary school students in Kathmandu prepare for a SPECIFIC opportunity listed in our app.

Your job is NOT to write a generic essay. Connect this student to THIS opportunity with concrete prep guidance grounded in the facts below.

TRUSTED DATABASE RECORD (primary source):
${existing}
${webSection}

Respond with valid JSON only, no markdown:
{
  "ai_summary": "2-3 sentences: what this opportunity is, who it suits, and why it matters for a university portfolio — only facts from the record",
  "prep_resources": "Structured prep plan using these section headers exactly:\\n\\n## What to confirm first\\n• ...\\n\\n## 2–4 week prep plan\\n• Week 1: ...\\n• Week 2: ...\\n\\n## Free study resources (general)\\n• Name well-known free resources by TYPE (e.g. Khan Academy, past papers) — do NOT invent URLs\\n\\n## Portfolio angle\\n• How to show readiness in a school portfolio",
  "application_steps": "Numbered steps (1. 2. 3.) using registration link when known; if unknown say 'Open the official registration link on this page'",
  "eligibility_details": "Plain-language eligibility from grade/subject fields only",
  "contact_info": "If organizer or link is known, say where to check updates. Never invent emails or phone numbers.",
  "portfolio_tips": "1-2 sentences on how to describe participating in THIS opportunity on a CV",
  "deadline": "YYYY-MM-DD or null",
  "start_date": "YYYY-MM-DD or null",
  "end_date": "YYYY-MM-DD or null",
  "cost": "string or null",
  "time_commitment": "string or null",
  "location": "string or null",
  "grade_requirements": "string or null",
  "skills_gained": "string or null",
  "difficulty_level": "Beginner|Intermediate|Advanced or null",
  "tags": ["tag1", "tag2"]
}

Strict rules:
- NEVER invent prizes, winners, dates, fees, contacts, or website URLs not in the database or web text
- If a field is unknown in the data, use null for dates and write "Confirm on the official registration link" in text fields
- Database dates beat web text when they conflict
- prep_resources must be actionable for Nepali students (time-boxed steps, not vague advice like "study hard")
- Do not mention other opportunities or universities not in the data
- Keep language simple for teenagers`;
}

export function parseEnrichmentJSON(text: string): OpportunityEnrichment | null {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as OpportunityEnrichment;

    if (!parsed.ai_summary || !parsed.prep_resources) {
      return null;
    }

    return {
      ai_summary: parsed.ai_summary,
      prep_resources: parsed.prep_resources,
      application_steps: parsed.application_steps ?? "",
      eligibility_details: parsed.eligibility_details ?? "",
      contact_info: parsed.contact_info ?? "",
      portfolio_tips: parsed.portfolio_tips ?? "",
      deadline: parsed.deadline ?? null,
      start_date: parsed.start_date ?? null,
      end_date: parsed.end_date ?? null,
      cost: parsed.cost ?? null,
      time_commitment: parsed.time_commitment ?? null,
      location: parsed.location ?? null,
      grade_requirements: parsed.grade_requirements ?? null,
      skills_gained: parsed.skills_gained ?? null,
      difficulty_level: parsed.difficulty_level ?? null,
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 12) : [],
    };
  } catch {
    return null;
  }
}
