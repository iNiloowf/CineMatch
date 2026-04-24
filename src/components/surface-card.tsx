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
   * When `heroImageUrl` is set, it renders behind this at z-0; this layer is z-1 and slightly
   * transparent so the movie art shows through.
   */
  backgroundClassName?: string;
  /** Optional poster/photo (e.g. profile header) — bare mode only, below themed background. */
  heroImageUrl?: string;
  /**
   * Dark mode adds `.glass-shimmer` (animated ::after). On some full-bleed cards that can read as a stray shadow/overlay after theme toggles — disable for those surfaces.
   */
  shimmer?: boolean;
} & ComponentPropsWithoutRef<"section">;

export function SurfaceCard({
  children,
  className = "",
  bare = false,
  backgroundClassName,
  heroImageUrl,
  shimmer = true,
  ...props
}: SurfaceCardProps) {
  const { isDarkMode } = useAppState();
  const hasHero = Boolean(heroImageUrl);

  if (bare) {
    return (
      <section
        {...props}
        className={`ui-motion-surface fade-up-enter relative isolate w-full min-w-0 overflow-hidden rounded-[28px] hover:-translate-y-0.5 ${className}`}
      >
        {heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external TMDB poster
          <img
            src={heroImageUrl}
            alt=""
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
          />
        ) : null}
        {hasHero ? (
          <span
            className={
              isDarkMode
                ? "pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden rounded-[inherit] bg-gradient-to-b from-slate-950/25 via-slate-950/15 to-slate-950/50"
                : "pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden rounded-[inherit] bg-gradient-to-b from-white/40 via-slate-100/30 to-slate-900/35"
            }
            aria-hidden
          />
        ) : null}
        {backgroundClassName ? (
          <span
            className={`pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[inherit] ${
              hasHero ? "opacity-88" : ""
            } ${backgroundClassName}`}
            aria-hidden
          />
        ) : null}
        <div className="relative z-10 flex w-full min-w-0 flex-col gap-6 p-5 sm:p-6">{children}</div>
      </section>
    );
  }

  /** Opaque dark fill — very transparent + backdrop-blur sampled stale frames (Discover → Settings, theme toggles). */
  const darkShell = shimmer
    ? "glass-shimmer border border-white/16 bg-gradient-to-br from-slate-950/[0.97] via-[#14101f]/[0.97] to-slate-950/[0.97] shadow-[0_18px_50px_rgba(0,0,0,0.35)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.42)]"
    : "border border-white/16 bg-gradient-to-br from-slate-950/[0.97] via-[#14101f]/[0.97] to-slate-950/[0.97] shadow-[0_18px_50px_rgba(0,0,0,0.35)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.42)]";

  return (
    <section
      {...props}
      className={`ui-motion-surface fade-up-enter relative isolate w-full min-w-0 overflow-hidden rounded-[28px] p-5 hover:-translate-y-0.5 ${
        isDarkMode
          ? darkShell
          : "border border-slate-200/90 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl hover:shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
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
