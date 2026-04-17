"use client";

import type { Achievement } from "@/lib/types";
import { getAchievementBadgeMeta } from "@/lib/achievement-badge-meta";

type AchievementBadgesShowcaseProps = {
  /** Only pass completed / earned achievements */
  earned: Achievement[];
  isDarkMode: boolean;
  /** Profile owner vs friend — only affects helper copy */
  variant: "self" | "friend";
};

export function AchievementBadgesShowcase({
  earned,
  isDarkMode,
  variant,
}: AchievementBadgesShowcaseProps) {
  const eyebrow = isDarkMode
    ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90"
    : "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600/90";

  if (earned.length === 0) {
    return (
      <div
        className={`rounded-[22px] border px-4 py-5 text-center ${
          isDarkMode ? "border-white/10 bg-white/[0.03]" : "border-slate-200/80 bg-slate-50/80"
        }`}
      >
        <p className={eyebrow}>Badges</p>
        <p className={`mt-2 text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          No badges yet
        </p>
        <p className={`mt-1 text-xs leading-5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          {variant === "self"
            ? "Complete goals in Settings to earn badges here."
            : "They haven’t earned badges yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className={eyebrow}>Badges</p>
        <p className={`mt-1 text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
          {variant === "self" ? "Your earned badges" : "Their badges"}
        </p>
        <p className={`mt-1 text-xs leading-5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
          Each shape and color matches one achievement — see the short label under each badge.
        </p>
      </div>
      <ul
        className="grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4"
        aria-label={variant === "self" ? "Your achievement badges" : "Their achievement badges"}
      >
        {earned.map((achievement) => {
          const meta = getAchievementBadgeMeta(achievement.id);
          return (
            <li key={achievement.id} className="flex flex-col items-center text-center">
              <div
                className={`flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-2xl bg-gradient-to-br shadow-[0_8px_24px_rgba(15,23,42,0.25)] ring-2 ring-white/25 sm:h-14 sm:w-14 ${meta.gradient}`}
                title={`${achievement.title}: ${achievement.description}`}
              >
                <span className="text-lg font-black tabular-nums text-white drop-shadow-sm sm:text-xl">
                  {meta.glyph}
                </span>
              </div>
              <p
                className={`mt-2 w-full max-[8rem] break-words text-[10px] font-semibold leading-tight sm:text-[11px] ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {meta.caption}
              </p>
              <p
                className={`mt-0.5 line-clamp-2 w-full max-[8rem] text-[9px] leading-snug ${
                  isDarkMode ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {achievement.title}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
