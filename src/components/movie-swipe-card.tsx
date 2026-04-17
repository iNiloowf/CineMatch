"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PosterBackdrop } from "@/components/poster-backdrop";
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
  const { isDarkMode } = useAppState();
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
  const previewText = shouldClamp
    ? `${movie.description.slice(0, 92).trimEnd()}...`
    : movie.description;
  const titleSizeClass =
    movie.title.length > 34
      ? "text-[1.2rem]"
      : movie.title.length > 28
        ? "text-[1.35rem]"
        : movie.title.length > 22
          ? "text-[1.6rem]"
          : "text-[2.15rem]";
  const hasTrailer = Boolean(trailerUrl) || movie.id.startsWith("tmdb-");
  const runtimeLabel =
    movie.runtime.trim().toLowerCase() === "runtime unavailable"
      ? "N/A"
      : movie.runtime;
  const matchScore = Math.max(
    62,
    Math.min(98, Math.round(movie.rating * 13 + movie.genre.length * 4)),
  );
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

  return (
    <>
      <SurfaceCard
        className={`discover-swipe-card-motion flex h-full min-h-0 flex-1 flex-col gap-2.5 overflow-visible rounded-[30px] p-4 ${
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
          className="relative shrink-0 overflow-hidden rounded-[10px] p-4 text-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
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
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05),transparent_40%,rgba(15,23,42,0.44)_100%)]" />
          <div className="relative flex min-h-[11.125rem] flex-col justify-between gap-2 sm:min-h-[12rem]">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <span className="ui-chip ui-chip--brand-media shrink-0 sm:px-3 sm:text-[10px] sm:tracking-[0.24em]">
                {movie.mediaType === "series" ? "Series" : "Movie"}
              </span>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                <span className="ui-chip ui-chip--media-meta shrink-0 sm:px-2.5 sm:text-[11px]">
                  {movie.year}
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
                className={`-ml-1 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition ${
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
                className={`-mr-1 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition ${
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
                className={`pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/25 shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition ${
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
            <div className="space-y-2 pt-4">
              <p className="text-xs font-medium text-white/80">
                {movie.genre.slice(0, 3).join(" • ")}
              </p>
              <h2
                className={`min-w-0 max-w-full font-semibold leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)] line-clamp-2 max-[380px]:break-words sm:max-w-[14rem] sm:line-clamp-1 sm:truncate sm:whitespace-nowrap ${titleSizeClass}`}
              >
                {movie.title}
              </h2>
            </div>
          </div>
        </div>

        <div
          className={`flex min-h-0 flex-col gap-[5px] ${
            isDescriptionExpanded ? "shrink-0 pr-1" : "flex-1 overflow-hidden"
          }`}
        >
          <div
            className={`my-[6px] grid shrink-0 grid-cols-3 gap-1 rounded-[24px] px-2 py-2 max-[380px]:gap-0.5 max-[380px]:px-1.5 sm:gap-2 sm:px-3 sm:py-2.5 ${
              isDarkMode
                ? "border border-white/14 bg-white/10"
                : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
            }`}
          >
            <div className="flex min-w-0 items-center justify-center gap-1 sm:gap-2">
              <span className="shrink-0 text-sm leading-none text-violet-500 sm:text-base">★</span>
              <div className="min-w-0 text-center sm:text-left">
                <p className={`text-xs font-semibold max-[380px]:truncate sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {movie.rating.toFixed(1)}
                </p>
                <p className={`text-[9px] max-[380px]:leading-tight sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                  IMDb rating
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-center justify-center gap-1 border-x border-black/6 px-0.5 sm:gap-2 sm:px-0">
              <span className={`shrink-0 text-[0.95rem] leading-none sm:text-[1.1rem] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>◷</span>
              <div className="min-w-0 text-center sm:text-left">
                <p className={`text-xs font-semibold max-[380px]:truncate sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                  {runtimeLabel}
                </p>
                <p className={`text-[9px] max-[380px]:leading-tight sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                  Runtime
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-center justify-center gap-1 sm:gap-2">
              <span className="shrink-0 text-sm leading-none text-emerald-500 sm:text-base">☺</span>
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

          <div
            ref={descriptionSectionRef}
            className={`w-full shrink-0 rounded-[22px] px-3 py-3 text-left ${
              isDarkMode
                ? "bg-white/10"
                : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
            } ${shouldClamp && !isDescriptionExpanded ? "cursor-pointer" : ""}`}
            onClick={!isDescriptionExpanded && shouldClamp ? handleToggleDescription : undefined}
          >
            {shouldClamp ? (
              <>
                <p
                  className={`text-[11px] leading-5 ${
                    shouldClamp && !isDescriptionExpanded ? "line-clamp-2" : ""
                  } ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}
                >
                  {isDescriptionExpanded ? movie.description : previewText}
                </p>
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    aria-label={isDescriptionExpanded ? "Show less description" : "Show full description"}
                    aria-expanded={isDescriptionExpanded}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleToggleDescription();
                    }}
                    className={`min-h-11 rounded-lg px-1 leading-5 ${
                      isDarkMode ? "text-violet-300" : "text-violet-600"
                    }`}
                    style={{ fontSize: "11px" }}
                  >
                    {isDescriptionExpanded ? "Less" : "More"}
                  </button>
                </div>
              </>
            ) : (
              <p
                className={`text-[11px] leading-5 ${
                  isDarkMode ? "text-slate-200" : "text-slate-600"
                }`}
              >
                {previewText}
              </p>
            )}
          </div>

          <div className="mb-8 grid shrink-0 grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onReject}
              disabled={isInteractionLocked}
              className={`min-h-11 min-w-0 rounded-[22px] px-3 py-2.5 text-[11px] font-semibold transition max-[380px]:px-2.5 sm:px-4 sm:py-3 sm:text-xs ${
                isDarkMode
                  ? "border border-white/10 bg-white/8 text-slate-200 hover:bg-white/12"
                  : "border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
              }`}
            >
              <span className="inline-flex min-w-0 items-center justify-center gap-1.5 sm:gap-2">
                <span className="shrink-0 text-sm leading-none">×</span>
                <span className="min-w-0 truncate">Reject</span>
              </span>
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={isInteractionLocked}
              className="min-h-11 min-w-0 rounded-[22px] bg-violet-600 px-3 py-2.5 text-[11px] font-semibold text-white shadow-[0_4px_16px_rgba(109,40,217,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-80 max-[380px]:px-2.5 sm:px-4 sm:py-3 sm:text-xs"
            >
              <span className="inline-flex min-w-0 items-center justify-center gap-1.5 sm:gap-2">
                <span className="shrink-0 text-sm leading-none">♡</span>
                <span className="min-w-0 truncate">Accept</span>
              </span>
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
