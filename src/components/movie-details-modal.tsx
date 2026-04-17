"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { computeMovieMatchPercent } from "@/lib/match-score";
import { useAppState } from "@/lib/app-state";
import type { Movie } from "@/lib/types";

const PicksTrailerModalLazy = dynamic(
  () => import("@/components/picks-trailer-modal").then((m) => m.PicksTrailerModal),
  { ssr: false },
);

export function matchPercentForMovie(
  movie: Movie,
  context?: Parameters<typeof computeMovieMatchPercent>[1],
): number {
  return computeMovieMatchPercent(movie, context);
}

export type MovieDetailsFooterRender = (controls: { openTrailer: () => Promise<void> }) => ReactNode;

type MovieDetailsModalProps = {
  movie: Movie | null;
  isDarkMode: boolean;
  onClose: () => void;
  /** Shown under the header, e.g. “Jamie’s pick” */
  contextLabel?: string;
  footer: MovieDetailsFooterRender;
};

export function MovieDetailsModal({
  movie,
  isDarkMode,
  onClose,
  contextLabel,
  footer,
}: MovieDetailsModalProps) {
  const { acceptedMovies, onboardingPreferences } = useAppState();
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  const acceptedGenres = useMemo(() => {
    const set = new Set<string>();
    for (const acceptedMovie of acceptedMovies) {
      for (const genre of acceptedMovie.genre) {
        const normalized = genre.trim().toLowerCase();
        if (normalized && normalized !== "movie" && normalized !== "series") {
          set.add(normalized);
        }
      }
    }
    return set;
  }, [acceptedMovies]);

  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerError, setTrailerError] = useState<string | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

  useEffect(() => {
    if (!movie) {
      setIsTrailerVisible(false);
      setTrailerUrl(null);
      setTrailerError(null);
      setIsLoadingTrailer(false);
      return;
    }

    setTrailerUrl(movie.trailerUrl ?? null);
    setTrailerError(null);
    setIsLoadingTrailer(false);
    setIsTrailerVisible(false);
  }, [movie]);

  const fetchTrailerForMovie = useCallback(async () => {
    if (!movie || trailerUrl) {
      return;
    }

    setTrailerError(null);
    setIsLoadingTrailer(true);

    try {
      const response = await fetch(
        `/api/movies/trailer?movieId=${encodeURIComponent(movie.id)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        trailerUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.trailerUrl) {
        setTrailerError(
          payload.error ?? "We couldn’t find a playable trailer for this title.",
        );
        return;
      }

      setTrailerUrl(payload.trailerUrl);
    } catch {
      setTrailerError("We couldn’t load the trailer right now.");
    } finally {
      setIsLoadingTrailer(false);
    }
  }, [movie, trailerUrl]);

  const handleOpenTrailer = useCallback(async () => {
    setIsTrailerVisible(true);
    await fetchTrailerForMovie();
  }, [fetchTrailerForMovie]);

  useEffect(() => {
    if (!movie) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      if (isTrailerVisible) {
        setIsTrailerVisible(false);
        return;
      }
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [movie, isTrailerVisible, onClose]);

  if (!movie || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-slate-950/48 backdrop-blur-[3px]">
      <button
        type="button"
        aria-label="Close movie details"
        className="absolute inset-0 z-0 cursor-default bg-transparent"
        onClick={() => {
          onClose();
          setIsTrailerVisible(false);
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="movie-details-modal-title"
        className={`details-modal-shell ui-shell pointer-events-auto absolute inset-x-0 bottom-0 top-0 z-10 mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col shadow-[0_24px_80px_rgba(15,23,42,0.2)] ${
          isDarkMode ? "bg-slate-950 text-white" : "bg-white text-slate-900"
        }`}
      >
        <div
          className={`ui-shell-header !border-b-black/6 !py-3 !pt-[max(1rem,env(safe-area-inset-top,0px))] shrink-0`}
        >
          <div className="min-w-0 flex-1">
            <p
              className={`truncate text-xs font-medium tracking-[0.01em] ${
                isDarkMode ? "text-slate-300" : "text-slate-500"
              }`}
            >
              Movie details
            </p>
            {contextLabel ? (
              <p className={`truncate text-[11px] font-semibold ${isDarkMode ? "text-violet-300" : "text-violet-700"}`}>
                {contextLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              setIsTrailerVisible(false);
            }}
            aria-label="Close movie details"
            className={`ui-shell-close ${
              isDarkMode ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div
          className={`ui-shell-body !flex !min-h-0 !flex-1 !flex-col !overflow-hidden !px-0 !pb-0 !pt-0 ${
            isDarkMode ? "bg-slate-950" : "bg-white"
          }`}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 pt-4">
            <p
              className={`mb-3 flex items-center gap-2 text-[11px] font-semibold ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span aria-hidden className="select-none">
                ↓
              </span>
              Scroll for synopsis.
            </p>

            <div
              className="relative overflow-hidden rounded-[18px] p-4 text-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
              style={{
                backgroundImage: movie.poster.imageUrl
                  ? undefined
                  : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
                backgroundSize: movie.poster.imageUrl ? undefined : "cover",
                backgroundPosition: "center",
              }}
            >
              <PosterBackdrop imageUrl={movie.poster.imageUrl} profile="hero" objectFit="cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05),transparent_38%,rgba(15,23,42,0.46)_100%)]" />
              <div className="relative flex min-h-[13rem] flex-col justify-between sm:min-h-[14rem]">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-violet-600/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                    {movie.mediaType === "series" ? "Series" : "Movie"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white/88 backdrop-blur-md">
                      {movie.year}
                    </span>
                    <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white/88 backdrop-blur-md">
                      {movie.runtime}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-6">
                  <p className="text-xs font-medium text-white/90">{movie.genre.slice(0, 3).join(" • ")}</p>
                  <h2
                    id="movie-details-modal-title"
                    className="text-[1.65rem] font-semibold leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)] sm:text-[1.8rem]"
                  >
                    {movie.title}
                  </h2>
                </div>
              </div>
            </div>

            <div
              className={`mt-4 grid grid-cols-3 gap-2 rounded-[24px] px-3 py-3 ${
                isDarkMode
                  ? "border border-white/14 bg-white/10"
                  : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
              }`}
            >
              <div className="flex min-w-0 items-center justify-center gap-2">
                <span className="text-base leading-none text-violet-500">★</span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {movie.rating.toFixed(1)}
                  </p>
                  <p className={`text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>IMDb rating</p>
                </div>
              </div>
              <div
                className={`flex min-w-0 items-center justify-center gap-2 border-x ${
                  isDarkMode ? "border-white/12" : "border-black/6"
                }`}
              >
                <span className={`text-[1.1rem] leading-none ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                  ◷
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {movie.runtime}
                  </p>
                  <p className={`text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>Runtime</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-2">
                <span className="text-base leading-none text-emerald-500">☺</span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {computeMovieMatchPercent(movie, {
                      acceptedGenres,
                      onboarding: onboardingPreferences,
                    })}%
                  </p>
                  <p className={`text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>Match</p>
                </div>
              </div>
            </div>

            <div
              className={`relative mt-4 rounded-[22px] px-4 py-4 ${
                isDarkMode ? "bg-white/10" : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
              }`}
            >
              <p className={`text-[11px] leading-5 ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}>
                {movie.description}
              </p>
            </div>

            <div
              className={`pointer-events-none sticky bottom-0 z-[1] -mx-1 mt-2 h-10 bg-gradient-to-t ${
                isDarkMode ? "from-slate-950" : "from-white"
              } to-transparent`}
              aria-hidden
            />
          </div>
        </div>

        <div
          className={`ui-shell-footer !flex !flex-col !pt-3 sm:!flex-row sm:items-stretch shrink-0 gap-2 ${
            isDarkMode ? "bg-slate-950" : "bg-white"
          }`}
        >
          {footer({ openTrailer: handleOpenTrailer })}
        </div>
      </div>

      {isTrailerVisible ? (
        <PicksTrailerModalLazy
          title={movie.title}
          isDarkMode={isDarkMode}
          trailerUrl={trailerUrl}
          isLoadingTrailer={isLoadingTrailer}
          trailerError={trailerError}
          onClose={() => setIsTrailerVisible(false)}
          onRetry={() => void fetchTrailerForMovie()}
        />
      ) : null}
    </div>,
    document.body,
  );
}
