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

  const particles = Array.from({ length: 16 }, (_, index) => ({
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

      <div className="achievement-toast-pop pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-[32px] border border-white/70 bg-white/92 p-4 shadow-[0_25px_80px_rgba(124,58,237,0.24)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(216,180,254,0.85),rgba(216,180,254,0))]" />
        <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5">
          <span className="achievement-twinkle text-[10px] text-violet-300">
            ✦
          </span>
          <span
            className="achievement-twinkle text-xs text-amber-300"
            style={{ animationDelay: "160ms" }}
          >
            ✦
          </span>
          <span
            className="achievement-twinkle text-[11px] text-pink-300"
            style={{ animationDelay: "320ms" }}
          >
            ✦
          </span>
        </div>

        <div className="flex items-start gap-3">
          <div className="achievement-badge-glow flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#7c3aed,#d8b4fe)] text-xl text-white shadow-[0_12px_28px_rgba(124,58,237,0.28)]">
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
