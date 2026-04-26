"use client";

import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const { isDarkMode, currentUserId, retryAccountSync } = useAppState();
  const [dismissed, setDismissed] = useState(false);
  const prevOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    const prev = prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (prev === null) {
      return;
    }

    if (prev === true && isOnline === false) {
      setDismissed(false);
    }

    if (prev === false && isOnline === true) {
      setDismissed(false);
      if (currentUserId) {
        queueMicrotask(() => {
          retryAccountSync();
        });
      }
    }
  }, [isOnline, currentUserId, retryAccountSync]);

  if (isOnline || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-2 flex shrink-0 items-start gap-2 rounded-2xl border px-3 py-2.5 text-sm shadow-sm ${
        isDarkMode
          ? "border-amber-400/40 bg-amber-500/18 text-amber-50"
          : "border-amber-300/90 bg-amber-50 text-amber-950"
      }`}
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" className="size-5">
          <path
            d="M4 14.5A9 9 0 0 1 12 6c1.85 0 3.57.56 5 1.52M8 18a9 9 0 0 0 12-9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M2 2 22 22"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <p className="min-w-0 flex-1 leading-snug">
        <span className="font-semibold">You&apos;re offline.</span> Picks, friends, and other changes
        may not save until you reconnect. When you&apos;re back online, we try to sync your account
        automatically; you can also use Retry on any error you see.
      </p>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className={`flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-xl text-sm font-medium transition hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/80 ${
          isDarkMode ? "text-amber-100/90" : "text-amber-900/80"
        }`}
        aria-label="Dismiss offline message"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden>
          <path
            d="M6 6 18 18M18 6 6 18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}
