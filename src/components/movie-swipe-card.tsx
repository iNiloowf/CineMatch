"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PosterBackdrop } from "@/components/poster-backdrop";
import {
  computeDiscoverSwipeMatchPercent,
  computeMovieMatchPercent,
} from "@/lib/match-score";
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
  /** Hide the center trailer play control (e.g. until first-run onboarding is done). */
  suppressTrailerPlayButton?: boolean;
  /** Discover: tap the Match % chip to explain why it fits your taste. */
  onMatchPercentClick?: () => void;
  /**
   * Full-bleed poster: image fills the card; metadata and copy sit on the poster
   * (no duplicate IMDb/runtime block below the image). Discover 2 only.
   */
  posterLayout?: "standard" | "immersive";
  /**
   * Discover 2: optional `?friendPreview=` on /discover2 to preview friend strips when you have
   * no linked friend data. Values: recommends | not_for_them | pick
   */
  friendRecommendationPreview?: "recommends" | "not_for_them" | "pick" | null;
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
  suppressTrailerPlayButton = false,
  onMatchPercentClick,
  posterLayout = "standard",
  friendRecommendationPreview = null,
}: MovieSwipeCardProps) {
  const immersive = posterLayout === "immersive";
  const {
    isDarkMode,
    acceptedMovies,
    onboardingPreferences,
    currentUserId,
    data,
    linkedUsers,
    discoverGenreAffinity,
    discoverRejectedGenreWeights,
    discoverTasteYear,
    discoverPersonalizationWeight,
  } = useAppState();
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

  const calendarYear = new Date().getFullYear();
  const matchScore = currentUserId
    ? computeDiscoverSwipeMatchPercent(movie, {
        genreAffinity: discoverGenreAffinity,
        rejectedGenreWeights: discoverRejectedGenreWeights,
        onboarding: onboardingPreferences,
        tasteYear: discoverTasteYear,
        calendarYear,
        personalizationWeight: discoverPersonalizationWeight,
      })
    : computeMovieMatchPercent(movie, {
        acceptedGenres,
        onboarding: onboardingPreferences,
      });

  const discoverPartnerNotes = useMemo(() => {
    if (!currentUserId) {
      return [];
    }
    const accepted = linkedUsers.filter((l) => l.status === "accepted");
    if (accepted.length === 0) {
      return [];
    }
    return accepted.flatMap((linked) => {
      const partnerId = linked.user.id;
      const displayName = linked.user.name.trim();
      const shortName = displayName.split(/\s+/)[0] || displayName;
      const hasPick = data.swipes.some(
        (s) => s.userId === partnerId && s.movieId === movie.id && s.decision === "accepted",
      );
      const review = data.watchedPickReviews.find(
        (r) => r.userId === partnerId && r.movieId === movie.id,
      );
      if (!hasPick && !review) {
        return [];
      }
      let label: string;
      if (review) {
        label = review.recommended
          ? `${shortName} added this to picks · Recommends it`
          : `${shortName} added this to picks · Marked not for them`;
      } else {
        label = `${shortName} added this to picks · No review yet`;
      }
      return [{ id: partnerId, label, displayName }];
    });
  }, [currentUserId, data, linkedUsers, movie.id]);

  const friendRecStrips = useMemo(() => {
    return discoverPartnerNotes.map((row) => {
      const first = row.displayName.trim().split(/\s+/)[0] || row.displayName;
      if (row.label.includes("Recommends it")) {
        return { id: row.id, firstName: first, tone: "recommends" as const, line: `${first} recommends this` };
      }
      if (row.label.includes("not for them") || row.label.includes("Marked not")) {
        return {
          id: row.id,
          firstName: first,
          tone: "not_for_them" as const,
          line: `${first} added to picks — didn’t work for them`,
        };
      }
      return {
        id: row.id,
        firstName: first,
        tone: "pick" as const,
        line: `${first} added to picks · no review yet`,
      };
    });
  }, [discoverPartnerNotes]);

  const friendStripsForPoster = useMemo(() => {
    if (friendRecStrips.length > 0) {
      return friendRecStrips;
    }
    if (!friendRecommendationPreview) {
      return [];
    }
    const demo = "Alex";
    if (friendRecommendationPreview === "recommends") {
      return [
        { id: "friend-preview", firstName: demo, tone: "recommends" as const, line: `${demo} recommends this` },
      ];
    }
    if (friendRecommendationPreview === "not_for_them") {
      return [
        {
          id: "friend-preview",
          firstName: demo,
          tone: "not_for_them" as const,
          line: `${demo} added to picks — didn’t work for them`,
        },
      ];
    }
    return [
      { id: "friend-preview", firstName: demo, tone: "pick" as const, line: `${demo} added to picks · no review yet` },
    ];
  }, [friendRecStrips, friendRecommendationPreview]);

  const handleToggleDescription = () => {
    if (!shouldClamp) {
      return;
    }

    setIsDescriptionExpanded((currentValue) => {
      const nextValue = !currentValue;

      if (!nextValue) {
        window.requestAnimationFrame(() => {
          descriptionSectionRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        });
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

  const statSvg = "h-6 w-6 shrink-0";

  const trailerModal = isTrailerVisible ? (
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
    />
  ) : null;

  if (immersive) {
    return (
      <div className="discover-immersive-swipe flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col self-stretch max-h-[calc(min(100dvh,100svh)-9.25rem)] sm:max-h-[calc(min(100dvh,100svh)-8.5rem)]">
        <SurfaceCard
          data-poster-layout="immersive"
          shimmer={false}
          transparentShell
          className={`discover-swipe-card-motion flex h-full min-h-0 w-full min-w-0 max-h-full flex-1 flex-col overflow-hidden !p-0 rounded-[22px] sm:rounded-[24px] [--swipe-y-gap:clamp(0.5rem,2vw,0.85rem)] ${
            isSnapAnimating ? "discover-swipe-card-motion--snap" : ""
          } transition-transform ${swipeFeedback ? `discover-card-swipe-${swipeFeedback}` : ""}`}
          style={{
            transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.045}deg) scale(${dragOffset === 0 ? 1 : 0.996})`,
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {swipeFeedback ? (
            <div className="pointer-events-none absolute inset-x-4 top-3 z-[var(--z-local)] flex justify-center sm:inset-x-6 sm:top-4">
              <div
                className={`discover-feedback-chip ${
                  swipeFeedback === "accepted" ? "discover-feedback-accept" : "discover-feedback-reject"
                }`}
              >
                {swipeFeedback === "accepted" ? "Added to picks" : "Passed for now"}
              </div>
            </div>
          ) : null}

          <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col">
            <div
              className="discover-immersive-poster-slot relative z-0 w-full min-w-0 flex-1 overflow-hidden [min-height:max(12.5rem,min(42dvh,52svh))] max-h-[min(66dvh,40rem)]"
            >
              <div
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage: movie.poster.imageUrl
                    ? undefined
                    : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                aria-hidden
              />
              <PosterBackdrop
                imageUrl={movie.poster.imageUrl}
                profile="hero"
                objectFit="cover"
                className="z-[1]"
              />
              <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(2,6,23,0.45),transparent_38%,rgba(2,6,23,0.12)_55%,rgba(2,6,23,0.7)_100%)]" />

              <div className="absolute left-0 right-0 top-0 z-[3] flex min-w-0 w-full max-w-full items-start justify-between gap-2 px-3 pt-3 sm:px-3.5 sm:pt-3.5">
                <span className="ui-chip ui-chip--brand-media shrink-0 sm:px-3 sm:text-[10px] sm:tracking-[0.24em]">
                  {movie.mediaType === "series" ? "Series" : "Movie"}
                </span>
                <div className="flex min-w-0 max-w-[min(100%,15rem)] flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:gap-2">
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

              {friendStripsForPoster.length > 0 ? (
                <div
                  className="absolute left-2.5 right-2.5 z-[3] max-h-[5rem] overflow-hidden sm:left-3 sm:right-3 sm:max-h-[5.5rem]"
                  style={{ top: "3.1rem" }}
                  data-friend-pick={friendRecStrips.length > 0 ? "live" : "preview"}
                >
                  {friendRecStrips.length === 0 && friendRecommendationPreview ? (
                    <p className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.12em] text-white/55">Preview (URL)</p>
                  ) : null}
                  <ul className="flex list-none flex-col gap-1.5 p-0">
                    {friendStripsForPoster.map((row) => (
                      <li
                        key={row.id}
                        className={`flex items-start gap-2 rounded-2xl border px-2.5 py-1.5 text-[10px] font-semibold leading-snug shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur-md sm:text-[11px] ${
                          row.tone === "recommends"
                            ? "border-emerald-400/55 bg-emerald-950/80 text-emerald-50"
                            : row.tone === "not_for_them"
                              ? "border-amber-400/50 bg-amber-950/78 text-amber-50"
                              : "border-violet-400/50 bg-slate-950/82 text-violet-100"
                        }`}
                      >
                        <span aria-hidden className="shrink-0 text-[0.85rem] leading-none">
                          {row.tone === "recommends" ? "💬" : row.tone === "not_for_them" ? "⏸" : "👤"}
                        </span>
                        <span>{row.line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="absolute inset-y-0 left-0 right-0 z-[3] flex items-center justify-between px-0">
                <button
                  type="button"
                  onClick={onPrevious}
                  disabled={!canGoPrevious}
                  aria-label="Show previous title"
                  className={`-ml-1 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/15 text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition ${
                    canGoPrevious
                      ? "opacity-100 hover:bg-black/28 active:scale-95"
                      : "cursor-not-allowed opacity-35"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden="true">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!canGoNext}
                  aria-label="Show next title"
                  className={`-mr-1 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/15 text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition ${
                    canGoNext ? "opacity-100 hover:bg-black/28 active:scale-95" : "cursor-not-allowed opacity-35"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>

              {!suppressTrailerPlayButton ? (
                <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleOpenTrailer}
                    disabled={!hasTrailer || isLoadingTrailer}
                    aria-label={hasTrailer ? "Play trailer" : "Trailer unavailable"}
                    className={`pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border text-white shadow-[0_6px_28px_rgba(0,0,0,0.55)] transition ${
                      hasTrailer
                        ? "border-white/50 bg-transparent hover:bg-black/20 active:scale-95"
                        : "cursor-not-allowed border-white/25 bg-transparent text-white/50"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="ml-1 h-6 w-6 drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)]"
                      aria-hidden="true"
                    >
                      <path d="m8 5 11 7-11 7V5Z" />
                    </svg>
                  </button>
                </div>
              ) : null}

              <div
                className={`absolute inset-x-0 bottom-0 z-[4] flex min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden ${
                  isDescriptionExpanded
                    ? "max-h-[min(55dvh,70%)]"
                    : "max-h-[min(48dvh,60%)]"
                }`}
              >
                <div
                  className={`max-h-full min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overscroll-contain rounded-t-[18px] bg-gradient-to-t from-slate-950/98 via-slate-950/88 to-slate-950/25 px-3 pb-1.5 pt-5 sm:rounded-t-[20px] sm:px-3.5 sm:pt-7 ${
                    isDescriptionExpanded
                      ? "overflow-y-auto [scrollbar-gutter:stable] sm:pt-9"
                      : "overflow-y-hidden"
                  }`}
                  style={isDescriptionExpanded ? { WebkitOverflowScrolling: "touch" } : undefined}
                >
                  <h2
                    className={`min-w-0 max-w-full font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:max-w-none ${titleSizeClass} ${
                      movie.title.length > 24 ? "text-[0.9rem] sm:text-[1rem]" : "text-base sm:text-lg"
                    }`}
                  >
                    {movie.title}
                  </h2>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {movie.genre.slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className="rounded-lg border border-white/15 bg-white/8 px-2 py-0.5 text-[9px] font-semibold text-white/95 backdrop-blur-sm sm:px-2.5 sm:text-[10px]"
                        title={genre}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                  {onMatchPercentClick ? (
                    <div className="mt-1.5 sm:mt-1.5">
                      <button
                        type="button"
                        disabled={isInteractionLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          onMatchPercentClick();
                        }}
                        className="inline-flex min-h-6 min-w-0 max-w-full items-center gap-0.5 rounded-full border border-violet-400/40 bg-violet-500/22 px-1.5 py-0.5 text-left text-[7px] font-medium leading-tight text-violet-100/95 shadow-sm backdrop-blur-sm transition sm:min-h-7 sm:gap-1 sm:px-2 sm:py-0.5 sm:text-[8px] enabled:hover:bg-violet-500/32 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400/80 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`Why ${matchScore}% match for your taste?`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3"
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
                        <span>
                          {matchScore}% <span className="font-medium text-violet-200/85">match</span>
                        </span>
                        <span className="ml-0.5 text-[6.5px] font-medium text-violet-200/70 sm:text-[7.5px]">Why</span>
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-[7px] font-medium text-violet-200/88 sm:mt-1.5 sm:text-[8px]">
                      {matchScore}% match
                    </p>
                  )}

                  {movie.description.trim() ? (
                    <div
                      ref={descriptionSectionRef}
                      className={`mt-2.5 border-t border-white/10 pt-2.5 ${
                        isDescriptionExpanded ? "min-h-0" : ""
                      } ${shouldClamp && !isDescriptionExpanded ? "cursor-pointer" : ""}`}
                      onClick={!isDescriptionExpanded && shouldClamp ? handleToggleDescription : undefined}
                    >
                      {shouldClamp ? (
                        isDescriptionExpanded ? (
                          <>
                            <p className="text-[11px] leading-[1.35rem] text-slate-100/90">{movie.description}</p>
                            <div className="mt-1 flex justify-end">
                              <button
                                type="button"
                                aria-label="Show less description"
                                aria-expanded
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleDescription();
                                }}
                                className="min-h-11 rounded-lg px-1 text-violet-300"
                                style={{ fontSize: "11px" }}
                              >
                                Less
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="relative min-h-0 w-full">
                            <p className="line-clamp-3 pr-[3.35rem] text-[11px] leading-[1.35rem] text-slate-100/90">
                              {movie.description}
                            </p>
                            <button
                              type="button"
                              aria-label="Show full description"
                              aria-expanded={false}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDescription();
                              }}
                              className="absolute bottom-0 right-0 z-[1] inline-flex min-h-11 items-end rounded-lg px-1 text-violet-300"
                              style={{ fontSize: "11px" }}
                            >
                              More
                            </button>
                          </div>
                        )
                      ) : (
                        <p className="text-[11px] leading-[1.35rem] text-slate-100/90">{movie.description}</p>
                      )}
                    </div>
                  ) : null}

                  {discoverPartnerNotes.length > 0 ? (
                    <div className="mt-2.5 border-t border-white/12 pt-2" role="region" aria-label="What your connected friends did with this title">
                      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-violet-200/90">Your connections</p>
                      <ul className="mt-1.5 space-y-0.5 overflow-hidden text-[10px] font-medium leading-snug text-slate-100/90">
                        {discoverPartnerNotes.slice(0, 2).map((row) => (
                          <li key={row.id} className="line-clamp-2" title={row.displayName}>
                            {row.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              className={`mt-auto shrink-0 w-full min-w-0 max-w-full border-t rounded-b-[22px] sm:rounded-b-[24px] px-3 pt-2.5 sm:px-3.5 ${isDarkMode
                ? "border-white/10 bg-slate-950/[0.98]"
                : "border-slate-200/90 bg-white"} pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]`}
            >
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={onReject}
                  disabled={isInteractionLocked}
                  className={`min-h-11 min-w-0 rounded-md border px-2.5 py-2.5 text-[11px] font-semibold backdrop-blur-xl transition sm:px-3.5 sm:text-xs ${
                    isDarkMode
                      ? "border-white/22 bg-white/[0.12] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.18]"
                      : "border-slate-300/80 bg-slate-50/95 text-slate-800 shadow-sm hover:bg-white/90"
                  } disabled:cursor-not-allowed disabled:opacity-65`}
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={isInteractionLocked}
                  className="min-h-11 min-w-0 rounded-md border border-violet-400/40 bg-gradient-to-b from-violet-500/88 to-violet-600/92 px-2.5 py-2.5 text-[11px] font-semibold text-white shadow-[0_6px_22px_rgba(109,40,217,0.32)] backdrop-blur-xl transition enabled:hover:from-violet-500 enabled:hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-80 sm:px-3.5 sm:text-xs"
                >
                  Like
                </button>
              </div>
            </div>
          </div>
        </SurfaceCard>
        {trailerModal}
      </div>
    );
  }

  return (
    <>
      <SurfaceCard
        shimmer={false}
        className={`discover-swipe-card-motion flex h-full min-h-0 flex-1 flex-col overflow-hidden p-3 [--swipe-y-gap:clamp(0.75rem,2.85vw,1.05rem)] sm:p-3.5 rounded-[24px] ${
          isSnapAnimating ? "discover-swipe-card-motion--snap" : ""
        } transition-transform ${swipeFeedback ? `discover-card-swipe-${swipeFeedback}` : ""}`}
        style={{
          transform: `translateX(${dragOffset}px) rotate(${dragOffset * 0.045}deg) scale(${dragOffset === 0 ? 1 : 0.996})`,
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
                className={`-ml-1 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/15 text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition ${
                  canGoPrevious
                    ? "opacity-100 hover:bg-black/28 active:scale-95"
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
                className={`-mr-1 flex h-11 w-11 items-center justify-center rounded-full border border-white/35 bg-black/15 text-white shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition ${
                  canGoNext
                    ? "opacity-100 hover:bg-black/28 active:scale-95"
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
            {!suppressTrailerPlayButton ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleOpenTrailer}
                  disabled={!hasTrailer || isLoadingTrailer}
                  aria-label={hasTrailer ? "Play trailer" : "Trailer unavailable"}
                  className={`pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border text-white shadow-[0_6px_28px_rgba(0,0,0,0.55)] transition ${
                    hasTrailer
                      ? "border-white/50 bg-transparent hover:bg-black/20 active:scale-95"
                      : "cursor-not-allowed border-white/25 bg-transparent text-white/50"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="ml-1 h-6 w-6 drop-shadow-[0_2px_6px_rgba(0,0,0,0.75)]"
                    aria-hidden="true"
                  >
                    <path d="m8 5 11 7-11 7V5Z" />
                  </svg>
                </button>
              </div>
            ) : null}
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
          className={`mt-[var(--swipe-y-gap)] grid shrink-0 grid-cols-3 gap-1 rounded-[18px] px-2 py-2.5 max-[380px]:gap-0.5 max-[380px]:px-1.5 sm:gap-2 sm:rounded-[20px] sm:px-3 sm:py-3 ${
            isDarkMode
              ? "border border-white/14 bg-white/10"
              : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
          }`}
        >
          <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-2.5">
            <svg
              viewBox="0 0 24 24"
              className={`${statSvg} shrink-0 ${isDarkMode ? "text-violet-300" : "text-violet-600"}`}
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 3.2 14.4 9.2h6.5l-5.2 3.8 2 6.4L12 16.9 6.3 19.4l2-6.4L3.1 9.2h6.5L12 3.2z" />
            </svg>
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
            <svg
              viewBox="0 0 24 24"
              className={`${statSvg} shrink-0 ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}
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
              <p className={`text-xs font-semibold max-[380px]:truncate sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {runtimeLabel}
              </p>
              <p className={`text-[9px] max-[380px]:leading-tight sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                Runtime
              </p>
            </div>
          </div>
          {onMatchPercentClick ? (
            <button
              type="button"
              disabled={isInteractionLocked}
              onClick={(event) => {
                event.stopPropagation();
                onMatchPercentClick();
              }}
              aria-label={`Why ${matchScore}% match for your taste?`}
              className={`flex h-full min-h-[2.75rem] w-full min-w-0 items-center justify-center gap-2 self-stretch rounded-xl px-1 touch-manipulation transition sm:gap-2.5 ${
                isInteractionLocked
                  ? "cursor-not-allowed opacity-60"
                  : isDarkMode
                    ? "cursor-pointer hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-400/80"
                    : "cursor-pointer hover:bg-violet-50/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-violet-500/70"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`${statSvg} shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}
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
                <p
                  className={`text-xs font-semibold sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  {matchScore}%
                </p>
                <p
                  className={`text-[9px] max-[380px]:leading-tight sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}
                >
                  Match
                </p>
              </div>
            </button>
          ) : (
            <div className="flex min-w-0 items-center justify-center gap-2 sm:gap-2.5">
              <svg
                viewBox="0 0 24 24"
                className={`${statSvg} ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}
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
                  {matchScore}%
                </p>
                <p
                  className={`text-[9px] max-[380px]:leading-tight sm:text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}
                >
                  Match
                </p>
              </div>
            </div>
          )}
        </div>

        {discoverPartnerNotes.length > 0 ? (
          <div
            className={`mt-[var(--swipe-y-gap)] shrink-0 rounded-[18px] border px-3 py-2.5 sm:px-3.5 ${
              isDarkMode
                ? "border-white/14 bg-white/[0.07]"
                : "border-slate-200/90 bg-white/80 shadow-sm"
            }`}
            role="region"
            aria-label="What your connected friends did with this title"
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                isDarkMode ? "text-violet-200/90" : "text-violet-600/90"
              }`}
            >
              Your connections
            </p>
            <ul className="mt-2 space-y-1.5">
              {discoverPartnerNotes.map((row) => (
                <li
                  key={row.id}
                  className={`text-[11px] font-medium leading-snug ${
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  }`}
                  title={row.displayName}
                >
                  {row.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-[var(--swipe-y-gap)] flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            className={`flex w-full flex-col overflow-hidden rounded-[22px] text-left ${
              isDescriptionExpanded ? "min-h-0 flex-1" : "shrink-0"
            } ${
              isDarkMode
                ? "bg-white/10"
                : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
            } ${shouldClamp && !isDescriptionExpanded ? "cursor-pointer" : ""}`}
            onClick={!isDescriptionExpanded && shouldClamp ? handleToggleDescription : undefined}
          >
            <div
              ref={descriptionSectionRef}
              className={`text-left ${
                isDescriptionExpanded
                  ? "min-h-0 max-h-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-2.5 [scrollbar-gutter:stable] touch-pan-y"
                  : "px-3 py-2.5"
              }`}
              style={isDescriptionExpanded ? { WebkitOverflowScrolling: "touch" } : undefined}
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
          </div>

          {!isDescriptionExpanded ? <div className="min-h-0 w-full min-w-0 flex-1" aria-hidden /> : null}

          <div className="grid shrink-0 grid-cols-2 gap-2 pt-[var(--swipe-y-gap)] pb-[max(0.125rem,env(safe-area-inset-bottom,0px))] sm:gap-2.5">
            <button
              type="button"
              onClick={onReject}
              disabled={isInteractionLocked}
              className={`min-h-11 min-w-0 rounded-md border px-3 py-2.5 text-[11px] font-semibold backdrop-blur-xl transition max-[380px]:px-2.5 sm:rounded-[10px] sm:px-3.5 sm:text-xs ${
                isDarkMode
                  ? "border-white/22 bg-white/[0.12] text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.18]"
                  : "border-slate-300/80 bg-white/50 text-slate-800 shadow-sm hover:bg-white/70"
              } disabled:cursor-not-allowed disabled:opacity-65`}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={onAccept}
              disabled={isInteractionLocked}
              className="min-h-11 min-w-0 rounded-md border border-violet-400/40 bg-gradient-to-b from-violet-500/88 to-violet-600/92 px-3 py-2.5 text-[11px] font-semibold text-white shadow-[0_6px_22px_rgba(109,40,217,0.32)] backdrop-blur-xl transition hover:from-violet-500 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-80 max-[380px]:px-2.5 sm:rounded-[10px] sm:px-3.5 sm:text-xs"
            >
              Like
            </button>
          </div>
        </div>
      </SurfaceCard>
      {trailerModal}
    </>
  );
}
