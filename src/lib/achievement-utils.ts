import type { Achievement } from "@/lib/types";

export function isAchievementComplete(achievement: Achievement): boolean {
  return !achievement.isLocked && achievement.progress >= achievement.target;
}

export function partitionAchievements(achievements: Achievement[]): {
  completed: Achievement[];
  incomplete: Achievement[];
} {
  const completed: Achievement[] = [];
  const incomplete: Achievement[] = [];

  for (const achievement of achievements) {
    if (isAchievementComplete(achievement)) {
      completed.push(achievement);
    } else {
      incomplete.push(achievement);
    }
  }

  return { completed, incomplete };
}
