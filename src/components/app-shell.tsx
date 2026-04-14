"use client";

import { AchievementToast } from "@/components/achievement-toast";
import { BottomNav } from "@/components/bottom-nav";
import { useAppState } from "@/lib/app-state";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isDarkMode, unlockedAchievement, dismissUnlockedAchievement } =
    useAppState();

  return (
    <div
      className={`min-h-[100dvh] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 sm:px-4 sm:pt-4 ${
        isDarkMode
          ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)] text-slate-100"
          : "bg-[linear-gradient(180deg,#f7f4ff_0%,#f8fafc_28%,#eef2ff_100%)] text-slate-900"
      }`}
    >
      <AchievementToast
        achievement={unlockedAchievement}
        onClose={dismissUnlockedAchievement}
      />
      <div
        className={`fade-up-enter mx-auto flex h-[calc(100dvh-env(safe-area-inset-bottom,0px)-1.5rem)] max-w-md flex-col gap-3 sm:h-[calc(100dvh-env(safe-area-inset-bottom,0px)-2rem)] sm:gap-4 ${
          isDarkMode
            ? "text-slate-100"
            : "text-slate-900"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            data-app-scroll-container="true"
            className="flex-1 overflow-y-auto overscroll-contain pb-2"
          >
            {children}
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
