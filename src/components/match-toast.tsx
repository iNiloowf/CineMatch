"use client";

import { useEffect, useRef } from "react";
import type { MutualMatchToastPayload } from "@/lib/types";
import { useEscapeToClose } from "@/lib/use-escape-to-close";

type MatchToastProps = {
  toast: MutualMatchToastPayload | null;
  isDarkMode: boolean;
  onClose: () => void;
};

export function MatchToast({ toast, isDarkMode, onClose }: MatchToastProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEscapeToClose(Boolean(toast), onClose);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      onCloseRef.current();
    }, 15000);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) {
    return null;
  }

  const partnerLabel =
    toast.partners.length === 1
      ? toast.partners[0]
      : toast.partners.slice(0, -1).join(", ") + " & " + toast.partners[toast.partners.length - 1];

  const shell = isDarkMode
    ? "border border-emerald-400/25 bg-slate-950/94 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
    : "border border-emerald-200/90 bg-white/96 text-slate-900 shadow-[0_16px_44px_rgba(16,185,129,0.12)]";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[var(--z-banner)] flex justify-center px-4 pt-[max(0.25rem,env(safe-area-inset-top,0px))]">
      <div
        role="status"
        aria-live="polite"
        className={`app-notify-banner pointer-events-auto relative w-full max-w-md overflow-hidden rounded-[26px] px-4 py-3.5 backdrop-blur-xl ${shell}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${
              isDarkMode
                ? "bg-emerald-500/22 text-emerald-200"
                : "bg-emerald-50 text-emerald-600"
            }`}
            aria-hidden="true"
          >
            ◎
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
                isDarkMode ? "text-emerald-300/90" : "text-emerald-700"
              }`}
            >
              Mutual match
            </p>
            <p className={`mt-1 text-sm font-semibold leading-snug ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {toast.movieTitle}
            </p>
            <p className={`mt-1 text-xs leading-5 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              You and {partnerLabel} both saved this one.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss match notification"
            className={`min-h-11 shrink-0 rounded-full px-3 text-xs font-semibold ${
              isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
