/**
 * Recommendation scoring engine for student opportunity matching.
 */

import type { Opportunity, Profile } from "@/lib/types";

export interface ScoreBreakdown {
  keywordScore: number;
  subjectScore: number;
  categoryScore: number;
  eligibilityScore: number;
  fundingScore: number;
  locationScore: number;
  recencyScore: number;
  total: number;
}

export interface RecommendationResult {
  opportunity: Opportunity;
  score: number;
  breakdown: ScoreBreakdown;
  explanations: string[];
  eligibilityStatus: "eligible" | "uncertain" | "ineligible";
  disqualified?: string;
}

/**
 * Extract keywords from profile text fields.
 */
export function extractProfileKeywords(profile: Profile): string[] {
  const keywords: string[] = [];
  const fields = [
    profile.subjects,
    profile.interests,
    profile.career_interests,
    profile.dream_universities,
  ];
  for (const field of fields) {
    if (field) {
      const parts = field.split(/[,;\n]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      keywords.push(...parts);
    }
  }
  return [...new Set(keywords)];
}

function keywordMatches(opportunity: Opportunity, profileKeywords: string[]): number {
  const text = [
    opportunity.title,
    opportunity.description,
    opportunity.subject_area,
    opportunity.tags?.join(" ") ?? "",
    opportunity.organizer,
  ]
    .join(" ")
    .toLowerCase();

  let matches = 0;
  for (const kw of profileKeywords) {
    if (kw.length < 3) continue;
    const normalizedKw = kw.replace(/\s+/g, " ");
    if (text.includes(normalizedKw)) {
      matches += 1;
    }
  }
  return Math.min(matches, 3); // Cap at 3 to avoid over-rewarding
}

function subjectMatches(opportunity: Opportunity, profile: Profile): number {
  if (!profile.subjects || !opportunity.subject_area) return 0;
  const studentSubjects = profile.subjects.toLowerCase();
  const oppSubject = opportunity.subject_area.toLowerCase();
  return studentSubjects.includes(oppSubject) ? 2 : oppSubject.includes(studentSubjects) ? 1 : 0;
}

function categoryMatches(opportunity: Opportunity, profile: Profile): number {
  // Using opportunity.type against career interests or interests
  const interestsText = (profile.interests || profile.career_interests || "").toLowerCase();
  const typeLower = opportunity.type.toLowerCase();
  const mapping: Record<string, string[]> = {
    Competition: ["competition", "math", "science", "debate", "academic"],
    Workshop: ["workshop", "training", "learning"],
    Internship: ["internship", "work", "career", "experience"],
    Volunteering: ["volunteer", "service", "community"],
    "Summer Program": ["summer", "program", "camp"],
    Scholarship: ["scholarship", "funding", "award", "grant"],
    Club: ["club", "group", "team"],
  };
  const keywords = mapping[typeLower] || [typeLower];
  for (const kw of keywords) {
    if (interestsText.includes(kw)) return 2;
  }
  return 0;
}

function eligibilityCheck(opportunity: Opportunity, profile: Profile): number {
  // Basic eligibility based on education level matching grade_requirements
  // We do NOT invent requirements; only apply when clearly present
  const gradeReq = opportunity.grade_requirements?.toLowerCase() || "";
  const studentLevel = profile.education_level?.toLowerCase() || "";

  // If grade_requirements exists but doesn't mention student's level, mark uncertain
  let score = 1;
  if (gradeReq) {
    // Check for known exclusion patterns (simplified)
    if (studentLevel) {
      if (gradeReq.includes(studentLevel.split(" ")[1]) || gradeReq.includes(studentLevel)) {
        score = 3;
      } else if (gradeReq.includes("grade") || gradeReq.includes("level")) {
        // If grade requirements are specified but don't clearly match, keep at 1 (uncertain base)
        score = 1;
      }
    }
  }
  return score;
}

function fundingCheck(opportunity: Opportunity): number {
  const cost = opportunity.cost?.toLowerCase() || "";
  const description = opportunity.description.toLowerCase();
  const isFunded = cost.includes("free") || cost.includes("fully funded") || cost.includes("scholarship included") || description.includes("fully funded");
  // Do not claim fully funded unless evidence clearly supports it in description or cost
  return isFunded ? 2 : cost.includes("fee") ? 0 : 1;
}

function locationCheck(opportunity: Opportunity): number {
  const online = opportunity.is_online === true ? 1 : 0;
  return online; // Prefer online for broader accessibility; not a disqualifier
}

function recencyCheck(opportunity: Opportunity): number {
  const created = new Date(opportunity.created_at);
  const now = new Date();
  const daysOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld < 7) return 2;
  if (daysOld < 30) return 1;
  return 0;
}

export function calculateRecommendations(
  opportunities: Opportunity[],
  profile: Profile,
): RecommendationResult[] {
  const profileKeywords = extractProfileKeywords(profile);

  const results: RecommendationResult[] = [];

  for (const opp of opportunities) {
    // Hard publication safeguards: only process clearly published public records
    // Do not process unverified/rejected/high-risk discovery candidates
    if ((opp.source_type as string) === "discovery_unverified" || (opp.source_type as string) === "rejected") {
      continue;
    }

    // Eligibility hard exclusions (simplified deterministic rules)
    if (!opp.is_verified && opp.verification_status !== "verified") {
      // Not a hard disqualifier for recommendation display if still published,
      // but we note it in eligibility status
    }

    const keywordScore = Math.min(keywordMatches(opp, profileKeywords) * 2, 6);
    const subjectScore = subjectMatches(opp, profile) * 3;
    const categoryScore = categoryMatches(opp, profile) * 2;
    const eligibilityScore = eligibilityCheck(opp, profile) * 2;
    const fundingScore = fundingCheck(opp) * 2;
    const locationScore = locationCheck(opp) * 1;
    const recencyScore = recencyCheck(opp);

    const total =
      keywordScore +
      subjectScore +
      categoryScore +
      eligibilityScore +
      fundingScore +
      locationScore +
      recencyScore;

    const explanations: string[] = [];
    if (keywordScore >= 4) {
      explanations.push(`Matches your interest in ${profile.interests || profile.subjects || "related topics"}.`);
    }
    if (subjectScore >= 2) {
      explanations.push(`Fits your studies in ${profile.subjects || "this subject area"}.`);
    }
    if (categoryScore >= 2) {
      explanations.push(`Relevant opportunity category based on your interests.`);
    }
    if (eligibilityScore >= 2) {
      explanations.push(`Fits your current education level.`);
    }
    if (fundingScore >= 2) {
      explanations.push(`Matches your preference for fully funded programs.`);
    } else if (fundingScore === 0) {
      explanations.push("Includes program costs (not fully funded).");
    }
    if (explanations.length === 0) {
      explanations.push("Recommended based on general match with your profile.");
    }

    // Determine eligibility status without inventing info
    let eligibilityStatus: "eligible" | "uncertain" | "ineligible" = "uncertain";
    if (keywordScore >= 2 && eligibilityScore >= 2 && total >= 8) {
      eligibilityStatus = "eligible";
    } else if (keywordScore === 0 && eligibilityScore === 0 && total < 3) {
      eligibilityStatus = "uncertain";
    }

    results.push({
      opportunity: opp,
      score: total,
      breakdown: {
        keywordScore,
        subjectScore,
        categoryScore,
        eligibilityScore,
        fundingScore,
        locationScore,
        recencyScore,
        total,
      },
      explanations,
      eligibilityStatus,
    });
  }

  // Sort by total score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}
