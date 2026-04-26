"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { AchievementToast } from "@/components/achievement-toast";
import { BottomNav } from "@/components/bottom-nav";
import { FriendLinkToast } from "@/components/friend-link-toast";
import { MatchToast } from "@/components/match-toast";
import { OfflineBanner } from "@/components/offline-banner";
import { TabScreenTransition } from "@/components/tab-screen-transition";
import { useAppState } from "@/lib/app-state";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  /** Discover1/2 both use `/discover` — keep their compact bottom inset (no edits in discover-2-content). */
  const isDiscoverRoute = pathname === "/discover";
  const {
    isDarkMode,
    unlockedAchievement,
    dismissUnlockedAchievement,
    mutualMatchToast,
    dismissMutualMatchToast,
    friendLinkNotifyToast,
    dismissFriendLinkNotifyToast,
  } = useAppState();

  return (
    <div
      data-app-shell-root="true"
      data-theme={isDarkMode ? "dark" : "light"}
      data-discover-tab={isDiscoverRoute ? "true" : "false"}
      style={
        {
          "--app-main-pad-bottom": isDiscoverRoute
            ? "var(--app-scroll-pad-bottom-discover)"
            : "var(--app-scroll-pad-bottom)",
        } as CSSProperties
      }
      className={`app-safe-x relative flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-x-clip overflow-y-hidden pb-0 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:pt-4 ${
        isDarkMode
          ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)] text-slate-100"
          : "bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.55),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(251,207,232,0.42),transparent_26%),linear-gradient(180deg,#fcfbff_0%,#f6f8ff_30%,#eef4ff_68%,#fdf7ff_100%)] text-slate-900"
      }`}
    >
      <a
        href="#main-content"
        className={`fixed z-[calc(var(--z-modal-backdrop)+3)] -translate-y-[140%] rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition-transform duration-150 focus:translate-y-4 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent ${
          isDarkMode
            ? "bg-violet-500 text-white focus:ring-violet-300"
            : "bg-violet-600 text-white focus:ring-violet-400"
        }`}
        style={{
          top: "max(0.75rem, env(safe-area-inset-top, 0px))",
          left: "max(1rem, env(safe-area-inset-left, 0px))",
        }}
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
      <FriendLinkToast
        toast={friendLinkNotifyToast}
        isDarkMode={isDarkMode}
        onClose={dismissFriendLinkNotifyToast}
      />
      <div
        data-app-shell-frame="true"
        className={`fade-up-enter mx-auto flex min-h-0 w-full min-w-0 max-w-md flex-1 flex-col ${
          isDarkMode ? "text-slate-100" : "text-slate-900"
        }`}
      >
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <OfflineBanner />
          <div
            id="main-content"
            data-app-scroll-container="true"
            tabIndex={-1}
            className="relative z-0 flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
          >
            <TabScreenTransition>{children}</TabScreenTransition>
            {/**
             * Scroll-end inset as a real flex child (not padding on the scrollport): in WebKit/embedded
             * webviews, bottom padding on a flex+scroll main often does not add reliable scrollable space.
             */}
            <div
              aria-hidden
              className="w-full shrink-0 [block-size:var(--app-main-pad-bottom)]"
            />
          </div>
        </div>
      </div>
      {/*
        Fade-out band above the nav (z below nav): scroll content stays visible in the main
        safe area / upper nav, then fades so it is not visible from mid-nav downward.
      */}
      <div
        aria-hidden
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-[19] h-[calc(env(safe-area-inset-bottom,0px)+0.25rem+clamp(3.25rem,15vmin,4.75rem))] bg-gradient-to-t ${
          isDarkMode
            ? "from-[#09090f] via-[#09090f]/85 to-transparent"
            : "from-[#fdf7ff] via-[#fdf7ff]/82 to-transparent"
        }`}
      />
      <BottomNav />
    </div>
  );
}
