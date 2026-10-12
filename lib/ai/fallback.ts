import type { Activity, Profile } from "@/lib/types";
import type { AISuggestionResult } from "@/lib/ai/prompts";
import { getWeakestCategories, calculatePortfolioScores } from "@/lib/portfolio/score";

export function getFallbackSuggestions(
  profile: Profile | null,
  activities: Activity[],
  _opportunities?: unknown[],
): AISuggestionResult {
  const scores = calculatePortfolioScores(activities);
  const weakCategories = getWeakestCategories(scores, 3);

  const strongCategories = Object.entries(scores)
    .filter(([, score]) => score >= 3)
    .map(([cat]) => cat);

  let explanation: string;
  if (activities.length === 0) {
    explanation =
      "You haven't logged any activities yet. Starting early with 2–3 regular commitments gives you a strong foundation for university applications.";
  } else if (weakCategories.length > 0) {
    explanation = `You have ${activities.length} activit${
      activities.length === 1 ? "y" : "ies"
    } logged. Your portfolio is growing, but admissions officers look for well-rounded profiles — focus on building up ${weakCategories.join(
      ", ",
    )}.`;
  } else {
    explanation = `Great job! You have ${activities.length} activities with balanced coverage across categories. Keep deepening leadership and tangible outcomes.`;
  }

  const nextSteps: string[] = [];

  if (activities.length === 0) {
    nextSteps.push("Log your first activity in the Portfolio section (a school club, course project, or volunteer day).");
  } else if (weakCategories.length > 0) {
    nextSteps.push(`Start an initiative or join a program in ${weakCategories[0]} to round out your profile.`);
  }

  if (profile?.dream_universities) {
    nextSteps.push(
      `Align your upcoming projects with standards for ${profile.dream_universities} (e.g. tangible research, competitions, or team leadership).`,
    );
  } else {
    nextSteps.push("Specify your dream universities and career interests in your profile to refine recommendations.");
  }

  nextSteps.push("Document measurable achievements and specific roles in your activities for a stronger CV.");

  return {
    explanation,
    strengths:
      strongCategories.length > 0
        ? strongCategories.map((c) => `Solid activity count in ${c}`)
        : ["Active student looking to expand experience"],
    gaps:
      weakCategories.length > 0
        ? weakCategories.map((c) => `Needs more entries in ${c}`)
        : ["Keep aiming for higher leadership responsibilities"],
    suggestedOpportunities: [],
    nextSteps: nextSteps.slice(0, 3),
  };
}
