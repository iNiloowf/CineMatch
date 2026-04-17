"use client";

import { Achievement } from "@/lib/types";

type AchievementToastProps = {
  achievement: Achievement | null;
  onClose: () => void;
};

export function AchievementToast({
  achievement,
  onClose,
}: AchievementToastProps) {
  if (!achievement) {
    return null;
  }

  const particles = Array.from({ length: 10 }, (_, index) => ({
    id: index,
    left: `${6 + ((index * 91) % 88)}%`,
    delay: `${(index % 6) * 110}ms`,
    duration: `${2200 + (index % 5) * 180}ms`,
  }));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div className="achievement-burst absolute inset-x-0 top-0 mx-auto h-40 max-w-md overflow-hidden">
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

      <div className="achievement-toast-pop pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-[32px] border border-white/70 bg-white/95 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.1)] backdrop-blur-md">
        <div className="pointer-events-none absolute left-3 top-3 text-[10px] text-violet-400/70">
          ✦
        </div>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xl text-white shadow-[0_4px_14px_rgba(109,40,217,0.25)]">
            ★
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-500">
              Achievement unlocked
            </p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {achievement.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {achievement.description}
            </p>
            <p className="mt-2 text-sm font-medium text-violet-600">
              Khoshgel! You just moved your goal forward.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close achievement message"
            className="rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
