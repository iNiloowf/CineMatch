"use client";

import { useAppState } from "@/lib/app-state";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

/**
 * When the server can’t be reached but a local user profile exists, `ProtectedScreen`
 * still allows the app — show a non-blocking error + recovery.
 */
export function AccountSyncErrorBanner() {
  const isOnline = useOnlineStatus();
  const {
    isDarkMode,
    currentUser,
    currentUserId,
    accountSyncError,
    isSyncingAccountData,
    retryAccountSync,
    dismissAccountSyncError,
  } = useAppState();

  if (!accountSyncError || !currentUserId || !currentUser || isSyncingAccountData) {
    return null;
  }

  const sub =
    isOnline === false
      ? "We’ll try again when you’re back online (or tap Retry to force a check)."
      : "Your latest picks and friends may be out of date until sync succeeds.";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`mb-2 flex shrink-0 items-start gap-2 rounded-2xl border px-3 py-2.5 text-sm shadow-sm ${
        isDarkMode
          ? "border-rose-400/40 bg-rose-500/15 text-rose-50"
          : "border-rose-200/90 bg-rose-50 text-rose-950"
      }`}
    >
      <span className="mt-0.5 shrink-0" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" className="size-5">
          <path
            d="M12 7v6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16" r="1.2" fill="currentColor" />
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="currentColor"
            strokeWidth="1.4"
            opacity="0.5"
          />
        </svg>
      </span>
      <div className="min-w-0 flex-1 leading-snug">
        <p className="font-semibold">Cloud sync is paused</p>
        <p
          className={
            isDarkMode ? "mt-0.5 text-rose-100/90" : "mt-0.5 text-rose-900/80"
          }
        >
          {accountSyncError}
        </p>
        <p
          className={
            isDarkMode ? "mt-1 text-xs text-rose-200/75" : "mt-1 text-xs text-rose-900/65"
          }
        >
          {sub}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => retryAccountSync()}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => dismissAccountSyncError()}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 ${
              isDarkMode
                ? "text-rose-100/90 hover:bg-white/10 focus-visible:ring-rose-200/50"
                : "text-rose-900/80 hover:bg-rose-100/80 focus-visible:ring-rose-400/40"
            }`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
