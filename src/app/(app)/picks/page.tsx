"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { matchPercentForMovie } from "@/components/movie-details-modal";
import { PageHeader } from "@/components/page-header";
import { PicksMovieRow } from "@/components/picks-movie-row";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import { computeMovieMatchPercent } from "@/lib/match-score";

const PicksTrailerModalLazy = dynamic(
  () => import("@/components/picks-trailer-modal").then((m) => m.PicksTrailerModal),
  { ssr: false },
);

type ShareToast = { message: string; variant: "success" | "error" };
type TopSharedPick = {
  movieId: string;
  title: string;
  year: number;
  score: number;
  reasons: string[];
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getTasteOverlapLabel(score: number) {
  if (score >= 85) {
    return "Very high";
  }
  if (score >= 60) {
    return "Medium";
  }
  return "Low";
}

export default function PicksPage() {
  const {
    data,
    currentUserId,
    acceptedMovies,
    sharedMovies,
    linkedUsers,
    removePick,
    onboardingPreferences,
    isDarkMode,
    hasProAccess,
  } = useAppState();
  const [pendingRemoveMovieId, setPendingRemoveMovieId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<ShareToast | null>(null);
  const shareToastTimerRef = useRef<number | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerError, setTrailerError] = useState<string | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [isPremiumInsightsClosed, setIsPremiumInsightsClosed] = useState(false);
  const premiumInsightsStorageKey = `cinematch-picks-premium-insights-hidden-${currentUserId ?? "guest"}`;

  const pendingRemoveMovie = useMemo(
    () =>
      pendingRemoveMovieId
        ? acceptedMovies.find((movie) => movie.id === pendingRemoveMovieId) ?? null
        : null,
    [acceptedMovies, pendingRemoveMovieId],
  );
  const selectedMovie = useMemo(
    () =>
      selectedMovieId
        ? acceptedMovies.find((movie) => movie.id === selectedMovieId) ?? null
        : null,
    [acceptedMovies, selectedMovieId],
  );

  const partnerNamesByPickId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of sharedMovies) {
      const list = map.get(entry.movie.id) ?? [];
      list.push(entry.partner.name);
      map.set(entry.movie.id, list);
    }
    return map;
  }, [sharedMovies]);

  const mutualPickCount = useMemo(
    () => new Set(sharedMovies.map((entry) => entry.movie.id)).size,
    [sharedMovies],
  );
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
  const acceptedMovieIdSet = useMemo(
    () => new Set(acceptedMovies.map((movie) => movie.id)),
    [acceptedMovies],
  );
  const primaryPartner = useMemo(() => {
    const acceptedLinks = linkedUsers
      .filter((entry) => entry.status === "accepted")
      .map((entry) => entry.user)
      .sort((left, right) => left.name.localeCompare(right.name));
    return acceptedLinks[0] ?? null;
  }, [linkedUsers]);
  const partnerAcceptedMovieIds = useMemo(() => {
    if (!primaryPartner) {
      return new Set<string>();
    }
    return new Set(
      data.swipes
        .filter(
          (swipe) =>
            swipe.userId === primaryPartner.id && swipe.decision === "accepted",
        )
        .map((swipe) => swipe.movieId),
    );
  }, [data.swipes, primaryPartner]);
  const partnerRejectedMovieIds = useMemo(() => {
    if (!primaryPartner) {
      return new Set<string>();
    }
    return new Set(
      data.swipes
        .filter(
          (swipe) =>
            swipe.userId === primaryPartner.id && swipe.decision === "rejected",
        )
        .map((swipe) => swipe.movieId),
    );
  }, [data.swipes, primaryPartner]);
  const userRejectedMovieIds = useMemo(() => {
    if (!currentUserId) {
      return new Set<string>();
    }
    return new Set(
      data.swipes
        .filter(
          (swipe) =>
            swipe.userId === currentUserId && swipe.decision === "rejected",
        )
        .map((swipe) => swipe.movieId),
    );
  }, [currentUserId, data.swipes]);
  const partnerAcceptedGenres = useMemo(() => {
    return new Set(
      data.movies
        .filter((movie) => partnerAcceptedMovieIds.has(movie.id))
        .flatMap((movie) =>
          movie.genre
            .map((genre) => genre.trim().toLowerCase())
            .filter(
              (genre) =>
                Boolean(genre) && genre !== "movie" && genre !== "series",
            ),
        ),
    );
  }, [data.movies, partnerAcceptedMovieIds]);
  const tasteOverlap = useMemo(() => {
    if (!primaryPartner) {
      return null;
    }

    const likedUnionSize = new Set([
      ...acceptedMovieIdSet,
      ...partnerAcceptedMovieIds,
    ]).size;
    const bothLikedCount = [...acceptedMovieIdSet].filter((movieId) =>
      partnerAcceptedMovieIds.has(movieId),
    ).length;
    const oneLikeOneNotCount = likedUnionSize - bothLikedCount;
    const movieOverlapPercent =
      likedUnionSize > 0 ? (bothLikedCount / likedUnionSize) * 100 : 50;

    const genreUnionSize = new Set([
      ...acceptedGenres,
      ...partnerAcceptedGenres,
    ]).size;
    const sharedGenreCount = [...acceptedGenres].filter((genre) =>
      partnerAcceptedGenres.has(genre),
    ).length;
    const genreOverlapPercent =
      genreUnionSize > 0 ? (sharedGenreCount / genreUnionSize) * 100 : 50;

    const score = clampPercent(
      movieOverlapPercent * 0.65 + genreOverlapPercent * 0.35,
    );

    return {
      score,
      label: getTasteOverlapLabel(score),
      bothLikedCount,
      oneLikeOneNotCount,
      movieOverlapPercent: clampPercent(movieOverlapPercent),
      genreOverlapPercent: clampPercent(genreOverlapPercent),
    };
  }, [
    acceptedGenres,
    acceptedMovieIdSet,
    partnerAcceptedGenres,
    partnerAcceptedMovieIds,
    primaryPartner,
  ]);
  const weeklyTopSharedPicks = useMemo<TopSharedPick[]>(() => {
    if (!primaryPartner) {
      return [];
    }

    const candidates = data.movies
      .filter((movie) => !acceptedMovieIdSet.has(movie.id) || !partnerAcceptedMovieIds.has(movie.id))
      .filter((movie) => !userRejectedMovieIds.has(movie.id))
      .filter((movie) => !partnerRejectedMovieIds.has(movie.id))
      .map((movie) => {
        const userScore = computeMovieMatchPercent(movie, {
          acceptedGenres,
          onboarding: onboardingPreferences,
        });
        const partnerScore = computeMovieMatchPercent(movie, {
          acceptedGenres: partnerAcceptedGenres,
        });
        const avgScore = (userScore + partnerScore) / 2;
        const likedByExactlyOne =
          Number(acceptedMovieIdSet.has(movie.id)) +
            Number(partnerAcceptedMovieIds.has(movie.id)) ===
          1;
        const sharedGenreHits = movie.genre
          .map((entry) => entry.trim().toLowerCase())
          .filter((entry) => acceptedGenres.has(entry) && partnerAcceptedGenres.has(entry)).length;

        const finalScore = clampPercent(
          avgScore +
            sharedGenreHits * 3 +
            (likedByExactlyOne ? 4 : 0),
        );

        const reasons: string[] = [];
        if (sharedGenreHits > 0) {
          reasons.push(`Shared genre signal (${sharedGenreHits})`);
        }
        if (likedByExactlyOne) {
          reasons.push("Liked by one of you already");
        }
        reasons.push(`Predicted fit ${finalScore}%`);

        return {
          movieId: movie.id,
          title: movie.title,
          year: movie.year,
          score: finalScore,
          reasons,
        };
      })
      .sort((left, right) => right.score - left.score);

    return candidates.slice(0, 3);
  }, [
    acceptedGenres,
    acceptedMovieIdSet,
    data.movies,
    onboardingPreferences,
    partnerAcceptedGenres,
    partnerAcceptedMovieIds,
    partnerRejectedMovieIds,
    primaryPartner,
    userRejectedMovieIds,
  ]);
  const isFridayNight = useMemo(() => {
    const now = new Date();
    return now.getDay() === 5 && now.getHours() >= 18;
  }, []);

  useEffect(() => {
    if (!selectedMovie) {
      setIsTrailerVisible(false);
      setTrailerUrl(null);
      setTrailerError(null);
      setIsLoadingTrailer(false);
      return;
    }

    setTrailerUrl(selectedMovie.trailerUrl ?? null);
    setTrailerError(null);
    setIsLoadingTrailer(false);
    setIsTrailerVisible(false);
  }, [selectedMovie]);

  useEffect(() => {
    return () => {
      if (shareToastTimerRef.current) {
        window.clearTimeout(shareToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setIsPremiumInsightsClosed(window.localStorage.getItem(premiumInsightsStorageKey) === "1");
  }, [premiumInsightsStorageKey]);

  useEffect(() => {
    const anyOpen = Boolean(
      selectedMovieId || pendingRemoveMovieId || isTrailerVisible,
    );
    if (!anyOpen) {
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
      if (pendingRemoveMovieId) {
        setPendingRemoveMovieId(null);
        return;
      }
      if (selectedMovieId) {
        setSelectedMovieId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedMovieId, pendingRemoveMovieId, isTrailerVisible]);

  const showShareToast = useCallback((message: string, variant: ShareToast["variant"]) => {
    if (shareToastTimerRef.current) {
      window.clearTimeout(shareToastTimerRef.current);
    }
    setShareToast({ message, variant });
    shareToastTimerRef.current = window.setTimeout(() => {
      setShareToast(null);
    }, 3200);
  }, []);

  const handleShareMovie = useCallback(async (movieId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    const shareUrl = `${window.location.origin}/discover?movieId=${encodeURIComponent(movieId)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "CineMatch movie pick",
          text: "Check this movie in CineMatch",
          url: shareUrl,
        });
        showShareToast("Shared — your pick link is ready to send.", "success");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showShareToast("Link copied — paste it anywhere to share.", "success");
        return;
      }

      window.prompt("Copy this movie link", shareUrl);
      showShareToast("Copy the link from the dialog to share it.", "success");
    } catch {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showShareToast("Link copied — paste it anywhere to share.", "success");
        } catch {
          showShareToast("Couldn’t share or copy the link. Try again.", "error");
        }
        return;
      }

      showShareToast("Couldn’t share or copy the link. Try again.", "error");
    }
  }, [showShareToast]);

  const fetchTrailerForSelected = useCallback(async () => {
    if (!selectedMovie || trailerUrl) {
      return;
    }

    setTrailerError(null);
    setIsLoadingTrailer(true);

    try {
      const response = await fetch(
        `/api/movies/trailer?movieId=${encodeURIComponent(selectedMovie.id)}`,
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
  }, [selectedMovie, trailerUrl]);

  const handleOpenTrailer = useCallback(async () => {
    setIsTrailerVisible(true);
    await fetchTrailerForSelected();
  }, [fetchTrailerForSelected]);

  const openPickDetails = useCallback((movieId: string) => {
    setSelectedMovieId(movieId);
  }, []);

  const requestRemovePick = useCallback((movieId: string) => {
    setPendingRemoveMovieId(movieId);
  }, []);

  const detailsModal =
    selectedMovie && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-slate-950/48 backdrop-blur-[3px]">
            <button
              type="button"
              aria-label="Close movie details"
              className="absolute inset-0 z-0 cursor-default bg-transparent"
              onClick={() => {
                setSelectedMovieId(null);
                setIsTrailerVisible(false);
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="picks-details-title"
              className={`details-modal-shell ui-shell pointer-events-auto absolute inset-x-0 bottom-0 top-0 z-10 mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col shadow-[0_24px_80px_rgba(15,23,42,0.2)] ${
                isDarkMode ? "bg-slate-950 text-white" : "bg-white text-slate-900"
              }`}
            >
              <div
                className={`ui-shell-header !border-b-black/6 !py-3 !pt-[max(1rem,env(safe-area-inset-top,0px))] shrink-0`}
              >
                <p
                  className={`min-w-0 flex-1 truncate text-xs font-medium tracking-[0.01em] ${
                    isDarkMode ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Movie details
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMovieId(null);
                    setIsTrailerVisible(false);
                  }}
                  aria-label="Close movie details"
                  className={`ui-shell-close ${
                    isDarkMode ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="ui-icon-md ui-icon-stroke"
                    aria-hidden="true"
                  >
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
                    Scroll for synopsis and credits-style details.
                  </p>

                  <div
                    className="relative overflow-hidden rounded-[18px] p-4 text-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
                    style={{
                      backgroundImage: selectedMovie.poster.imageUrl
                        ? undefined
                        : `linear-gradient(145deg, ${selectedMovie.poster.accentFrom}, ${selectedMovie.poster.accentTo})`,
                      backgroundSize: selectedMovie.poster.imageUrl ? undefined : "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <PosterBackdrop
                      imageUrl={selectedMovie.poster.imageUrl}
                      profile="hero"
                      objectFit="cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05),transparent_38%,rgba(15,23,42,0.46)_100%)]" />
                    <div className="relative flex min-h-[13rem] flex-col justify-between sm:min-h-[14rem]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full bg-violet-600/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                          {selectedMovie.mediaType === "series" ? "Series" : "Movie"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white/88 backdrop-blur-md">
                            {selectedMovie.year}
                          </span>
                          <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white/88 backdrop-blur-md">
                            {selectedMovie.runtime}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-6">
                        <p className="text-xs font-medium text-white/90">
                          {selectedMovie.genre.slice(0, 3).join(" • ")}
                        </p>
                        <h2
                          id="picks-details-title"
                          className="text-[1.65rem] font-semibold leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)] sm:text-[1.8rem]"
                        >
                          {selectedMovie.title}
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
                          {selectedMovie.rating.toFixed(1)}
                        </p>
                        <p className={`text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                          IMDb rating
                        </p>
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
                          {selectedMovie.runtime}
                        </p>
                        <p className={`text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                          Runtime
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center justify-center gap-2">
                      <span className="text-base leading-none text-emerald-500">☺</span>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          {matchPercentForMovie(selectedMovie, {
                            acceptedGenres,
                            onboarding: onboardingPreferences,
                          })}%
                        </p>
                        <p className={`text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                          Match
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`relative mt-4 rounded-[22px] px-4 py-4 ${
                      isDarkMode ? "bg-white/10" : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
                    }`}
                  >
                    <p className={`text-[11px] leading-5 ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}>
                      {selectedMovie.description}
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
                <button
                  type="button"
                  className="ui-btn ui-btn-primary min-h-12 w-full flex-1 sm:min-w-0"
                  onClick={() => void handleShareMovie(selectedMovie.id)}
                >
                  Share link
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary min-h-12 w-full flex-1 sm:min-w-0"
                  onClick={() => void handleOpenTrailer()}
                >
                  Watch trailer
                </button>
              </div>
            </div>

            {isTrailerVisible ? (
              <PicksTrailerModalLazy
                title={selectedMovie.title}
                isDarkMode={isDarkMode}
                trailerUrl={trailerUrl}
                isLoadingTrailer={isLoadingTrailer}
                trailerError={trailerError}
                onClose={() => setIsTrailerVisible(false)}
                onRetry={() => void fetchTrailerForSelected()}
              />
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="space-y-5">
        <div className="fade-up-enter">
          <PageHeader
            eyebrow="Your picks"
            title="Accepted Movies"
            description="Everything you said yes to, ready for solo nights or shared watch plans."
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <SurfaceCard
            className="picks-stat-enter p-4 sm:p-5"
            style={{ animationDelay: "40ms" }}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                isDarkMode ? "text-violet-300/90" : "text-violet-600/90"
              }`}
            >
              Saved
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                  isDarkMode ? "bg-violet-500/18 text-violet-100" : "bg-violet-100 text-violet-700"
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M7.75 4.75h8.5A2.75 2.75 0 0 1 19 7.5v11.75l-7-3.75-7 3.75V7.5A2.75 2.75 0 0 1 7.75 4.75Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className={`${isDarkMode ? "text-slate-50" : "text-slate-900"} text-3xl font-bold tabular-nums`}>
                {acceptedMovies.length}
              </p>
            </div>
          </SurfaceCard>
          <SurfaceCard
            className="picks-stat-enter p-4 sm:p-5"
            style={{ animationDelay: "120ms" }}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                isDarkMode ? "text-emerald-300/90" : "text-emerald-700/90"
              }`}
            >
              Also shared
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                  isDarkMode ? "bg-emerald-500/16 text-emerald-100" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M12 18.5s-6.25-3.89-6.25-9a3.75 3.75 0 0 1 6.25-2.78A3.75 3.75 0 0 1 18.25 9.5c0 5.11-6.25 9-6.25 9Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className={`${isDarkMode ? "text-slate-50" : "text-slate-900"} text-3xl font-bold tabular-nums`}>
                {mutualPickCount}
              </p>
            </div>
          </SurfaceCard>
        </div>

        <SurfaceCard className="fade-up-enter space-y-3" style={{ animationDelay: "130ms" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-xs font-semibold sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Premium pick insights
            </p>
            <div className="flex items-center gap-2">
              {!hasProAccess ? (
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    isDarkMode
                      ? "bg-violet-500/18 text-violet-100 ring-1 ring-violet-400/28"
                      : "bg-violet-100 text-violet-700 ring-1 ring-violet-200/80"
                  }`}
                >
                  Locked
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setIsPremiumInsightsClosed(true);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem(premiumInsightsStorageKey, "1");
                  }
                }}
                aria-label="Close premium insights"
                className={`flex h-8 w-8 items-center justify-center rounded-[10px] border text-xs font-bold ${
                  isDarkMode
                    ? "border-white/12 bg-white/8 text-slate-300"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                ×
              </button>
            </div>
          </div>
          {isPremiumInsightsClosed ? (
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Premium insights hidden.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsPremiumInsightsClosed(false);
                  if (typeof window !== "undefined") {
                    window.localStorage.removeItem(premiumInsightsStorageKey);
                  }
                }}
                className="ui-btn ui-btn-secondary !min-h-0 !px-3 !py-1.5 !text-xs"
              >
                Show
              </button>
            </div>
          ) : !hasProAccess ? (
            <>
              <p className={`text-xs leading-5 sm:text-sm sm:leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Upgrade to Pro to unlock Tonight&apos;s top 3 for both of you and a live
                taste overlap score with your partner.
              </p>
              <Link href="/settings" className="ui-btn ui-btn-primary w-full sm:w-auto">
                Buy Pro
              </Link>
            </>
          ) : (
            <>
              {!primaryPartner ? (
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  Connect with at least one accepted partner to unlock shared top picks
                  and taste overlap.
                </p>
              ) : (
                <div className="space-y-3">
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${
                      isDarkMode
                        ? "rounded-[14px] bg-white/[0.04] divide-y divide-white/8 sm:divide-y-0 sm:divide-x sm:divide-white/8 lg:divide-x"
                        : "rounded-[14px] bg-slate-50/90 divide-y divide-slate-200/80 sm:divide-y-0 sm:divide-x sm:divide-slate-200/80 lg:divide-x"
                    }`}
                  >
                    <div className="px-3 py-3">
                      <p
                        className={`text-[11px] uppercase tracking-wide ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Taste overlap
                      </p>
                      <p
                        className={`mt-1 text-lg font-semibold sm:text-xl ${
                          isDarkMode ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {tasteOverlap?.score ?? 0}%
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {tasteOverlap?.label ?? "N/A"} with {primaryPartner.name}
                      </p>
                    </div>
                    <div className="px-3 py-3">
                      <p
                        className={`text-[11px] uppercase tracking-wide ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Both liked
                      </p>
                      <p
                        className={`mt-1 text-lg font-semibold sm:text-xl ${
                          isDarkMode ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {tasteOverlap?.bothLikedCount ?? 0}
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        One liked, one not: {tasteOverlap?.oneLikeOneNotCount ?? 0}
                      </p>
                    </div>
                    <div className="px-3 py-3">
                      <p
                        className={`text-[11px] uppercase tracking-wide ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Genre overlap
                      </p>
                      <p
                        className={`mt-1 text-lg font-semibold sm:text-xl ${
                          isDarkMode ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {tasteOverlap?.genreOverlapPercent ?? 0}%
                      </p>
                      <p
                        className={`mt-0.5 text-[11px] ${
                          isDarkMode ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        Movie overlap: {tasteOverlap?.movieOverlapPercent ?? 0}%
                      </p>
                    </div>
                  </div>

                  <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {isFridayNight
                      ? "Tonight’s top 3 for both of you"
                      : "This week’s top 3 for both of you"}
                  </p>
                  <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Ranked for you and {primaryPartner.name} using both accepted titles,
                    genre overlap, and what only one of you has liked.
                  </p>

                  <div className="space-y-0">
                    {weeklyTopSharedPicks.length === 0 ? (
                      <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                        Keep swiping. We need a bit more signal to generate your shared top 3.
                      </p>
                    ) : (
                      weeklyTopSharedPicks.map((pick, index) => (
                        <div
                          key={pick.movieId}
                          className={`flex items-start justify-between gap-3 py-2 ${
                            index > 0
                              ? isDarkMode
                                ? "border-t border-white/10"
                                : "border-t border-slate-200/80"
                              : ""
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                              {index + 1}. {pick.title} ({pick.year})
                            </p>
                            <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                              {pick.reasons.join(" • ")}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                              isDarkMode
                                ? "bg-violet-500/16 text-violet-100"
                                : "bg-violet-100 text-violet-700"
                            }`}
                          >
                            {pick.score}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </SurfaceCard>

        <div className="space-y-3 sm:space-y-3.5">
          {acceptedMovies.map((movie, index) => (
            <PicksMovieRow
              key={movie.id}
              movie={movie}
              listIndex={index}
              matchingPartners={partnerNamesByPickId.get(movie.id) ?? []}
              isDarkMode={isDarkMode}
              onOpenDetails={openPickDetails}
              onShare={handleShareMovie}
              onRequestRemove={requestRemovePick}
            />
          ))}
        </div>

        {acceptedMovies.length === 0 ? (
          <SurfaceCard className="fade-up-enter space-y-3 text-center" style={{ animationDelay: "160ms" }}>
            <p
              className={`text-lg font-semibold ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              No picks yet
            </p>
            <p
              className={`text-sm leading-6 ${
                isDarkMode ? "text-slate-300" : "text-slate-500"
              }`}
            >
              Start in Discover and accept the movies that feel right.
            </p>
            <Link
              href="/discover"
              className="ui-btn ui-btn-primary"
            >
              Go to Discover
            </Link>
          </SurfaceCard>
        ) : null}
      </div>

      {pendingRemoveMovie ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/50 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close remove confirmation"
            onClick={() => setPendingRemoveMovieId(null)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-sm relative z-10 flex max-h-[min(92dvh,26rem)] flex-col overflow-hidden rounded-[28px] border shadow-[0_30px_80px_rgba(15,23,42,0.28)] ${
              isDarkMode
                ? "border-white/10 bg-slate-950 text-white"
                : "border-white/80 bg-white text-slate-900"
            }`}
          >
            <div className="ui-shell-header !border-b-black/6 shrink-0">
              <h3 className="min-w-0 flex-1 text-lg font-semibold">Remove from your picks?</h3>
              <button
                type="button"
                onClick={() => setPendingRemoveMovieId(null)}
                aria-label="Close"
                className={`ui-shell-close ${
                  isDarkMode ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="ui-icon-md ui-icon-stroke"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="ui-shell-body !min-h-0 !flex-1 !overflow-y-auto !pt-4">
              <p
                className={`text-sm leading-6 ${
                  isDarkMode ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Are you sure you want to remove{" "}
                <span className="font-semibold text-inherit">
                  {pendingRemoveMovie.title}
                </span>{" "}
                from your list?
              </p>
            </div>
            <div className={`ui-shell-footer !pt-4 shrink-0 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
              <button
                type="button"
                onClick={() => setPendingRemoveMovieId(null)}
                className="ui-btn ui-btn-secondary min-w-0 flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await removePick(pendingRemoveMovie.id);
                  setPendingRemoveMovieId(null);
                }}
                className="ui-btn ui-btn-danger min-w-0 flex-1"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {detailsModal}
      {shareToast && typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[var(--z-toast-anchor)] flex justify-center px-4">
              <div
                role="status"
                className={`discover-toolbar-enter pointer-events-auto max-w-md rounded-[22px] border px-4 py-3 text-center text-sm font-semibold shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl ${
                  shareToast.variant === "error"
                    ? isDarkMode
                      ? "border-rose-400/25 bg-slate-950/92 text-rose-100"
                      : "border-rose-200/90 bg-white/95 text-rose-800"
                    : isDarkMode
                      ? "border-white/10 bg-slate-950/92 text-white"
                      : "border-white/80 bg-white/95 text-slate-900"
                }`}
              >
                {shareToast.message}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

