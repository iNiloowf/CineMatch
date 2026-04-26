"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { Achievement } from "@/lib/types";
import { playWaterDropletChime } from "@/lib/ui-sounds";
import { useEscapeToClose } from "@/lib/use-escape-to-close";

type AchievementToastProps = {
  achievement: Achievement | null;
  isDarkMode: boolean;
  onClose: () => void;
};

export function AchievementToast({
  achievement,
  isDarkMode,
  onClose,
}: AchievementToastProps) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEscapeToClose(Boolean(achievement), onClose);

  useEffect(
    () => {
      if (!achievement) {
        return;
      }

      playWaterDropletChime();

      const timeout = window.setTimeout(() => {
        onCloseRef.current();
      }, 15000);

      return () => window.clearTimeout(timeout);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run per achievement id, not object identity
    [achievement?.id],
  );

  if (!achievement) {
    return null;
  }

  const particles = Array.from({ length: 10 }, (_, index) => ({
    id: index,
    left: `${6 + ((index * 91) % 88)}%`,
    delay: `${(index % 6) * 110}ms`,
    duration: `${2200 + (index % 5) * 180}ms`,
  }));

  const shell = isDarkMode
    ? "border border-violet-400/25 bg-slate-950/94 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
    : "border border-violet-200/90 bg-white/96 text-slate-900 shadow-[0_16px_44px_rgba(124,58,237,0.14)]";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[var(--z-banner)] flex justify-center px-4 pt-[max(0.25rem,env(safe-area-inset-top,0px))]">
      <div className="achievement-burst pointer-events-none absolute inset-x-0 top-0 mx-auto h-40 max-w-md overflow-hidden">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className="achievement-confetti"
            style={{
              left: particle.left,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
      </div>

      <div
        className={`app-notify-banner pointer-events-auto relative w-full max-w-md overflow-hidden rounded-[28px] p-4 backdrop-blur-xl ${shell}`}
        role="status"
        aria-live="polite"
      >
        <div className="pointer-events-none absolute left-3 top-3 text-[10px] text-violet-400/70">
          ✦
        </div>

        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl shadow-[0_4px_14px_rgba(109,40,217,0.25)] ${
              isDarkMode ? "bg-violet-500 text-white" : "bg-violet-600 text-white"
            }`}
            aria-hidden="true"
          >
            ★
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${
                isDarkMode ? "text-violet-300" : "text-violet-600"
              }`}
            >
              Achievement unlocked
            </p>
            <p className={`mt-1 text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              {achievement.title}
            </p>
            <p className={`mt-1 text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              {achievement.description}
            </p>
            <p className={`mt-2 text-sm font-medium ${isDarkMode ? "text-violet-200" : "text-violet-700"}`}>
              Nice — you just moved your goal forward.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close achievement message"
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
