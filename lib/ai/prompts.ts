export interface AISuggestionResult {
  explanation: string;
  strengths?: string[];
  gaps?: string[];
  suggestedOpportunities?: {
    opportunityId: string;
    title: string;
    reason: string;
  }[];
  nextSteps: string[];
}

export interface AICVEnhancement {
  bulletPoints: string[];
  summary: string;
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

export function buildSuggestionsPrompt(
  profileSummary: string,
  activitiesSummary: string,
): string {
  return `You are a helpful university admissions and portfolio mentor for secondary school students in Kathmandu, Nepal.
Focus on evaluating the student's portfolio strengths, category coverage, and actionable next steps.

STUDENT PROFILE:
${profileSummary}

CURRENT ACTIVITIES & PORTFOLIO:
${activitiesSummary}

Respond with valid JSON only, no markdown, in this exact shape:
{
  "explanation": "2-3 sentence overview of their portfolio status, category balance, and readiness for their target universities",
  "strengths": ["specific strength 1", "specific strength 2"],
  "gaps": ["specific area or category to strengthen 1", "specific area to strengthen 2"],
  "nextSteps": ["actionable step 1", "actionable step 2", "actionable step 3"]
}

Rules:
- nextSteps must be specific, concrete actions (e.g. "Draft and submit an independent STEM research paper", "Organize a student club or community project to gain leadership hours")
- Give exactly 3 practical next steps
- Be encouraging, realistic, and constructive
- Do NOT search for or invent opportunity listings or dates
- Keep language approachable for high school students`;
}

export function buildAiTalkPrompt(
  profileSummary: string,
  activitiesSummary: string,
  history: ChatTurn[],
  newMessage: string,
): string {
  const historyText = history
    .slice(-6)
    .map(
      (turn) =>
        `${turn.role === "user" ? "Student" : "AI Advisor"}: ${turn.text}`,
    )
    .join("\n\n");

  return `You are an encouraging and knowledgeable university admissions & portfolio advisor for secondary school students in Kathmandu, Nepal.
You are having a direct conversation with the student.

STUDENT PROFILE:
${profileSummary}

LOGGED ACTIVITIES & PORTFOLIO:
${activitiesSummary}

PREVIOUS MESSAGES:
${historyText ? historyText : "(Starting new conversation)"}

STUDENT'S QUESTION:
${newMessage}

GUIDELINES:
- Answer directly, practically, and concisely (2-4 brief paragraphs or concise bullet points).
- Tailor your response directly to the student's education level, stated subjects, dream universities, and logged activities.
- Offer realistic advice suitable for Nepali secondary school students (e.g. self-directed projects, local volunteering, academic competitions, essay preparation, portfolio balance).
- Do NOT search for or list raw database opportunity listings. Focus on mentorship, project ideas, skill building, and university preparation.
- Maintain a warm, encouraging, teenage-friendly mentorship tone.`;
}

export function buildCVPrompt(
  profileSummary: string,
  activitiesSummary: string,
  cvPlainText: string,
): string {
  return `You are helping a secondary school student in Kathmandu improve their CV text.

STUDENT PROFILE:
${profileSummary}

ACTIVITIES:
${activitiesSummary}

CURRENT CV DRAFT:
${cvPlainText}

Respond with valid JSON only, no markdown, in this exact shape:
{
  "summary": "2-3 sentence professional summary based only on provided facts",
  "bulletPoints": ["improved bullet 1", "improved bullet 2", "..."]
}

Rules:
- Create 4-8 concise CV bullet points from their real activities only
- Do not invent jobs, awards, grades, or experiences not in the data
- Use action verbs and keep bullets under 25 words each
- If they have few activities, write fewer bullets`;
}

export function parseSuggestionsJSON(text: string): AISuggestionResult | null {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as AISuggestionResult;

    if (!parsed.explanation || !Array.isArray(parsed.nextSteps)) {
      return null;
    }

    return {
      explanation: parsed.explanation,
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.slice(0, 3)
        : [],
      gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 3) : [],
      suggestedOpportunities: [],
      nextSteps: parsed.nextSteps.slice(0, 3),
    };
  } catch {
    return null;
  }
}

export function parseCVJSON(text: string): AICVEnhancement | null {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as AICVEnhancement;

    if (!parsed.summary || !Array.isArray(parsed.bulletPoints)) {
      return null;
    }

    return {
      summary: parsed.summary,
      bulletPoints: parsed.bulletPoints.slice(0, 10),
    };
  } catch {
    return null;
  }
}
