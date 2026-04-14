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
        className={`fade-up-enter glass-shimmer mx-auto flex h-[calc(100dvh-env(safe-area-inset-bottom,0px)-1.5rem)] max-w-md flex-col gap-3 overflow-hidden rounded-[32px] p-3 backdrop-blur-xl sm:h-[calc(100dvh-env(safe-area-inset-bottom,0px)-2rem)] sm:gap-4 sm:rounded-[36px] ${
          isDarkMode
            ? "border border-white/10 bg-white/6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
            : "border border-white/60 bg-white/55 shadow-[0_30px_90px_rgba(133,94,201,0.18)]"
        }`}
      >
        <div className="pointer-events-none flex justify-center pb-1 pt-1">
          <div
            className={`soft-pulse h-1.5 w-20 rounded-full ${
              isDarkMode ? "bg-white/18" : "bg-slate-300/70"
            }`}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain pb-2">
            {children}
          </div>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
