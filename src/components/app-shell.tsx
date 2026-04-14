"use client";

import { AchievementToast } from "@/components/achievement-toast";
import { BottomNav } from "@/components/bottom-nav";
import { useAppState } from "@/lib/app-state";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isDarkMode, unlockedAchievement, dismissUnlockedAchievement } =
    useAppState();

  return (
    <div
      className={`min-h-screen px-4 py-4 ${
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
        className={`fade-up-enter glass-shimmer mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col gap-4 rounded-[36px] p-3 backdrop-blur-xl ${
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
        <div className="flex flex-1 flex-col gap-4">{children}</div>
        <BottomNav />
      </div>
    </div>
  );
}
