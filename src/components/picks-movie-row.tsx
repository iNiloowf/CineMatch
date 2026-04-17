"use client";

import { memo } from "react";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { SurfaceCard } from "@/components/surface-card";
import type { Movie } from "@/lib/types";

export type PicksMovieRowProps = {
  movie: Movie;
  matchingPartners: string[];
  isDarkMode: boolean;
  /** Staggered list entrance delay in ms (capped internally). */
  listIndex?: number;
  onOpenDetails: (movieId: string) => void;
  onShare: (movieId: string) => void;
  onRequestRemove: (movieId: string) => void;
};

export const PicksMovieRow = memo(function PicksMovieRow({
  movie,
  matchingPartners,
  isDarkMode,
  listIndex = 0,
  onOpenDetails,
  onShare,
  onRequestRemove,
}: PicksMovieRowProps) {
  const enterDelay = `${Math.min(listIndex, 12) * 45}ms`;

  return (
    <SurfaceCard
      className="picks-row-enter !p-0 overflow-hidden"
      style={{ animationDelay: enterDelay }}
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(movie.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails(movie.id);
        }
      }}
    >
      <div className="relative h-[9.25rem] w-full overflow-hidden sm:h-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: movie.poster.imageUrl
              ? undefined
              : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <PosterBackdrop imageUrl={movie.poster.imageUrl} profile="list" objectFit="cover" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),transparent_42%,rgba(15,23,42,0.72)_100%)]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-3.5">
          <span className="rounded-full bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/95 backdrop-blur-sm ring-1 ring-white/15">
            {movie.mediaType === "series" ? "Series" : "Film"}
          </span>
          <div className="flex shrink-0 gap-1.5">
            <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/92 backdrop-blur-sm ring-1 ring-white/15">
              {movie.year}
            </span>
            <span className="rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-white/92 backdrop-blur-sm ring-1 ring-white/15">
              {movie.runtime}
            </span>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
          <h2 className="line-clamp-2 text-lg font-bold leading-tight tracking-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)] sm:text-xl">
            {movie.title}
          </h2>
        </div>
      </div>

      <div className="space-y-2.5 px-4 pb-4 pt-3 sm:space-y-3 sm:px-5 sm:pb-5 sm:pt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {movie.genre.slice(0, 4).map((genre) => (
              <span
                key={genre}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                {genre}
              </span>
            ))}
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold tabular-nums ${
              isDarkMode ? "bg-violet-500/22 text-violet-100 ring-1 ring-violet-400/25" : "bg-violet-100 text-violet-800 ring-1 ring-violet-200/80"
            }`}
          >
            ★ {movie.rating.toFixed(1)}
          </span>
        </div>

        <p
          className={`line-clamp-2 text-[12px] leading-relaxed sm:line-clamp-3 sm:text-[13px] ${
            isDarkMode ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {movie.description}
        </p>

        {matchingPartners.length > 0 ? (
          <div
            className={`rounded-[18px] px-3 py-2.5 sm:rounded-[20px] sm:px-3.5 sm:py-3 ${
              isDarkMode
                ? "border border-violet-400/22 bg-violet-500/12 text-violet-100"
                : "border border-violet-200/90 bg-violet-50/90 text-violet-900"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">Shared match</p>
            <p className="mt-1 text-[12px] font-semibold leading-snug">With {matchingPartners.join(", ")}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 pt-0.5 sm:flex-row sm:items-center sm:justify-between">
          <p className={`hidden text-[11px] font-medium sm:block ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            Tap the card for details, trailer, and share.
          </p>
          <div className="flex w-full gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              aria-label={`Share ${movie.title}`}
              onClick={(event) => {
                event.stopPropagation();
                void onShare(movie.id);
              }}
              className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] px-4 text-sm font-semibold transition active:scale-[0.98] sm:min-w-[7.5rem] sm:flex-none ${
                isDarkMode
                  ? "border border-white/12 bg-white/10 text-white hover:bg-white/14"
                  : "border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
                <path
                  d="M12.5 6.5 7.5 9.25m5 1.5-5 2.75M15 5.25a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM8.5 10a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM15 14.75a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Share
            </button>
            <button
              type="button"
              aria-label={`Remove ${movie.title} from your picks`}
              onClick={(event) => {
                event.stopPropagation();
                onRequestRemove(movie.id);
              }}
              className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] border px-4 text-sm font-semibold transition active:scale-[0.98] sm:min-w-[7.5rem] sm:flex-none ${
                isDarkMode
                  ? "border-rose-400/35 bg-rose-500/14 text-rose-100 hover:bg-rose-500/22"
                  : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0">
                <path
                  d="M5.5 6.5h9m-7.5 0V5.75A1.75 1.75 0 0 1 8.75 4h2.5A1.75 1.75 0 0 1 13 5.75v.75m-6 0-.5 8A1.75 1.75 0 0 0 8.25 16h3.5a1.75 1.75 0 0 0 1.75-1.5l.5-8m-5.5 3v3m3-3v3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Remove
            </button>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
});
