"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppState } from "@/lib/app-state";
import { SurfaceCard } from "@/components/surface-card";
import { Movie } from "@/lib/types";

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
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const shouldClamp = movie.description.length > 118;
  const previewText = shouldClamp
    ? `${movie.description.slice(0, 118).trimEnd()}...`
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

  const handleOpenTrailer = async () => {
    setIsTrailerVisible(true);
    setTrailerError(null);

    if (trailerUrl) {
      return;
    }

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
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isInteractionLocked) {
      return;
    }

    const touch = event.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    setIsSnapAnimating(false);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isInteractionLocked) {
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
    if (isInteractionLocked) {
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

  const trailerModal =
    isTrailerVisible && typeof document !== "undefined" ? (
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/40 px-5 backdrop-blur-[3px]"
        onClick={() => setIsTrailerVisible(false)}
      >
        <div
          onClick={(event) => event.stopPropagation()}
          className={`details-modal-shell w-full max-w-lg overflow-hidden rounded-[28px] border shadow-[0_30px_80px_rgba(15,23,42,0.42)] ${
            isDarkMode
              ? "border-white/10 bg-slate-950/96"
              : "border-white/75 bg-white/96"
          }`}
        >
          <div className="flex items-center justify-between gap-4 border-b border-black/6 px-5 py-3">
            <p
              className={`min-w-0 truncate text-[11px] font-medium tracking-[0.01em] ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {movie.title}
            </p>
            <button
              type="button"
              onClick={() => setIsTrailerVisible(false)}
              aria-label="Close trailer"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                isDarkMode ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 pt-3">
            <div className="overflow-hidden rounded-[24px] bg-black shadow-[0_22px_54px_rgba(76,29,149,0.26)]">
              <div className="relative aspect-video w-full bg-black">
                {trailerUrl ? (
                  <iframe
                    src={trailerUrl}
                    title={`${movie.title} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-white">
                    <p className="max-w-xs text-sm font-medium leading-6">
                      {isLoadingTrailer
                        ? "Loading trailer..."
                        : trailerError ?? "Trailer unavailable for this title."}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div
              className={`mt-4 rounded-[22px] px-3 py-3 ${
                isDarkMode
                  ? "border border-white/8 bg-white/6"
                  : "border border-slate-200/80 bg-slate-50/90"
              }`}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none text-violet-500">★</span>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {movie.rating.toFixed(1)}
                    </p>
                    <p
                      className={`text-[10px] ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      IMDb rating
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[1.1rem] leading-none ${
                      isDarkMode ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    ◷
                  </span>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {runtimeLabel}
                    </p>
                    <p
                      className={`text-[10px] ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Runtime
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onReject}
                  disabled={isInteractionLocked}
                  className={`rounded-[20px] px-4 py-3 text-xs font-semibold transition ${
                    isDarkMode
                      ? "border border-white/10 bg-white/8 text-slate-200 hover:bg-white/12"
                      : "border border-slate-200 bg-white text-slate-500 shadow-[0_12px_24px_rgba(148,163,184,0.1)] hover:bg-slate-50"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="text-sm leading-none">×</span>
                    <span>Reject</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={isInteractionLocked}
                  className="rounded-[20px] bg-[linear-gradient(180deg,#a855f7,#8b5cf6_45%,#7c3aed)] px-4 py-3 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_20px_rgba(124,58,237,0.24)] transition hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-80"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="text-sm leading-none">♡</span>
                    <span>Accept</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <SurfaceCard
        className={`flex h-full min-h-0 flex-1 flex-col gap-2.5 rounded-[30px] p-4 ${
          isSnapAnimating
            ? "duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]"
            : "duration-150 ease-out"
        } transition-transform ${swipeFeedback ? `discover-card-swipe-${swipeFeedback}` : ""} ${
          isDescriptionExpanded ? "overflow-y-auto" : "overflow-hidden"
        }`}
        style={{
          transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.045}deg) scale(${dragOffset === 0 ? 1 : 0.996})`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {swipeFeedback ? (
          <div className="pointer-events-none absolute inset-x-6 top-6 z-20 flex justify-center">
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
          className="relative overflow-hidden rounded-[10px] p-4 text-white shadow-[0_22px_60px_rgba(107,70,193,0.28)]"
          style={{
            backgroundImage: movie.poster.imageUrl
              ? `linear-gradient(145deg, rgba(30, 20, 50, 0.3), rgba(20, 16, 30, 0.76)), url(${movie.poster.imageUrl})`
              : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
            backgroundSize: movie.poster.imageUrl ? "contain" : "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.07),rgba(15,23,42,0.015)_28%,rgba(15,23,42,0.5)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_26%)]" />
          <div className="relative flex min-h-[13.25rem] flex-col justify-between sm:min-h-[14.5rem]">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-violet-500/88 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white shadow-[0_10px_24px_rgba(124,58,237,0.3)]">
                {movie.mediaType === "series" ? "Series" : "Movie"}
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white/88 backdrop-blur-md">
                  {movie.year}
                </span>
                <span className="rounded-full bg-amber-300/90 px-2.5 py-1 text-[11px] font-semibold text-amber-950 shadow-[0_10px_20px_rgba(251,191,36,0.25)]">
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
                className={`-ml-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition ${
                  canGoPrevious
                    ? "opacity-100 hover:bg-black/32 active:scale-95"
                    : "cursor-not-allowed opacity-35"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
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
                className={`-mr-1 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/20 text-white backdrop-blur-md transition ${
                  canGoNext
                    ? "opacity-100 hover:bg-black/32 active:scale-95"
                    : "cursor-not-allowed opacity-35"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
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
                className={`pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/28 shadow-[0_18px_38px_rgba(15,23,42,0.34)] backdrop-blur-md transition ${
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
                className={`max-w-[14rem] truncate whitespace-nowrap font-semibold leading-tight drop-shadow-[0_14px_24px_rgba(15,23,42,0.3)] ${titleSizeClass}`}
              >
                {movie.title}
              </h2>
            </div>
          </div>
        </div>

        <div
          className={`grid grid-cols-3 gap-2 rounded-[24px] px-3 py-2.5 ${
            isDarkMode
              ? "border border-white/8 bg-white/6"
              : "border border-white/85 bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_12px_24px_rgba(148,163,184,0.08)]"
          } my-[14px]`}
        >
          <div className="flex min-w-0 items-center justify-center gap-2">
            <span className="text-base leading-none text-violet-500">★</span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {movie.rating.toFixed(1)}
              </p>
              <p className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                IMDb rating
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-center gap-2 border-x border-black/6">
            <span className={`text-[1.1rem] leading-none ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>◷</span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {runtimeLabel}
              </p>
              <p className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Runtime
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-center gap-2">
            <span className="text-base leading-none text-emerald-500">☺</span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {matchScore}%
              </p>
              <p className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Match
              </p>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div
            className={`w-full rounded-[22px] px-3 py-3 text-left ${
              isDarkMode
                ? "bg-white/8"
                : "border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,244,255,0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_14px_30px_rgba(148,163,184,0.08)] backdrop-blur-xl"
            }`}
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
                {!isDescriptionExpanded ? (
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsDescriptionExpanded(true)}
                      className={`text-[11px] leading-5 ${
                        isDarkMode ? "text-violet-300" : "text-violet-600"
                      }`}
                    >
                      More
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsDescriptionExpanded(false)}
                      className={`text-[11px] leading-5 ${
                        isDarkMode ? "text-violet-300" : "text-violet-600"
                      }`}
                    >
                      Less
                    </button>
                  </div>
                )}
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

          <div className="mb-8 grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onReject}
              disabled={isInteractionLocked}
              className={`rounded-[22px] px-4 py-3 text-xs font-semibold transition ${
                isDarkMode
                  ? "border border-white/10 bg-white/8 text-slate-200 hover:bg-white/12"
                  : "border border-slate-200 bg-white text-slate-500 shadow-[0_12px_24px_rgba(148,163,184,0.1)] hover:bg-slate-50"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-sm leading-none">×</span>
                <span>Reject</span>
              </span>
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={isInteractionLocked}
              className="rounded-[22px] bg-[linear-gradient(180deg,#a855f7,#8b5cf6_45%,#7c3aed)] px-4 py-3 text-xs font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_20px_rgba(124,58,237,0.24)] transition hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-80"
            >
              <span className="inline-flex items-center gap-2">
                <span className="text-sm leading-none">♡</span>
                <span>Accept</span>
              </span>
            </button>
          </div>
        </div>
      </SurfaceCard>
      {trailerModal ? createPortal(trailerModal, document.body) : null}
    </>
  );
}
