"use client";

import { memo } from "react";
import { PicksIconShare } from "@/components/icons/picks-row-icons";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { SurfaceCard } from "@/components/surface-card";
import { formatRuntimeForDisplay } from "@/lib/format-runtime-display";
import type { Movie } from "@/lib/types";

export type PicksMovieRowProps = {
  movie: Movie;
  matchingPartners: string[];
  isDarkMode: boolean;
  /** Staggered list entrance delay in ms (capped internally). */
  listIndex?: number;
  onOpenDetails: (movieId: string) => void;
  onShare: (movieId: string) => void;
  onMarkWatched: (movieId: string) => void;
  onRequestRemove: (movieId: string) => void;
  /** Watched tab: recommendation chip + share / not watched only. */
  variant?: "default" | "watched";
  watchedRecommended?: boolean;
  onUnwatch?: (movieId: string) => void;
};

export const PicksMovieRow = memo(function PicksMovieRow({
  movie,
  matchingPartners,
  isDarkMode,
  listIndex = 0,
  onOpenDetails,
  onShare,
  onMarkWatched,
  onRequestRemove,
  variant = "default",
  watchedRecommended,
  onUnwatch,
}: PicksMovieRowProps) {
  const enterDelay = `${Math.min(listIndex, 12) * 45}ms`;
  const isWatchedTab = variant === "watched";

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
      {/*
        Title and meta sit above the poster (not over the art) so faces/key art stay unobstructed.
      */}
      <div
        className={`border-b px-4 pt-3.5 pb-3 sm:px-5 sm:pt-4 sm:pb-3.5 ${
          isDarkMode ? "border-white/10" : "border-slate-200/90"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              isDarkMode
                ? "bg-white/10 text-slate-200 ring-1 ring-white/12"
                : "bg-slate-200/80 text-slate-700 ring-1 ring-slate-300/60"
            }`}
          >
            {movie.mediaType === "series" ? "Series" : "Movie"}
          </span>
          <div className="flex shrink-0 gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isDarkMode
                  ? "bg-white/8 text-slate-200 ring-1 ring-white/10"
                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80"
              }`}
            >
              {movie.year}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isDarkMode
                  ? "bg-white/8 text-slate-200 ring-1 ring-white/10"
                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/80"
              }`}
            >
              {formatRuntimeForDisplay(movie.runtime)}
            </span>
          </div>
        </div>
        <h2
          className={`mt-2 line-clamp-2 text-lg font-bold leading-tight tracking-tight sm:text-xl ${
            isDarkMode ? "text-slate-50" : "text-slate-900"
          }`}
        >
          {movie.title}
        </h2>
      </div>

      <div className="relative h-[9.25rem] w-full overflow-hidden sm:h-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: movie.poster.imageUrl
              ? undefined
              : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        >
          <PosterBackdrop
            imageUrl={movie.poster.imageUrl}
            profile="list"
            objectFit="cover"
            className="[&_img]:object-top"
          />
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

        {isWatchedTab ? (
          <div className="space-y-2.5 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                  watchedRecommended
                    ? isDarkMode
                      ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/30"
                      : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/90"
                    : isDarkMode
                      ? "bg-white/10 text-slate-200 ring-1 ring-white/15"
                      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/90"
                }`}
              >
                {watchedRecommended ? "Recommended" : "Not for me"}
              </span>
            </div>
            <div className="flex w-full flex-col gap-1.5 sm:flex-row sm:justify-end">
              <button
                type="button"
                aria-label={`Share ${movie.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void onShare(movie.id);
                }}
                className={`picks-row-action inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-[12px] px-2.5 transition active:scale-[0.98] sm:w-auto sm:min-w-[6rem] ${
                  isDarkMode
                    ? "border border-white/12 bg-white/10 text-white hover:bg-white/14"
                    : "border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
                }`}
              >
                <PicksIconShare className="h-4 w-4 shrink-0 opacity-95" />
                Share
              </button>
              {onUnwatch ? (
                <button
                  type="button"
                  aria-label={`Mark ${movie.title} as not watched yet`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onUnwatch(movie.id);
                  }}
                  className={`picks-row-action inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-[12px] border px-2.5 transition active:scale-[0.98] sm:w-auto sm:min-w-[6rem] ${
                    isDarkMode
                      ? "border-white/14 bg-white/6 text-slate-100 hover:bg-white/10"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  Not watched
                </button>
              ) : null}
            </div>
          </div>
        ) : (
        <div className="flex w-full flex-col gap-1.5 pt-0.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            aria-label={`Share ${movie.title}`}
            onClick={(event) => {
              event.stopPropagation();
              void onShare(movie.id);
            }}
            className={`picks-row-action inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-[12px] px-2.5 transition active:scale-[0.98] sm:w-auto sm:min-w-[6rem] ${
              isDarkMode
                ? "border border-white/12 bg-white/10 text-white hover:bg-white/14"
                : "border border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
            }`}
          >
            <PicksIconShare className="h-4 w-4 shrink-0 opacity-95" />
            Share
          </button>
          <button
            type="button"
            aria-label={`Mark ${movie.title} as watched`}
            onClick={(event) => {
              event.stopPropagation();
              onMarkWatched(movie.id);
            }}
            className={`picks-row-action inline-flex min-h-9 w-full items-center justify-center rounded-[12px] border px-2.5 transition active:scale-[0.98] sm:w-auto sm:min-w-[6rem] ${
              isDarkMode
                ? "border-violet-400/35 bg-violet-500/18 text-violet-100 hover:bg-violet-500/28"
                : "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100"
            }`}
          >
            Mark watched
          </button>
          <button
            type="button"
            aria-label={`Remove ${movie.title} from your picks`}
            title="Remove from picks"
            onClick={(event) => {
              event.stopPropagation();
              onRequestRemove(movie.id);
            }}
            className={`picks-row-action inline-flex min-h-9 w-full items-center justify-center rounded-[12px] border px-2.5 transition active:scale-[0.98] sm:w-auto sm:min-w-[6rem] ${
              isDarkMode
                ? "border-rose-400/35 bg-rose-500/14 text-rose-100 hover:bg-rose-500/22"
                : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            Remove
          </button>
        </div>
        )}
      </div>
    </SurfaceCard>
  );
});
