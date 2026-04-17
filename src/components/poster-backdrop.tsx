"use client";

import {
  type PosterDisplayProfile,
  posterSizesAttr,
  resolvePosterUrl,
} from "@/lib/poster-image";

type PosterBackdropProps = {
  imageUrl: string | undefined;
  profile: PosterDisplayProfile;
  /** Discover hero uses `contain` when TMDB art is letterboxed. */
  objectFit?: "cover" | "contain";
  className?: string;
};

/**
 * Lazy/async poster layer (TMDB width chosen by profile). Renders nothing when URL missing.
 * Parent should be `relative overflow-hidden`; stack gradients above this node.
 */
export function PosterBackdrop({
  imageUrl,
  profile,
  objectFit = "cover",
  className = "",
}: PosterBackdropProps) {
  const src = resolvePosterUrl(imageUrl, profile);
  if (!src) {
    return null;
  }

  const eager = profile === "hero";
  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      sizes={posterSizesAttr(profile)}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "low"}
      className={`pointer-events-none absolute inset-0 h-full w-full ${fitClass} ${className}`}
    />
  );
}
