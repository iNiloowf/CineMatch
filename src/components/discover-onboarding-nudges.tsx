"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

function nudgeStorageKey(userId: string | null, tip: "gestures" | "filters") {
  return `cinematch-discover-nudge-${tip}-${userId ?? "guest"}`;
}

function readDismissed(userId: string | null, tip: "gestures" | "filters"): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(nudgeStorageKey(userId, tip)) === "1";
}

function writeDismissed(userId: string | null, tip: "gestures" | "filters") {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(nudgeStorageKey(userId, tip), "1");
}

type DiscoverOnboardingNudgesProps = {
  userId: string | null;
  isDarkMode: boolean;
  /** Show gesture / filter tips only when there is an active title to swipe. */
  hasActiveBrowse: boolean;
};

export function DiscoverOnboardingNudges({
  userId,
  isDarkMode,
  hasActiveBrowse,
}: DiscoverOnboardingNudgesProps) {
  const [gesturesDismissed, setGesturesDismissed] = useState(() =>
    readDismissed(userId, "gestures"),
  );
  const [filtersDismissed, setFiltersDismissed] = useState(() =>
    readDismissed(userId, "filters"),
  );
  const autoTimerRef = useRef<number | null>(null);

  const dismissGestures = useCallback(() => {
    writeDismissed(userId, "gestures");
    setGesturesDismissed(true);
  }, [userId]);

  const dismissFilters = useCallback(() => {
    writeDismissed(userId, "filters");
    setFiltersDismissed(true);
  }, [userId]);

  useEffect(() => {
    setGesturesDismissed(readDismissed(userId, "gestures"));
    setFiltersDismissed(readDismissed(userId, "filters"));
  }, [userId]);

  useEffect(() => {
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    if (!hasActiveBrowse || (gesturesDismissed && filtersDismissed)) {
      return;
    }

    autoTimerRef.current = window.setTimeout(() => {
      if (!gesturesDismissed) {
        writeDismissed(userId, "gestures");
        setGesturesDismissed(true);
      } else if (!filtersDismissed) {
        writeDismissed(userId, "filters");
        setFiltersDismissed(true);
      }
      autoTimerRef.current = null;
    }, 15000);

    return () => {
      if (autoTimerRef.current) {
        window.clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [hasActiveBrowse, gesturesDismissed, filtersDismissed, userId]);

  if (!hasActiveBrowse || (gesturesDismissed && filtersDismissed)) {
    return null;
  }

  const shell = isDarkMode
    ? "border border-white/12 bg-slate-950/92 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
    : "border border-slate-200/90 bg-white/96 text-slate-900 shadow-[0_16px_44px_rgba(15,23,42,0.1)]";

  const node = !gesturesDismissed ? (
    <div
      className={`app-notify-banner pointer-events-none fixed inset-x-0 top-4 z-[var(--z-banner)] flex justify-center px-4 pt-[max(0.25rem,env(safe-area-inset-top,0px))]`}
    >
      <div
        className={`pointer-events-auto relative w-full max-w-md rounded-[26px] px-4 py-3.5 backdrop-blur-xl ${shell}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <p className={`min-w-0 flex-1 text-[13px] leading-snug ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
            <span className={`font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Discover:</span> swipe
            left or right on the poster to move to the <span className="font-semibold">previous or next</span> title.
            Use <span className="font-semibold">Accept</span> or <span className="font-semibold">Reject</span> below
            to save a pick or pass.
          </p>
          <button
            type="button"
            onClick={dismissGestures}
            className={`min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold ${
              isDarkMode ? "bg-white/12 text-white" : "bg-violet-100 text-violet-800"
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div
      className={`app-notify-banner pointer-events-none fixed inset-x-0 top-4 z-[var(--z-banner)] flex justify-center px-4 pt-[max(0.25rem,env(safe-area-inset-top,0px))]`}
    >
      <div
        className={`pointer-events-auto relative w-full max-w-md rounded-[26px] px-4 py-3.5 backdrop-blur-xl ${shell}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <p className={`min-w-0 flex-1 text-[13px] leading-snug ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
            <span className={`font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Filters:</span> tap the
            funnel next to search to narrow the queue by genre.
          </p>
          <button
            type="button"
            onClick={dismissFilters}
            className={`min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold ${
              isDarkMode ? "bg-white/12 text-white" : "bg-violet-100 text-violet-800"
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(node, document.body);
}
