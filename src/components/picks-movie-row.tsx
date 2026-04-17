"use client";

import { memo } from "react";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { SurfaceCard } from "@/components/surface-card";
import type { Movie } from "@/lib/types";

export type PicksMovieRowProps = {
  movie: Movie;
  matchingPartners: string[];
  isDarkMode: boolean;
  onOpenDetails: (movieId: string) => void;
  onShare: (movieId: string) => void;
  onRequestRemove: (movieId: string) => void;
};

export const PicksMovieRow = memo(function PicksMovieRow({
  movie,
  matchingPartners,
  isDarkMode,
  onOpenDetails,
  onShare,
  onRequestRemove,
}: PicksMovieRowProps) {
  return (
    <SurfaceCard
      className="space-y-4 p-4"
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
      <div className="flex items-stretch gap-3">
        <div className="relative min-h-[11.5rem] w-[5.7rem] shrink-0 self-stretch overflow-hidden rounded-[22px] shadow-[0_8px_20px_rgba(15,23,42,0.12)]">
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
            <PosterBackdrop imageUrl={movie.poster.imageUrl} profile="list" />
          </div>
          <div className="relative flex h-full flex-col justify-between bg-[linear-gradient(180deg,rgba(15,23,42,0.06),transparent_36%,rgba(15,23,42,0.5)_100%)] p-2.5 text-white">
            <div className="flex justify-end">
              <span className="rounded-full bg-black/26 px-2 py-1 text-[10px] font-semibold text-white/88 backdrop-blur-sm">
                {movie.year}
              </span>
            </div>
            <div className="flex justify-start">
              <span className="rounded-full bg-black/26 px-2 py-1 text-[10px] font-semibold text-white/88 backdrop-blur-sm">
                {movie.runtime}
              </span>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <h2
                  className={`min-w-0 text-base font-semibold sm:flex-1 sm:truncate ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  {movie.title}
                </h2>
                <span
                  className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    isDarkMode
                      ? "bg-violet-500/22 text-violet-100"
                      : "bg-violet-100 text-violet-700"
                  }`}
                >
                  {movie.rating.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
          <p
            className={`line-clamp-2 text-[11px] leading-5 ${
              isDarkMode ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {movie.description}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {movie.genre.slice(0, 3).map((genre) => (
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
          {matchingPartners.length > 0 ? (
            <div
              className={`rounded-[20px] px-3 py-3 ${
                isDarkMode
                  ? "border border-violet-400/20 bg-violet-500/12 text-violet-100"
                  : "border border-violet-200 bg-violet-50/85 text-violet-800"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">Shared Match</p>
              <p className="mt-1 text-[12px] font-semibold">
                Both liked this with {matchingPartners.join(", ")}
              </p>
            </div>
          ) : null}
          <div className="flex justify-end pt-1">
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label={`Share ${movie.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void onShare(movie.id);
                }}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition ${
                  isDarkMode
                    ? "border border-white/10 bg-white/8 text-slate-200 shadow-sm hover:bg-white/12"
                    : "border border-violet-200 bg-violet-50 text-violet-700 shadow-sm hover:bg-violet-100"
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="ui-icon-md">
                  <path
                    d="M12.5 6.5 7.5 9.25m5 1.5-5 2.75M15 5.25a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM8.5 10a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM15 14.75a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label={`Remove ${movie.title} from your picks`}
                onClick={(event) => {
                  event.stopPropagation();
                  onRequestRemove(movie.id);
                }}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="ui-icon-md">
                  <path
                    d="M5.5 6.5h9m-7.5 0V5.75A1.75 1.75 0 0 1 8.75 4h2.5A1.75 1.75 0 0 1 13 5.75v.75m-6 0-.5 8A1.75 1.75 0 0 0 8.25 16h3.5a1.75 1.75 0 0 0 1.75-1.5l.5-8m-5.5 3v3m3-3v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
});
