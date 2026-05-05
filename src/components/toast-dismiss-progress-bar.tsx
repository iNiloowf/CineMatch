"use client";

import { TOAST_AUTO_DISMISS_MS } from "@/lib/toast-auto-dismiss";

export type ToastDismissBarAccent = "violet" | "emerald";

type ToastDismissProgressBarProps = {
  isDarkMode: boolean;
  accent: ToastDismissBarAccent;
  /** Match the `setTimeout` that calls `onClose` (default: global toast duration). */
  durationMs?: number;
};

export function ToastDismissProgressBar({
  isDarkMode,
  accent,
  durationMs = TOAST_AUTO_DISMISS_MS,
}: ToastDismissProgressBarProps) {
  const track = isDarkMode ? "bg-white/[0.12]" : "bg-slate-200/90";
  const fill =
    accent === "emerald"
      ? isDarkMode
        ? "bg-emerald-400"
        : "bg-emerald-500"
      : isDarkMode
        ? "bg-violet-400"
        : "bg-violet-500";

  return (
    <div
      className={`pointer-events-none h-[3px] w-full shrink-0 overflow-hidden rounded-none ${track}`}
      aria-hidden
    >
      <div
        className={`toast-dismiss-progress-fill h-full w-full ${fill}`}
        style={{
          animation: `toast-dismiss-progress ${durationMs}ms linear forwards`,
        }}
      />
    </div>
  );
}
