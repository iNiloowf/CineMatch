"use client";

import { AchievementToast } from "@/components/achievement-toast";
import { BottomNav } from "@/components/bottom-nav";
import { MatchToast } from "@/components/match-toast";
import { OfflineBanner } from "@/components/offline-banner";
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
      className={`relative flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden px-3 pb-0 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-4 sm:pt-4 ${
        isDarkMode
          ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)] text-slate-100"
          : "bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.55),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(251,207,232,0.42),transparent_26%),linear-gradient(180deg,#fcfbff_0%,#f6f8ff_30%,#eef4ff_68%,#fdf7ff_100%)] text-slate-900"
      }`}
    >
      <a
        href="#main-content"
        className={`fixed left-4 z-[calc(var(--z-modal-backdrop)+3)] -translate-y-[140%] rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-transform duration-150 focus:translate-y-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${
          isDarkMode
            ? "bg-violet-500 text-white focus:ring-violet-300"
            : "bg-violet-600 text-white focus:ring-violet-400"
        }`}
        style={{ top: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        Skip to main content
      </a>
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
        className={`fade-up-enter mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col ${
          isDarkMode ? "text-slate-100" : "text-slate-900"
        }`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <OfflineBanner />
          <div
            id="main-content"
            data-app-scroll-container="true"
            tabIndex={-1}
            className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[var(--app-scroll-pad-bottom)] outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
          >
            {children}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
