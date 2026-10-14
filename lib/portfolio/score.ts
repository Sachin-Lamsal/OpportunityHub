import { ACTIVITY_CATEGORIES } from "@/lib/constants";
import type { Activity, ActivityCategory } from "@/lib/types";

export interface CategoryScore {
  category: ActivityCategory;
  score: number;
  activityCount: number;
  label: string;
}

export interface PortfolioScores {
  categories: CategoryScore[];
  overall: number;
  totalActivities: number;
}

const SCORE_LABELS: { max: number; label: string }[] = [
  { max: 0, label: "Not started" },
  { max: 39, label: "Getting started" },
  { max: 69, label: "Building" },
  { max: 89, label: "Strong" },
  { max: 100, label: "Excellent" },
];

/** Points per activity in a category (simple rule-based scoring). */
const POINTS_PER_ACTIVITY = 20;
const MAX_CATEGORY_SCORE = 100;

function getScoreLabel(score: number): string {
  for (const tier of SCORE_LABELS) {
    if (score <= tier.max) return tier.label;
  }
  return "Excellent";
}

export function getOverallScoreLabel(score: number): string {
  return getScoreLabel(score);
}

function scoreForCount(count: number): number {
  return Math.min(count * POINTS_PER_ACTIVITY, MAX_CATEGORY_SCORE);
}

export function calculatePortfolioScores(
  activities: Activity[],
): PortfolioScores {
  const countByCategory = ACTIVITY_CATEGORIES.reduce(
    (acc, category) => {
      acc[category] = 0;
      return acc;
    },
    {} as Record<ActivityCategory, number>,
  );

  for (const activity of activities) {
    if (activity.category in countByCategory) {
      countByCategory[activity.category as ActivityCategory] += 1;
    }
  }

  const categories: CategoryScore[] = ACTIVITY_CATEGORIES.map((category) => {
    const activityCount = countByCategory[category];
    const score = scoreForCount(activityCount);

    return {
      category,
      score,
      activityCount,
      label: getScoreLabel(score),
    };
  });

  const overall = Math.round(
    categories.reduce((sum, c) => sum + c.score, 0) / categories.length,
  );

  return {
    categories,
    overall,
    totalActivities: activities.length,
  };
}

export function getWeakestCategories(
  scores: PortfolioScores,
  limit = 2,
): ActivityCategory[] {
  return [...scores.categories]
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .filter((c) => c.score < MAX_CATEGORY_SCORE)
    .map((c) => c.category);
}
