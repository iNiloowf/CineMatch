/**
 * Visual identity for each achievement badge (profile + friend profile).
 * Each id has a distinct gradient + glyph so badges stay recognizable at a glance.
 */
export type AchievementBadgeMeta = {
  /** Single character or emoji shown in the badge face */
  glyph: string;
  /** Tailwind gradient classes (from / to) */
  gradient: string;
  /** Short label under the badge (2 words max) */
  caption: string;
};

export const ACHIEVEMENT_BADGE_BY_ID: Record<string, AchievementBadgeMeta> = {
  "first-pick": {
    glyph: "★",
    gradient: "from-amber-400 via-orange-500 to-rose-600",
    caption: "First pick",
  },
  "movie-collector": {
    glyph: "10",
    gradient: "from-violet-500 via-fuchsia-500 to-purple-700",
    caption: "10 saved",
  },
  "watch-party": {
    glyph: "5",
    gradient: "from-rose-400 via-pink-500 to-fuchsia-700",
    caption: "5 watched",
  },
  connected: {
    glyph: "3",
    gradient: "from-cyan-400 via-teal-500 to-emerald-700",
    caption: "3 friends",
  },
  explorer: {
    glyph: "20",
    gradient: "from-sky-400 via-indigo-500 to-violet-800",
    caption: "20 swipes",
  },
  "vault-25": {
    glyph: "25",
    gradient: "from-indigo-500 via-violet-600 to-slate-900",
    caption: "Deep shelf",
  },
  "watch-12": {
    glyph: "12",
    gradient: "from-fuchsia-500 via-rose-500 to-orange-700",
    caption: "12 shared",
  },
  "swipe-60": {
    glyph: "60",
    gradient: "from-amber-500 via-orange-500 to-red-700",
    caption: "60 swipes",
  },
  "mutual-12": {
    glyph: "12",
    gradient: "from-emerald-400 via-teal-500 to-cyan-800",
    caption: "12 mutual",
  },
  "pro-member": {
    glyph: "PRO",
    gradient: "from-amber-300 via-yellow-500 to-orange-600",
    caption: "Pro member",
  },
};

export function getAchievementBadgeMeta(achievementId: string): AchievementBadgeMeta {
  return (
    ACHIEVEMENT_BADGE_BY_ID[achievementId] ?? {
      glyph: "◎",
      gradient: "from-slate-500 to-slate-800",
      caption: "Badge",
    }
  );
}
