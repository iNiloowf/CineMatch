"use client";

import { AchievementToast } from "@/components/achievement-toast";
import { BottomNav } from "@/components/bottom-nav";
import { MatchToast } from "@/components/match-toast";
import { useAppState } from "@/lib/app-state";

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    isDarkMode,
    unlockedAchievement,
    dismissUnlockedAchievement,
    mutualMatchToast,
    dismissMutualMatchToast,
  } = useAppState();

  return (
    <div
      data-app-shell-root="true"
      data-theme={isDarkMode ? "dark" : "light"}
      className={`min-h-[100svh] min-h-[100dvh] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 sm:px-4 sm:pt-4 ${
        isDarkMode
          ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)] text-slate-100"
          : "bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.55),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(251,207,232,0.42),transparent_26%),linear-gradient(180deg,#fcfbff_0%,#f6f8ff_30%,#eef4ff_68%,#fdf7ff_100%)] text-slate-900"
      }`}
    >
      <AchievementToast
        achievement={unlockedAchievement}
        isDarkMode={isDarkMode}
        onClose={dismissUnlockedAchievement}
      />
      <MatchToast
        toast={mutualMatchToast}
        isDarkMode={isDarkMode}
        onClose={dismissMutualMatchToast}
      />
      <div
        data-app-shell-frame="true"
        className={`fade-up-enter mx-auto flex h-[calc(100svh-env(safe-area-inset-bottom,0px)-1.5rem)] h-[calc(100dvh-env(safe-area-inset-bottom,0px)-1.5rem)] max-w-md flex-col gap-4 sm:h-[calc(100svh-env(safe-area-inset-bottom,0px)-2rem)] sm:h-[calc(100dvh-env(safe-area-inset-bottom,0px)-2rem)] sm:gap-4 ${
          isDarkMode
            ? "text-slate-100"
            : "text-slate-900"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            data-app-scroll-container="true"
            className="flex-1 overflow-y-auto overscroll-contain pb-5"
          >
            {children}
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
