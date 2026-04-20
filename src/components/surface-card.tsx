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
        className={`ui-motion-surface fade-up-enter relative isolate w-full min-w-0 overflow-hidden rounded-[28px] hover:-translate-y-0.5 ${className}`}
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
      className={`ui-motion-surface fade-up-enter relative isolate w-full min-w-0 overflow-hidden rounded-[28px] p-5 backdrop-blur-xl hover:-translate-y-0.5 ${
        isDarkMode
          ? "glass-shimmer border border-white/16 bg-white/[0.11] shadow-[0_18px_50px_rgba(0,0,0,0.35)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
          : "border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
      } ${className}`}
    >
      {!isDarkMode ? (
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] bg-[radial-gradient(120%_80%_at_0%_0%,rgba(248,250,252,0.9),transparent_52%)]"
          aria-hidden
        />
      ) : null}
      <div className="relative z-10 flex h-full min-h-0 w-full min-w-0 flex-col">{children}</div>
    </section>
  );
}
