"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { ModalPortal } from "@/components/modal-portal";
import { computeMovieMatchPercent } from "@/lib/match-score";
import { useFocusTrap } from "@/lib/use-focus-trap";
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
  const detailsPanelRef = useRef<HTMLDivElement>(null);
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  useFocusTrap(Boolean(movie) && !isTrailerVisible, detailsPanelRef);
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
  const runtimeLabel =
    movie?.runtime.trim().toLowerCase() === "runtime unavailable" ? "N/A" : (movie?.runtime ?? "");

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

  if (!movie) {
    return null;
  }

  return (
    <ModalPortal open>
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
        ref={detailsPanelRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={isTrailerVisible}
        inert={isTrailerVisible ? true : undefined}
        aria-labelledby="movie-details-modal-title"
        className={`details-modal-shell ui-shell pointer-events-auto absolute inset-x-0 bottom-0 top-0 z-10 mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col shadow-[0_24px_80px_rgba(15,23,42,0.2)] ${
          isDarkMode ? "bg-slate-950 text-white" : "bg-white text-slate-900"
        }`}
      >
        <span className="ui-modal-accent-bar" aria-hidden />
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
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-2 pt-3 sm:px-5 sm:pt-4">
            <div
              className="discover-hero-reveal relative shrink-0 overflow-hidden rounded-[18px] p-3.5 text-white shadow-[0_10px_28px_rgba(15,23,42,0.1)] sm:p-4"
              style={{
                backgroundImage: movie.poster.imageUrl
                  ? undefined
                  : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
                backgroundSize: movie.poster.imageUrl ? undefined : "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              <PosterBackdrop
                imageUrl={movie.poster.imageUrl}
                profile="hero"
                objectFit={movie.poster.imageUrl ? "contain" : "cover"}
              />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),transparent_32%,rgba(15,23,42,0.42)_58%,rgba(3,7,18,0.82)_100%)]" />
              <div className="relative flex min-h-[10.25rem] flex-col justify-between gap-2 sm:min-h-[11.5rem]">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                  <span className="ui-chip ui-chip--brand-media shrink-0 sm:px-3 sm:text-[10px] sm:tracking-[0.24em]">
                    {movie.mediaType === "series" ? "Series" : "Movie"}
                  </span>
                  <div className="flex min-w-0 max-w-[min(100%,14rem)] flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:gap-2">
                    <span className="ui-chip ui-chip--media-meta max-w-[4.5rem] shrink-0 truncate sm:max-w-none sm:px-2.5 sm:text-[11px]">
                      {movie.year}
                    </span>
                    <span
                      className="ui-chip ui-chip--media-meta max-w-[5.25rem] shrink-0 truncate sm:max-w-none sm:px-2.5 sm:text-[11px]"
                      title={runtimeLabel}
                    >
                      {runtimeLabel}
                    </span>
                    <span className="ui-chip ui-chip--score-warm shrink-0 sm:px-2.5 sm:text-[11px]">
                      {movie.rating.toFixed(1)} ★
                    </span>
                  </div>
                </div>
                <div className="space-y-2.5 pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {movie.genre.slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className="ui-chip ui-chip--media-meta max-w-[46%] truncate text-[10px] font-semibold sm:max-w-[9.5rem] sm:px-2.5 sm:text-[11px]"
                        title={genre}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                  <h2
                    id="movie-details-modal-title"
                    className="min-w-0 max-w-full line-clamp-2 font-semibold leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] sm:max-w-[14rem] sm:line-clamp-1 sm:truncate sm:whitespace-nowrap sm:text-lg"
                  >
                    {movie.title}
                  </h2>
                </div>
              </div>
            </div>

            <div
              className={`mt-4 grid shrink-0 grid-cols-3 gap-1 rounded-[18px] px-2 py-2.5 sm:gap-2 sm:rounded-[20px] sm:px-3 sm:py-3 ${
                isDarkMode
                  ? "border border-white/14 bg-white/10"
                  : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
              }`}
            >
              <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 shrink-0 ${isDarkMode ? "text-violet-300" : "text-violet-600"}`}
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M12 3.2 14.4 9.2h6.5l-5.2 3.8 2 6.4L12 16.9 6.3 19.4l2-6.4L3.1 9.2h6.5L12 3.2z" />
                </svg>
                <div className="min-w-0 text-center sm:text-left">
                  <p className={`text-xs font-semibold sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {movie.rating.toFixed(1)}
                  </p>
                  <p className={`text-[9px] sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                    IMDb rating
                  </p>
                </div>
              </div>
              <div
                className={`flex min-w-0 items-center justify-center gap-2 border-x px-0.5 sm:gap-2.5 sm:px-0 ${
                  isDarkMode ? "border-white/12" : "border-black/6"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 shrink-0 ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
                <div className="min-w-0 text-center sm:text-left">
                  <p className={`text-xs font-semibold sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {runtimeLabel}
                  </p>
                  <p className={`text-[9px] sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                    Runtime
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-2.5">
                <svg
                  viewBox="0 0 24 24"
                  className={`h-6 w-6 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8.25 14.1c.9 1.35 2.35 2.15 3.75 2.15s2.85-.8 3.75-2.15" />
                  <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="10" r="1.1" fill="currentColor" stroke="none" />
                </svg>
                <div className="min-w-0 text-center sm:text-left">
                  <p className={`text-xs font-semibold sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {computeMovieMatchPercent(movie, {
                      acceptedGenres,
                      onboarding: onboardingPreferences,
                    })}%
                  </p>
                  <p className={`text-[9px] sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                    Match
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`mt-4 flex w-full flex-col overflow-hidden rounded-[22px] text-left ${
                isDarkMode ? "bg-white/10" : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
              }`}
            >
              <div className="px-3 py-2.5">
                <p className={`text-[11px] leading-[1.35rem] ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}>
                  {movie.description}
                </p>
              </div>
            </div>
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
          variant="nested"
          onClose={() => setIsTrailerVisible(false)}
          onRetry={() => void fetchTrailerForMovie()}
        />
      ) : null}
    </div>
    </ModalPortal>
  );
}
