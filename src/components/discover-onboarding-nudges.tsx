"use client";

import { useCallback, useEffect, useState } from "react";

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

  if (!hasActiveBrowse) {
    return null;
  }

  const shell = isDarkMode
    ? "border border-white/10 bg-white/6 text-slate-100"
    : "border border-slate-200/90 bg-slate-50/95 text-slate-900";

  if (!gesturesDismissed) {
    return (
      <div
        className={`shrink-0 rounded-[18px] px-3 py-2.5 text-[12px] leading-snug shadow-sm ${shell}`}
        role="status"
      >
        <div className="flex items-start justify-between gap-2">
          <p className={`min-w-0 flex-1 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
            <span className="font-semibold">Discover:</span> swipe the card right to save a pick,
            left to pass — or use Accept / Reject below.
          </p>
          <button
            type="button"
            onClick={dismissGestures}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isDarkMode ? "bg-white/10 text-white" : "bg-violet-100 text-violet-800"
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  if (!filtersDismissed) {
    return (
      <div
        className={`shrink-0 rounded-[18px] px-3 py-2.5 text-[12px] leading-snug shadow-sm ${shell}`}
        role="status"
      >
        <div className="flex items-start justify-between gap-2">
          <p className={`min-w-0 flex-1 ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
            <span className="font-semibold">Filters:</span> tap the funnel next to search to
            narrow the queue by genre.
          </p>
          <button
            type="button"
            onClick={dismissFilters}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              isDarkMode ? "bg-white/10 text-white" : "bg-violet-100 text-violet-800"
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  return null;
}
