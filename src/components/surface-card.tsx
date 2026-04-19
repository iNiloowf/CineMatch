"use client";

import { ComponentPropsWithoutRef, ReactNode } from "react";
import { useAppState } from "@/lib/app-state";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  /**
   * Skip the default glass / frosted surface and light-mode overlay so `className`
   * fully controls background, border, and shadow (e.g. profile theme presets).
   * Without this, theme gradients fight Tailwind’s default card `bg-*` utilities.
   */
  bare?: boolean;
  /**
   * Full-bleed layer behind padded content (bare only). Put ring / shadow / gradients here
   * so the fill reaches the rounded corners; padding lives on the inner shell only.
   */
  backgroundClassName?: string;
} & ComponentPropsWithoutRef<"section">;

export function SurfaceCard({
  children,
  className = "",
  bare = false,
  backgroundClassName,
  ...props
}: SurfaceCardProps) {
  const { isDarkMode } = useAppState();

  if (bare) {
    return (
      <section
        {...props}
        className={`ui-motion-surface fade-up-enter relative isolate overflow-hidden rounded-[28px] hover:-translate-y-0.5 ${className}`}
      >
        {backgroundClassName ? (
          <span
            className={`pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] ${backgroundClassName}`}
            aria-hidden
          />
        ) : null}
        <div className="relative z-10 flex w-full min-w-0 flex-col gap-6 p-5 sm:p-6">{children}</div>
      </section>
    );
  }

  return (
    <section
      {...props}
      className={`ui-motion-surface fade-up-enter relative overflow-hidden rounded-[28px] p-5 backdrop-blur-xl hover:-translate-y-0.5 ${
        isDarkMode
          ? "border border-white/16 bg-white/[0.11] shadow-[0_18px_50px_rgba(0,0,0,0.35)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
          : "glass-shimmer border border-white/90 bg-[linear-gradient(160deg,rgba(255,255,255,0.92),rgba(255,255,255,0.72)_42%,rgba(240,232,255,0.82)_100%)] shadow-[0_20px_56px_rgba(126,94,197,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] hover:shadow-[0_28px_74px_rgba(126,94,197,0.22)]"
      } ${className}`}
    >
      {!isDarkMode ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.95),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(196,181,253,0.28),transparent_38%)]" />
      ) : null}
      <div className="relative flex h-full min-h-0 flex-col">{children}</div>
    </section>
  );
}
