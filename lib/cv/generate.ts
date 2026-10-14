import type { Activity, Opportunity, Profile } from "@/lib/types";
import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import { formatDate } from "@/lib/utils/format";

export interface CVData {
  name: string;
  email: string;
  educationLevel: string | null;
  dreamUniversity: string | null;
  subjects: string | null;
  interests: string | null;
  careerInterests: string | null;
  sections: CVSection[];
}

export interface CVSection {
  category: string;
  entries: CVEntry[];
}

export interface CVEntry {
  title: string;
  date: string;
  description: string;
  notes: string | null;
}

export function buildCVFromProfile(
  profile: Profile,
  activities: Activity[],
): CVData {
  const sections: CVSection[] = ACTIVITY_CATEGORIES.map((category) => ({
    category,
    entries: activities
      .filter((a) => a.category === category)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((a) => ({
        title: a.title,
        date: formatDate(a.date),
        description: a.description,
        notes: a.notes,
      })),
  })).filter((s) => s.entries.length > 0);

  const emailLocal = profile.email.split("@")[0] ?? "Student";
  const displayName = emailLocal
    .split(/[._-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    name: displayName,
    email: profile.email,
    educationLevel: profile.education_level,
    dreamUniversity: profile.dream_universities,
    subjects: profile.subjects,
    interests: profile.interests,
    careerInterests: profile.career_interests,
    sections,
  };
}

export function cvToPlainText(cv: CVData): string {
  const lines: string[] = [];

  lines.push(cv.name.toUpperCase());
  lines.push(cv.email);
  if (cv.educationLevel) lines.push(`Education: ${cv.educationLevel}`);
  if (cv.dreamUniversity) lines.push(`Target university: ${cv.dreamUniversity}`);
  lines.push("");

  if (cv.subjects) {
    lines.push("SUBJECTS");
    lines.push(cv.subjects);
    lines.push("");
  }

  if (cv.careerInterests) {
    lines.push("CAREER INTERESTS");
    lines.push(cv.careerInterests);
    lines.push("");
  }

  if (cv.interests) {
    lines.push("INTERESTS");
    lines.push(cv.interests);
    lines.push("");
  }

  for (const section of cv.sections) {
    lines.push(section.category.toUpperCase());
    for (const entry of section.entries) {
      lines.push(`• ${entry.title} (${entry.date})`);
      lines.push(`  ${entry.description}`);
      if (entry.notes) lines.push(`  Note: ${entry.notes}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function summarizeOpportunitiesForAI(opportunities: Opportunity[]): string {
  return opportunities
    .slice(0, 20)
    .map(
      (o) =>
        `- ID: ${o.id} | Title: ${o.title} | Type: ${o.type} | Subject: ${o.subject_area ?? "General"} | ${o.is_online ? "Online" : "In person"}`,
    )
    .join("\n");
}

export function summarizeActivitiesForAI(activities: Activity[]): string {
  if (activities.length === 0) return "No activities logged yet.";

  return activities
    .map(
      (a) =>
        `- ${a.title} (${a.category}, ${a.date}): ${a.description.slice(0, 120)}`,
    )
    .join("\n");
}

export function summarizeProfileForAI(profile: Profile): string {
  return [
    `Education level: ${profile.education_level ?? "Not set"}`,
    `Dream university: ${profile.dream_universities ?? "Not set"}`,
    `Subjects: ${profile.subjects ?? "Not set"}`,
    `Interests: ${profile.interests ?? "Not set"}`,
    `Career interests: ${profile.career_interests ?? "Not set"}`,
  ].join("\n");
}
