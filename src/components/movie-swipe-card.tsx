"use client";

import { useEffect, useRef, useState } from "react";
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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState(movie.trailerUrl ?? null);
  const [trailerError, setTrailerError] = useState<string | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSnapAnimating, setIsSnapAnimating] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const shouldClamp = movie.description.length > 82;
  const previewText = shouldClamp
    ? `${movie.description.slice(0, 82).trimEnd()}...`
    : movie.description;
  const isLongTitle = movie.title.length > 18;
  const hasTrailer = Boolean(trailerUrl) || movie.id.startsWith("tmdb-");

  useEffect(() => {
    setTrailerUrl(movie.trailerUrl ?? null);
    setTrailerError(null);
    setIsLoadingTrailer(false);
    setIsTrailerVisible(false);
  }, [movie.id, movie.trailerUrl]);

  useEffect(() => {
    if (!isDetailsOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (isTrailerVisible) {
        setIsTrailerVisible(false);
        return;
      }

      setIsDetailsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDetailsOpen, isTrailerVisible]);

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

  return (
    <>
      <SurfaceCard
        className={`flex h-[calc(100dvh-11.75rem)] min-h-[calc(100dvh-11.75rem)] max-h-[calc(100dvh-11.75rem)] flex-col gap-3 overflow-hidden p-4 sm:h-[calc(100dvh-12.75rem)] sm:min-h-[calc(100dvh-12.75rem)] sm:max-h-[calc(100dvh-12.75rem)] ${
          isSnapAnimating
            ? "duration-260 ease-[cubic-bezier(0.22,1,0.36,1)]"
            : "duration-150 ease-out"
        } transition-transform ${swipeFeedback ? `discover-card-swipe-${swipeFeedback}` : ""}`}
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
          className="relative overflow-hidden rounded-[26px] p-4 text-white shadow-[0_22px_60px_rgba(107,70,193,0.28)]"
          style={{
            backgroundImage: movie.poster.imageUrl
              ? `linear-gradient(145deg, rgba(30, 20, 50, 0.3), rgba(20, 16, 30, 0.76)), url(${movie.poster.imageUrl})`
              : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_30%)]" />
          <div className="relative flex min-h-[12rem] flex-col justify-between sm:min-h-[12.75rem]">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/92">
                {movie.mediaType === "series" ? "Series" : "Movie"}
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-black/18 px-2.5 py-1 text-[11px] font-semibold text-white/88">
                  {movie.year}
                </span>
                <span className="rounded-full bg-black/18 px-2.5 py-1 text-[11px] font-semibold text-white/88">
                  {movie.rating.toFixed(1)}
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
          <div className="space-y-3 pt-4">
            <p className="text-xs font-medium text-white/76">
              {movie.genre.slice(0, 3).join(" • ")}
            </p>
            <h2
              className={`max-w-[13rem] truncate font-semibold leading-tight ${
                isLongTitle ? "text-[1.55rem]" : "text-[1.9rem]"
              }`}
            >
              {movie.title}
            </h2>
          </div>
          </div>
        </div>

        <div className="flex min-h-[2rem] items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isDarkMode
                ? "bg-violet-500/14 text-violet-200"
                : "border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,236,255,0.88))] text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_20px_rgba(168,85,247,0.12)]"
            }`}
          >
            {movie.rating.toFixed(1)} rating
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isDarkMode
                ? "bg-white/8 text-slate-300"
                : "border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(238,244,255,0.84))] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_18px_rgba(148,163,184,0.12)]"
            }`}
          >
            {movie.runtime}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-between gap-2">
        <div className="space-y-2">
          <h3
            className={`line-clamp-2 text-base font-semibold leading-6 ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            {movie.title}
          </h3>
          <button
            type="button"
            onClick={() => setIsDetailsOpen(true)}
            className={`rounded-[20px] px-3 py-3 ${
              isDarkMode
                ? "bg-white/8 text-left"
                : "border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,241,255,0.82))] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_14px_30px_rgba(148,163,184,0.08)] backdrop-blur-xl"
            }`}
          >
            <p
              className={`line-clamp-3 text-sm leading-6 ${
                isDarkMode ? "text-slate-200" : "text-slate-600"
              }`}
            >
              {previewText}
            </p>
            <span
              className={`mt-2 block text-sm font-semibold ${
                isDarkMode ? "text-violet-300" : "text-violet-600"
              }`}
            >
              {shouldClamp ? "Tap to open full details" : "Tap to view details"}
            </span>
          </button>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-1 pb-2">
          <button
            type="button"
            onClick={onReject}
            disabled={isInteractionLocked}
            className={`rounded-[22px] px-4 py-3 text-sm font-semibold transition ${
              isDarkMode
                ? "border border-white/10 bg-white/8 text-slate-200 hover:bg-white/12"
                : "border border-white/85 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(242,244,249,0.88))] text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_14px_28px_rgba(148,163,184,0.12)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(244,236,255,0.9))]"
            }`}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={isInteractionLocked}
              className="rounded-[22px] bg-[linear-gradient(180deg,#8b5cf6,#7c3aed_58%,#6d28d9)] px-4 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_18px_30px_rgba(124,58,237,0.3)] transition hover:brightness-[1.04] disabled:cursor-not-allowed disabled:opacity-80"
            >
              Accept
            </button>
          </div>
        </div>
      </SurfaceCard>

      {isDetailsOpen ? (
        <div
          className="fixed inset-0 z-[220] flex items-stretch justify-center bg-slate-950/94 backdrop-blur-2xl"
          onClick={() => setIsDetailsOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className={`details-modal-shell flex h-full w-full min-h-0 flex-col overflow-hidden rounded-none px-4 pb-4 pt-3 shadow-[0_28px_80px_rgba(15,23,42,0.32)] sm:px-6 sm:pb-6 sm:pt-4 ${
              isDarkMode
                ? "bg-slate-950"
                : "bg-white"
            }`}
          >
            <div className="mb-3 flex justify-center sm:hidden">
              <span
                className={`h-1.5 w-14 rounded-full ${
                  isDarkMode ? "bg-white/12" : "bg-slate-200"
                }`}
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p
                  className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                    isDarkMode ? "text-slate-400" : "text-slate-400"
                  }`}
                >
                  Full details
                </p>
                <h3
                  className={`text-xl font-semibold ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  {movie.title}
                </h3>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {movie.mediaType === "series" ? "Series" : "Movie"} • {movie.year}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                aria-label="Close details"
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isDarkMode
                    ? "bg-white/10 text-white"
                    : "bg-slate-100 text-slate-700"
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

            <div
              className="mt-4 overflow-hidden rounded-[26px] text-white shadow-[0_18px_48px_rgba(107,70,193,0.24)]"
            >
              <div
                className="relative h-[28dvh] min-h-[11rem] w-full overflow-hidden sm:h-[30dvh]"
                style={{
                  backgroundImage:
                    !isTrailerVisible ||
                    (!trailerUrl && !isLoadingTrailer && !trailerError)
                      ? movie.poster.imageUrl
                        ? `linear-gradient(145deg, rgba(30, 20, 50, 0.24), rgba(20, 16, 30, 0.76)), url(${movie.poster.imageUrl})`
                        : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`
                      : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundColor:
                    isTrailerVisible &&
                    (trailerUrl || isLoadingTrailer || trailerError)
                      ? "#000"
                      : undefined,
                }}
              >
                {trailerUrl && isTrailerVisible ? (
                  <iframe
                    src={trailerUrl}
                    title={`${movie.title} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col justify-between p-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/92">
                        {movie.mediaType === "series" ? "Series" : "Movie"}
                      </span>
                      <span className="rounded-full bg-black/18 px-2.5 py-1 text-[11px] font-semibold text-white/88">
                        {movie.year}
                      </span>
                    </div>

                    <div className="flex h-full items-center justify-center">
                      {isTrailerVisible && (isLoadingTrailer || trailerError) ? (
                        <div className="max-w-xs rounded-[22px] bg-black/48 px-5 py-4 text-center backdrop-blur-md">
                          <p className="text-sm font-medium text-white">
                            {isLoadingTrailer
                              ? "Loading trailer..."
                              : trailerError ?? "Trailer unavailable for this title."}
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleOpenTrailer}
                          disabled={!hasTrailer || isLoadingTrailer}
                          className={`flex items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold backdrop-blur-md transition ${
                            hasTrailer
                              ? "bg-white/18 text-white hover:bg-white/24"
                              : "cursor-not-allowed bg-white/10 text-white/60"
                          }`}
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-violet-700">
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-4 w-4"
                              aria-hidden="true"
                            >
                              <path d="m8 5 11 7-11 7V5Z" />
                            </svg>
                          </span>
                          <span>
                            {hasTrailer ? "Play trailer" : "Trailer unavailable"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`details-panel mt-4 min-h-0 flex-1 overflow-hidden rounded-[22px] px-1 pr-2 ${
                isDarkMode
                  ? "border border-white/8 bg-white/6"
                  : "border border-slate-100 bg-slate-50/90"
              }`}
            >
              <div className="flex h-full min-h-0 flex-col px-3 py-3">
                <div>
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
                      isDarkMode ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    Storyline
                  </p>
                  <p
                    className={`mt-2 text-sm leading-7 ${
                      isDarkMode ? "text-slate-200" : "text-slate-600"
                    }`}
                  >
                    {movie.runtime} • {movie.rating.toFixed(1)} rating
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {movie.genre.map((entry) => (
                    <span
                      key={entry}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        isDarkMode
                          ? "bg-white/8 text-slate-300"
                          : "bg-white text-slate-600"
                      }`}
                    >
                      {entry}
                    </span>
                  ))}
                </div>
                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-2">
                  <p
                    className={`text-sm leading-7 ${
                      isDarkMode ? "text-slate-200" : "text-slate-600"
                    }`}
                  >
                    {movie.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </>
  );
}
