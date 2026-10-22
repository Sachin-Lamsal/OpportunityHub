/**
 * Student profile completeness.
 *
 * The fields listed here are the ones the product actually uses: the CV
 * builder reads them, the AI advisor reads them, and the onboarding wizard
 * asks for them. A field is "complete" when it holds a non-empty value — no
 * field is invented just to make the percentage look better.
 */

import type { Profile } from "@/lib/types";

export interface ProfileFieldStatus {
  /** The profile column, used to build a link to the right form field. */
  key: string;
  /** The label shown to the student. */
  label: string;
  /** Why this field matters, shown next to the missing item. */
  hint: string;
  complete: boolean;
}

export interface ProfileCompletion {
  /** 0–100, rounded to the nearest whole percent. */
  percent: number;
  complete: number;
  total: number;
  fields: ProfileFieldStatus[];
  /** The fields that are still empty, in the order they are listed above. */
  missing: ProfileFieldStatus[];
}

const STUDENT_PROFILE_FIELDS: { key: string; label: string; hint: string }[] = [
  {
    key: "education_level",
    label: "Education level",
    hint: "Tailors the advice on your dashboard to your grade.",
  },
  {
    key: "dream_universities",
    label: "Dream university",
    hint: "Adds a target university to the CV you export.",
  },
  {
    key: "subjects",
    label: "Subjects",
    hint: "Used to match you with opportunities in your subjects.",
  },
  {
    key: "interests",
    label: "Interests",
    hint: "Feeds the AI advisor so its suggestions are relevant to you.",
  },
  {
    key: "career_interests",
    label: "Career interests",
    hint: "Adds a career direction section to your CV.",
  },
];

function hasValue(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Computes how complete a student profile is.
 *
 * Returns null when the profile is not a student profile, so school and
 * organization accounts never show a student completion meter.
 */
export function getProfileCompletion(
  profile: Profile | null | undefined,
): ProfileCompletion | null {
  if (!profile || profile.account_type !== "student") return null;

  const fields: ProfileFieldStatus[] = STUDENT_PROFILE_FIELDS.map((field) => ({
    ...field,
    complete: hasValue(
      (profile as unknown as Record<string, string | null>)[field.key],
    ),
  }));

  const complete = fields.filter((field) => field.complete).length;
  const total = fields.length;

  return {
    percent: total === 0 ? 0 : Math.round((complete / total) * 100),
    complete,
    total,
    fields,
    missing: fields.filter((field) => !field.complete),
  };
}
