"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { FriendLinkNotifyPayload } from "@/lib/types";
import { useEscapeToClose } from "@/lib/use-escape-to-close";

type FriendLinkToastProps = {
  toast: FriendLinkNotifyPayload | null;
  isDarkMode: boolean;
  onClose: () => void;
};

const AUTO_DISMISS_MS = 14_000;

export function FriendLinkToast({ toast, isDarkMode, onClose }: FriendLinkToastProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEscapeToClose(Boolean(toast), onClose);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => {
      onCloseRef.current();
    }, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!toast) {
    return null;
  }

  const isIncoming = toast.kind === "incoming_request";
  const eyebrow = isIncoming ? "Friend request" : "Friends";
  const body = isIncoming
    ? `${toast.displayName} sent a friend request. Open Friends → Requests.`
    : `You and ${toast.displayName} are now friends.`;

  const shell = isDarkMode
    ? "border border-violet-400/25 bg-slate-950/94 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
    : "border border-violet-200/90 bg-white/96 text-slate-900 shadow-[0_16px_44px_rgba(109,40,217,0.12)]";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[var(--z-banner)] flex items-center justify-center px-4 [padding-top:max(0.75rem,env(safe-area-inset-top,0px))] [padding-bottom:max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-5"
    >
      <div
        role="status"
        aria-live="polite"
        className={`app-notify-banner pointer-events-auto relative w-full max-w-md overflow-hidden rounded-[26px] px-4 py-3.5 backdrop-blur-xl ${shell}`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${
              isDarkMode
                ? "bg-violet-500/25 text-violet-200"
                : "bg-violet-100 text-violet-700"
            }`}
            aria-hidden="true"
          >
            {isIncoming ? "👤" : "🤝"}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
                isDarkMode ? "text-violet-300/90" : "text-violet-700"
              }`}
            >
              {eyebrow}
            </p>
            <p
              className={`mt-1 break-words font-mono text-sm font-semibold leading-snug ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              @{toast.publicHandle}
            </p>
            <p className={`mt-1.5 text-sm font-semibold leading-snug ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {isIncoming ? "added you" : "accepted your request"}
            </p>
            <p className={`mt-1 text-xs leading-5 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>{body}</p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            {isIncoming ? (
              <Link
                href="/friends?tab=requests"
                onClick={onClose}
                className={`min-h-9 rounded-full px-2.5 py-2 text-center text-xs font-semibold ${
                  isDarkMode ? "bg-violet-500/40 text-white" : "bg-violet-600 text-white"
                }`}
              >
                Open
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              className={`min-h-9 rounded-full px-2.5 text-xs font-semibold ${
                isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
              }`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
