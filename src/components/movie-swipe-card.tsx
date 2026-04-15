"use client";

import { useRef, useState } from "react";
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
}: MovieSwipeCardProps) {
  const { isDarkMode } = useAppState();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSnapAnimating, setIsSnapAnimating] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const shouldClamp = movie.description.length > 82;
  const previewText = shouldClamp
    ? `${movie.description.slice(0, 82).trimEnd()}...`
    : movie.description;
  const isLongTitle = movie.title.length > 18;

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
        } transition-transform`}
        style={{
          transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.045}deg) scale(${dragOffset === 0 ? 1 : 0.996})`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
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
          <div className="space-y-2">
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
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
            {movie.rating.toFixed(1)} rating
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {movie.runtime}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-between gap-2">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-base font-semibold leading-6 text-slate-900">
            {movie.title}
          </h3>
          <div className="rounded-[18px] bg-slate-50 px-3 py-3">
            <p className="line-clamp-3 text-sm leading-6 text-slate-600">
              {previewText}
            </p>
            {shouldClamp ? (
              <button
                type="button"
                onClick={() => setIsDetailsOpen(true)}
                className="mt-1 block text-sm font-semibold text-violet-600"
              >
                More
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-auto grid grid-cols-2 gap-3 pt-1 pb-2">
          <button
            type="button"
            onClick={onReject}
            className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="rounded-[22px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(124,58,237,0.3)] transition hover:bg-violet-500"
            >
              Accept
            </button>
          </div>
        </div>
      </SurfaceCard>

      {isDetailsOpen ? (
        <div
          className="fixed inset-0 z-[140] flex items-stretch justify-center bg-slate-950/86 backdrop-blur-2xl sm:items-center"
          onClick={() => setIsDetailsOpen(false)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className={`expand-soft flex h-full w-full flex-col overflow-hidden rounded-none p-5 shadow-[0_28px_80px_rgba(15,23,42,0.32)] sm:mx-auto sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:w-full sm:max-w-md sm:rounded-[32px] ${
              isDarkMode
                ? "border border-white/10 bg-slate-950"
                : "border border-white/70 bg-white"
            }`}
          >
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
              className="mt-4 overflow-hidden rounded-[24px] p-4 text-white shadow-[0_18px_48px_rgba(107,70,193,0.24)]"
              style={{
                backgroundImage: movie.poster.imageUrl
                  ? `linear-gradient(145deg, rgba(30, 20, 50, 0.24), rgba(20, 16, 30, 0.76)), url(${movie.poster.imageUrl})`
                  : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="min-h-[10.5rem]">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/92">
                    {movie.mediaType === "series" ? "Series" : "Movie"}
                  </span>
                  <span className="rounded-full bg-black/18 px-2.5 py-1 text-[11px] font-semibold text-white/88">
                    {movie.year}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                {movie.rating.toFixed(1)} rating
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {movie.runtime}
              </span>
              {movie.genre.map((entry) => (
                <span
                  key={entry}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {entry}
                </span>
              ))}
            </div>

            <div
              className={`mt-4 min-h-0 flex-1 overflow-y-auto rounded-[20px] px-1 pr-2 ${
                isDarkMode ? "bg-white/8" : "bg-slate-50"
              }`}
            >
              <p
                className={`px-3 py-3 text-sm leading-7 ${
                  isDarkMode ? "text-slate-200" : "text-slate-600"
                }`}
              >
                {movie.description}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
