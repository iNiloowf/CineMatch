"use client";

import Image from "next/image";
import {
  type PosterDisplayProfile,
  posterSizesAttr,
  resolvePosterUrl,
} from "@/lib/poster-image";

const TMDB_HOST = "image.tmdb.org";

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
 * TMDB URLs use `next/image` for stable layout; other URLs fall back to `<img>`.
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
  const sizes = posterSizesAttr(profile);
  const isTmdb = src.includes(TMDB_HOST);

  if (isTmdb) {
    return (
      <div
        className={`pointer-events-none absolute inset-0 min-h-0 min-w-0 ${className}`.trim()}
      >
        <div className="relative h-full w-full min-h-0 min-w-0">
          <Image
            src={src}
            alt=""
            aria-hidden
            fill
            sizes={sizes}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "low"}
            className={`pointer-events-none ${fitClass}`}
          />
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : "low"}
      className={`pointer-events-none absolute inset-0 h-full w-full ${fitClass} ${className}`}
    />
  );
}
