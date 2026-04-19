"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { computeMovieMatchPercent } from "@/lib/match-score";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import { useEscapeToClose } from "@/lib/use-escape-to-close";
import { Movie } from "@/lib/types";

const MovieTrailerModalLazy = dynamic(
  () => import("@/components/movie-trailer-modal").then((mod) => mod.MovieTrailerModal),
  { ssr: false },
);

type MovieSwipeCardProps = {
  movie: Movie;
  onAccept: () => void;
  onReject: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  isInteractionLocked?: boolean;
  swipeFeedback?: "accepted" | "rejected" | null;
};

export function MovieSwipeCard({
  movie,
  onAccept,
  onReject,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  isInteractionLocked = false,
  swipeFeedback = null,
}: MovieSwipeCardProps) {
  const { isDarkMode, acceptedMovies, onboardingPreferences } = useAppState();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState(movie.trailerUrl ?? null);
  const [trailerError, setTrailerError] = useState<string | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSnapAnimating, setIsSnapAnimating] = useState(false);
  useEscapeToClose(isTrailerVisible, () => setIsTrailerVisible(false));
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const descriptionSectionRef = useRef<HTMLDivElement | null>(null);
  const shouldClamp = movie.description.length > 92;
  /* ~½ previous display sizes; floor longest titles so they stay legible */
  const titleSizeClass =
    movie.title.length > 34
      ? "text-[0.7rem] sm:text-[0.75rem]"
      : movie.title.length > 28
        ? "text-[0.7rem] sm:text-[0.8rem]"
        : movie.title.length > 22
          ? "text-[0.8rem] sm:text-[0.9rem]"
          : "text-[1.075rem] sm:text-[1.15rem]";
  const hasTrailer = Boolean(trailerUrl) || movie.id.startsWith("tmdb-");
  const runtimeLabel =
    movie.runtime.trim().toLowerCase() === "runtime unavailable"
      ? "N/A"
      : movie.runtime;
  const acceptedGenres = useMemo(
    () =>
      new Set(
        acceptedMovies.flatMap((acceptedMovie) =>
          acceptedMovie.genre
            .map((genre) => genre.trim().toLowerCase())
            .filter((genre) => genre && genre !== "movie" && genre !== "series"),
        ),
      ),
    [acceptedMovies],
  );
  const matchScore = computeMovieMatchPercent(movie, {
    acceptedGenres,
    onboarding: onboardingPreferences,
  });
  const handleToggleDescription = () => {
    if (!shouldClamp) {
      return;
    }

    setIsDescriptionExpanded((currentValue) => {
      const nextValue = !currentValue;

      if (!nextValue) {
        const surfaceSection = descriptionSectionRef.current?.closest("section");

        if (surfaceSection instanceof HTMLElement) {
          window.requestAnimationFrame(() => {
            surfaceSection.scrollTo({ top: 0, behavior: "smooth" });
          });
        }
      }

      return nextValue;
    });
  };

  useEffect(() => {
    setTrailerUrl(movie.trailerUrl ?? null);
    setTrailerError(null);
    setIsLoadingTrailer(false);
    setIsTrailerVisible(false);
    setIsDescriptionExpanded(false);
  }, [movie.id, movie.trailerUrl]);

  useEffect(() => {
    if (!isTrailerVisible) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      setIsTrailerVisible(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTrailerVisible]);

  const fetchTrailerIfNeeded = useCallback(async () => {
    if (trailerUrl) {
      return;
    }

    setTrailerError(null);
    setIsLoadingTrailer(true);

    try {
      const response = await fetch(
        `/api/movies/trailer?movieId=${encodeURIComponent(movie.id)}`,
        {
          cache: "no-store",
        },
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
  }, [trailerUrl, movie.id]);

  const handleOpenTrailer = useCallback(async () => {
    setIsTrailerVisible(true);
    await fetchTrailerIfNeeded();
  }, [fetchTrailerIfNeeded]);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isInteractionLocked || isDescriptionExpanded) {
      return;
    }

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    setIsSnapAnimating(false);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isInteractionLocked || isDescriptionExpanded) {
      return;
    }

    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      return;
    }

    setDragOffset(Math.max(-42, Math.min(42, deltaX)));
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isInteractionLocked || isDescriptionExpanded) {
      return;
    }

    if (touchStartXRef.current === null || touchStartYRef.current === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    const resetDrag = () => {
      setIsSnapAnimating(true);
      setDragOffset(0);
      window.setTimeout(() => {
        setIsSnapAnimating(false);
      }, 260);
    };

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
      resetDrag();
      return;
    }

    if (deltaX > 0 && canGoPrevious) {
      setDragOffset(0);
      onPrevious();
      return;
    }

    if (deltaX < 0 && canGoNext) {
      setDragOffset(0);
      onNext();
      return;
    }

    resetDrag();
  };

  /** Same outer box so star / clock / match read at identical size. */
  const statIconFrame =
    "flex h-7 w-7 shrink-0 items-center justify-center sm:h-8 sm:w-8";
  const statIconInner = "h-[1.125rem] w-[1.125rem] max-h-full max-w-full sm:h-5 sm:w-5";

  return (
    <>
      <SurfaceCard
        className={`discover-swipe-card-motion flex h-full min-h-0 flex-1 flex-col gap-[var(--swipe-y-gap)] overflow-hidden rounded-[24px] p-3 [--swipe-y-gap:clamp(0.75rem,3.2vw,1.1875rem)] sm:p-3.5 ${
          isSnapAnimating ? "discover-swipe-card-motion--snap" : ""
        } transition-transform ${swipeFeedback ? `discover-card-swipe-${swipeFeedback}` : ""}`}
        style={{
          transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.045}deg) scale(${dragOffset === 0 ? 1 : 0.996})`,
          touchAction: isDescriptionExpanded ? "pan-y" : "auto",
          overflowY: isDescriptionExpanded ? "auto" : "visible",
          overscrollBehaviorY: isDescriptionExpanded ? "contain" : "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarGutter: "stable",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {swipeFeedback ? (
          <div className="pointer-events-none absolute inset-x-6 top-6 z-[var(--z-local)] flex justify-center">
            <div
              className={`discover-feedback-chip ${
                swipeFeedback === "accepted"
                  ? "discover-feedback-accept"
                  : "discover-feedback-reject"
              }`}
            >
              {swipeFeedback === "accepted" ? "Added to picks" : "Passed for now"}
            </div>
          </div>
        ) : null}

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
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-0">
              <button
                type="button"
                onClick={onPrevious}
                disabled={!canGoPrevious}
                aria-label="Show previous title"
                className={`-ml-1 flex h-11 w-11 items-center justify-center rounded-[999px] border border-white/20 bg-black/20 text-white backdrop-blur-md transition ${
                  canGoPrevious
                    ? "opacity-100 hover:bg-black/32 active:scale-95"
                    : "cursor-not-allowed opacity-35"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="ui-icon-md ui-icon-stroke"
                  aria-hidden="true"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!canGoNext}
                aria-label="Show next title"
                className={`-mr-1 flex h-11 w-11 items-center justify-center rounded-[999px] border border-white/20 bg-black/20 text-white backdrop-blur-md transition ${
                  canGoNext
                    ? "opacity-100 hover:bg-black/32 active:scale-95"
                    : "cursor-not-allowed opacity-35"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="ui-icon-md ui-icon-stroke"
                  aria-hidden="true"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={handleOpenTrailer}
                disabled={!hasTrailer || isLoadingTrailer}
                aria-label={hasTrailer ? "Play trailer" : "Trailer unavailable"}
                className={`pointer-events-auto flex h-16 w-16 items-center justify-center rounded-[999px] border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition ${
                  hasTrailer
                    ? "bg-black/24 text-white hover:bg-black/34"
                    : "cursor-not-allowed bg-black/16 text-white/55"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="ml-1 h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="m8 5 11 7-11 7V5Z" />
                </svg>
              </button>
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
                className={`min-w-0 max-w-full font-semibold leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] line-clamp-2 max-[380px]:break-words sm:max-w-[14rem] sm:line-clamp-1 sm:truncate sm:whitespace-nowrap ${titleSizeClass}`}
              >
                {movie.title}
              </h2>
            </div>
          </div>
        </div>

        <div
          className={`grid shrink-0 grid-cols-3 gap-1 rounded-[18px] px-2 py-2.5 max-[380px]:gap-0.5 max-[380px]:px-1.5 sm:gap-2 sm:rounded-[20px] sm:px-3 sm:py-3 ${
            isDarkMode
              ? "border border-white/14 bg-white/10"
              : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
          }`}
        >
          <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-2.5">
            <span className={statIconFrame} aria-hidden>
              <svg
                viewBox="0 0 24 24"
                className={`${statIconInner} ${isDarkMode ? "text-violet-300" : "text-violet-600"}`}
                fill="currentColor"
              >
                <path d="M12 3.2 14.4 9.2h6.5l-5.2 3.8 2 6.4L12 16.9 6.3 19.4l2-6.4L3.1 9.2h6.5L12 3.2z" />
              </svg>
            </span>
            <div className="min-w-0 text-center sm:text-left">
              <p className={`text-xs font-semibold max-[380px]:truncate sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {movie.rating.toFixed(1)}
              </p>
              <p className={`text-[9px] max-[380px]:leading-tight sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                IMDb rating
              </p>
            </div>
          </div>
          <div
            className={`flex min-w-0 items-center justify-center gap-2 border-x px-0.5 sm:gap-2.5 sm:px-0 ${
              isDarkMode ? "border-white/12" : "border-black/6"
            }`}
          >
            <span className={statIconFrame} aria-hidden>
              <svg
                viewBox="0 0 24 24"
                className={`${statIconInner} ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
            </span>
            <div className="min-w-0 text-center sm:text-left">
              <p className={`text-xs font-semibold max-[380px]:truncate sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {runtimeLabel}
              </p>
              <p className={`text-[9px] max-[380px]:leading-tight sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                Runtime
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-2.5">
            <span className={statIconFrame} aria-hidden>
              <svg
                viewBox="0 0 24 24"
                className={`${statIconInner} ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 14s1.4 2 3.5 2 3.5-2 3.5-2" />
                <circle cx="9" cy="9.5" r="1.25" fill="currentColor" stroke="none" />
                <circle cx="15" cy="9.5" r="1.25" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <div className="min-w-0 text-center sm:text-left">
              <p className={`text-xs font-semibold sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {matchScore}%
              </p>
              <p className={`text-[9px] max-[380px]:leading-tight sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                Match
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-[var(--swipe-y-gap)] overflow-hidden">
          <div
            ref={descriptionSectionRef}
            className={`w-full rounded-[22px] px-3 py-2.5 text-left ${
              isDescriptionExpanded ? "min-h-0 flex-1 overflow-y-auto pr-1" : "shrink-0"
            } ${
              isDarkMode
                ? "bg-white/10"
                : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
            } ${shouldClamp && !isDescriptionExpanded ? "cursor-pointer" : ""}`}
            onClick={!isDescriptionExpanded && shouldClamp ? handleToggleDescription : undefined}
          >
            {shouldClamp ? (
              isDescriptionExpanded ? (
                <>
                  <p
                    className={`text-[11px] leading-[1.35rem] ${
                      isDarkMode ? "text-slate-200" : "text-slate-600"
                    }`}
                  >
                    {movie.description}
                  </p>
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      aria-label="Show less description"
                      aria-expanded
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggleDescription();
                      }}
                      className={`min-h-11 rounded-lg px-1 leading-5 ${
                        isDarkMode ? "text-violet-300" : "text-violet-600"
                      }`}
                      style={{ fontSize: "11px" }}
                    >
                      Less
                    </button>
                  </div>
                </>
              ) : (
                <div className="relative min-h-0">
                  <p
                    className={`line-clamp-3 pr-[3.35rem] text-[11px] leading-[1.35rem] ${
                      isDarkMode ? "text-slate-200" : "text-slate-600"
                    }`}
                  >
                    {movie.description}
                  </p>
                  <button
                    type="button"
                    aria-label="Show full description"
                    aria-expanded={false}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleDescription();
                    }}
                    className={`absolute bottom-0 right-0 z-[1] inline-flex min-h-11 items-end rounded-lg px-1 leading-5 ${
                      isDarkMode ? "text-violet-300" : "text-violet-600"
                    }`}
                    style={{ fontSize: "11px" }}
                  >
                    More
                  </button>
                </div>
              )
            ) : (
              <p
                className={`text-[11px] leading-[1.35rem] ${
                  isDarkMode ? "text-slate-200" : "text-slate-600"
                }`}
              >
                {movie.description}
              </p>
            )}
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 pb-[max(0.125rem,env(safe-area-inset-bottom,0px))] sm:gap-2.5">
            <button
              type="button"
              onClick={onReject}
              disabled={isInteractionLocked}
              className={`flex min-h-11 min-w-0 items-center justify-center rounded-[11px] border px-3 py-2.5 text-center text-[11px] font-semibold backdrop-blur-xl transition max-[380px]:px-2.5 sm:rounded-[12px] sm:px-3.5 sm:text-xs ${
                isDarkMode
                  ? "border-white/20 bg-white/[0.14] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.2]"
                  : "border-slate-300/75 bg-white/55 text-slate-700 shadow-sm hover:bg-white/75"
              } disabled:cursor-not-allowed disabled:opacity-65`}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={isInteractionLocked}
              className={`flex min-h-11 min-w-0 items-center justify-center rounded-[11px] border border-violet-400/45 bg-gradient-to-b from-violet-500/92 to-violet-600/95 px-3 py-2.5 text-center text-[11px] font-semibold text-white shadow-[0_8px_24px_rgba(109,40,217,0.35)] backdrop-blur-xl transition hover:from-violet-500 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-80 max-[380px]:px-2.5 sm:rounded-[12px] sm:px-3.5 sm:text-xs`}
            >
              Like
            </button>
          </div>
        </div>
      </SurfaceCard>
      {isTrailerVisible && typeof document !== "undefined"
        ? createPortal(
            <MovieTrailerModalLazy
              movie={movie}
              isDarkMode={isDarkMode}
              isInteractionLocked={isInteractionLocked}
              trailerUrl={trailerUrl}
              isLoadingTrailer={isLoadingTrailer}
              trailerError={trailerError}
              runtimeLabel={runtimeLabel}
              onClose={() => setIsTrailerVisible(false)}
              onRetryTrailer={() => void fetchTrailerIfNeeded()}
              onAccept={onAccept}
              onReject={onReject}
            />,
            document.body,
          )
        : null}
    </>
  );
}
