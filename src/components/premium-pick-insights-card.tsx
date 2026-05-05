"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import { computeMovieMatchPercent } from "@/lib/match-score";

const PREMIUM_INSIGHTS_CLOSE_MS = 420;

const premiumInsightsDismissSessionKey = (userId: string | null) =>
  `cinematch-profile-premium-insights-dismiss-v1-${userId ?? "guest"}`;
const premiumInsightsExpandedSessionKey = (userId: string | null) =>
  `cinematch-profile-premium-insights-expanded-v1-${userId ?? "guest"}`;

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

/** Pro: taste overlap + suggested top 3 with one linked friend (lives on Profile, not Picks). */
export function PremiumPickInsightsCard({ animationDelayMs = 108 }: { animationDelayMs?: number }) {
  const {
    currentUserId,
    data,
    acceptedMovies,
    linkedUsers,
    onboardingPreferences,
    isDarkMode,
    hasProAccess,
  } = useAppState();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [panelReveal, setPanelReveal] = useState(true);
  const closeTimerRef = useRef<number | null>(null);

  const dismissKey = useMemo(() => premiumInsightsDismissSessionKey(currentUserId), [currentUserId]);
  const expandedKey = useMemo(() => premiumInsightsExpandedSessionKey(currentUserId), [currentUserId]);
  const expandedKeyRef = useRef(expandedKey);
  expandedKeyRef.current = expandedKey;

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let expanded = window.sessionStorage.getItem(expandedKey) !== "0";
    if (window.sessionStorage.getItem(dismissKey) === "1") {
      expanded = false;
      window.sessionStorage.removeItem(dismissKey);
    }
    setIsExpanded(expanded);
    setIsClosing(false);
    setPanelReveal(true);
  }, [dismissKey, expandedKey]);

  const acceptedConnectedPartners = useMemo(
    () =>
      linkedUsers
        .filter((entry) => entry.status === "accepted")
        .map((entry) => entry.user)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [linkedUsers],
  );

  const [insightsPartnerId, setInsightsPartnerId] = useState<string | null>(null);
  useEffect(() => {
    if (!insightsPartnerId) {
      return;
    }
    if (!acceptedConnectedPartners.some((p) => p.id === insightsPartnerId)) {
      setInsightsPartnerId(null);
    }
  }, [acceptedConnectedPartners, insightsPartnerId]);

  const insightsPartner = useMemo(() => {
    if (acceptedConnectedPartners.length === 0) {
      return null;
    }
    if (insightsPartnerId) {
      return acceptedConnectedPartners.find((p) => p.id === insightsPartnerId) ?? acceptedConnectedPartners[0]!;
    }
    return acceptedConnectedPartners[0]!;
  }, [acceptedConnectedPartners, insightsPartnerId]);

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

  const partnerAcceptedMovieIds = useMemo(() => {
    if (!insightsPartner) {
      return new Set<string>();
    }
    return new Set(
      data.swipes
        .filter(
          (swipe) => swipe.userId === insightsPartner.id && swipe.decision === "accepted",
        )
        .map((swipe) => swipe.movieId),
    );
  }, [data.swipes, insightsPartner]);

  const partnerRejectedMovieIds = useMemo(() => {
    if (!insightsPartner) {
      return new Set<string>();
    }
    return new Set(
      data.swipes
        .filter(
          (swipe) => swipe.userId === insightsPartner.id && swipe.decision === "rejected",
        )
        .map((swipe) => swipe.movieId),
    );
  }, [data.swipes, insightsPartner]);

  const userRejectedMovieIds = useMemo(() => {
    if (!currentUserId) {
      return new Set<string>();
    }
    return new Set(
      data.swipes
        .filter(
          (swipe) => swipe.userId === currentUserId && swipe.decision === "rejected",
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
            .filter((genre) => Boolean(genre) && genre !== "movie" && genre !== "series"),
        ),
    );
  }, [data.movies, partnerAcceptedMovieIds]);

  const tasteOverlap = useMemo(() => {
    if (!insightsPartner) {
      return null;
    }

    const likedUnionSize = new Set([...acceptedMovieIdSet, ...partnerAcceptedMovieIds]).size;
    const bothLikedCount = [...acceptedMovieIdSet].filter((movieId) =>
      partnerAcceptedMovieIds.has(movieId),
    ).length;
    const movieOverlapPercent =
      likedUnionSize > 0 ? (bothLikedCount / likedUnionSize) * 100 : 50;

    const genreUnionSize = new Set([...acceptedGenres, ...partnerAcceptedGenres]).size;
    const sharedGenreCount = [...acceptedGenres].filter((genre) =>
      partnerAcceptedGenres.has(genre),
    ).length;
    const genreOverlapPercent =
      genreUnionSize > 0 ? (sharedGenreCount / genreUnionSize) * 100 : 50;

    const score = clampPercent(movieOverlapPercent * 0.65 + genreOverlapPercent * 0.35);

    return {
      score,
      label: getTasteOverlapLabel(score),
      bothLikedCount,
      oneLikeOneNotCount: likedUnionSize - bothLikedCount,
      movieOverlapPercent: clampPercent(movieOverlapPercent),
      genreOverlapPercent: clampPercent(genreOverlapPercent),
    };
  }, [
    acceptedGenres,
    acceptedMovieIdSet,
    partnerAcceptedGenres,
    partnerAcceptedMovieIds,
    insightsPartner,
  ]);

  const weeklyTopSharedPicks = useMemo<TopSharedPick[]>(() => {
    if (!insightsPartner) {
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
          Number(acceptedMovieIdSet.has(movie.id)) + Number(partnerAcceptedMovieIds.has(movie.id)) === 1;
        const sharedGenreHits = movie.genre
          .map((entry) => entry.trim().toLowerCase())
          .filter((entry) => acceptedGenres.has(entry) && partnerAcceptedGenres.has(entry)).length;

        const finalScore = clampPercent(avgScore + sharedGenreHits * 3 + (likedByExactlyOne ? 4 : 0));

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
    insightsPartner,
    userRejectedMovieIds,
  ]);

  const isFridayNight = useMemo(() => {
    const now = new Date();
    return now.getDay() === 5 && now.getHours() >= 18;
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (!isExpanded || isClosing) {
      return;
    }
    setIsClosing(true);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(expandedKeyRef.current, "0");
      }
      setIsExpanded(false);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, PREMIUM_INSIGHTS_CLOSE_MS);
  }, [isExpanded, isClosing]);

  const handleShow = useCallback(() => {
    setIsExpanded(true);
    setPanelReveal(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(expandedKeyRef.current, "1");
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPanelReveal(true);
      });
    });
  }, []);

  const bodyOpen = isExpanded && !isClosing && panelReveal;
  const gridRowsFr: "0fr" | "1fr" = bodyOpen ? "1fr" : "0fr";

  return (
    <SurfaceCard
      className="discover-toolbar-enter space-y-2.5 p-3.5 sm:p-4"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`text-xs font-semibold leading-tight sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}
          >
            Premium pick insights
          </p>
          {isExpanded || isClosing ? (
            <>
              {hasProAccess && insightsPartner && tasteOverlap ? (
                <p
                  className={`mt-1 text-[10px] leading-snug sm:text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                >
                  Compare your accepts with one linked friend: overlap score and suggested titles to watch together.
                  Stats use {insightsPartner.name}
                  {acceptedConnectedPartners.length > 1 ? " (pick below if you have several links)." : "."}
                </p>
              ) : hasProAccess && !insightsPartner ? (
                <p className={`mt-1 text-[10px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Link a friend to see shared rankings and overlap.
                </p>
              ) : (
                <p className={`mt-1 text-[10px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Pro: shared top 3 suggestions + taste overlap with one linked partner at a time.
                </p>
              )}
            </>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!hasProAccess ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
                isDarkMode
                  ? "bg-violet-500/18 text-violet-100 ring-1 ring-violet-400/28"
                  : "bg-violet-100 text-violet-700 ring-1 ring-violet-200/80"
              }`}
            >
              Pro
            </span>
          ) : null}
          {isExpanded || isClosing ? (
            <button
              type="button"
              onClick={handleClose}
              disabled={isClosing}
              aria-label="Close premium pick insights"
              className={`premium-insights-chrome-btn shrink-0 rounded-md border px-1.5 py-0.5 transition-colors disabled:pointer-events-none disabled:opacity-40 ${
                isDarkMode
                  ? "border-white/10 bg-white/[0.06] text-slate-400 hover:bg-white/10 hover:text-slate-200"
                  : "border-slate-200/90 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              onClick={handleShow}
              aria-label="Show premium pick insights"
              className={`premium-insights-chrome-btn shrink-0 rounded-md px-1.5 py-0.5 transition active:scale-[0.98] motion-reduce:active:scale-100 ${
                isDarkMode
                  ? "bg-violet-500/22 text-violet-100 ring-1 ring-violet-400/30 hover:bg-violet-500/32"
                  : "bg-violet-600 text-white shadow-sm ring-1 ring-violet-500/30 hover:bg-violet-500"
              }`}
            >
              Show
            </button>
          )}
        </div>
      </div>

      <div
        className="grid overflow-hidden transition-[grid-template-rows] duration-[420ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-[grid-template-rows] motion-reduce:transition-none motion-reduce:duration-150"
        style={{ gridTemplateRows: gridRowsFr }}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none motion-reduce:duration-150 ${
              isClosing
                ? "opacity-0 [transform:translate3d(0,-6px,0)]"
                : isExpanded && !panelReveal
                  ? "opacity-0 [transform:translate3d(0,6px,0)]"
                  : "opacity-100 [transform:translate3d(0,0,0)]"
            }`}
          >
            {!hasProAccess ? (
              <>
                <p
                  className={`text-[11px] leading-snug sm:text-xs sm:leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                >
                  Unlock shared top 3 suggestions and taste overlap with a linked partner.
                </p>
                <Link
                  href="/settings"
                  className="ui-btn ui-btn-primary mt-1 inline-flex min-h-10 w-full items-center justify-center text-sm sm:w-auto"
                >
                  View plans in Settings
                </Link>
              </>
            ) : (
              <>
                {!insightsPartner ? (
                  <p className={`text-[11px] leading-snug sm:text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    Connect with a partner from{" "}
                    <Link href="/friends" className="font-semibold underline underline-offset-2">
                      Friends
                    </Link>{" "}
                    to unlock shared top picks here.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2 sm:mt-4">
                    {acceptedConnectedPartners.length > 1 ? (
                      <label className="block space-y-1">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}
                        >
                          Compare with
                        </span>
                        <select
                          value={insightsPartner.id}
                          onChange={(e) => setInsightsPartnerId(e.target.value)}
                          aria-label="Choose friend for premium pick insights"
                          className={`w-full rounded-xl border px-3 py-2 text-sm font-medium outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/25 ${
                            isDarkMode
                              ? "border-white/14 bg-white/[0.06] text-white"
                              : "border-slate-200 bg-white text-slate-900"
                          }`}
                        >
                          {acceptedConnectedPartners.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    {tasteOverlap ? (
                      <div
                        className={`grid grid-cols-3 gap-1.5 rounded-xl px-2 py-2 ${
                          isDarkMode ? "bg-white/[0.05]" : "bg-slate-50/95"
                        }`}
                      >
                        <div className="text-center">
                          <p
                            className={`text-[9px] font-medium uppercase tracking-wide ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}
                          >
                            Overlap
                          </p>
                          <p
                            className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? "text-white" : "text-slate-900"}`}
                          >
                            {tasteOverlap.score}%
                          </p>
                        </div>
                        <div className="text-center">
                          <p
                            className={`text-[9px] font-medium uppercase tracking-wide ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}
                          >
                            Both liked
                          </p>
                          <p
                            className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? "text-white" : "text-slate-900"}`}
                          >
                            {tasteOverlap.bothLikedCount}
                          </p>
                        </div>
                        <div className="text-center">
                          <p
                            className={`text-[9px] font-medium uppercase tracking-wide ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}
                          >
                            Genres
                          </p>
                          <p
                            className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? "text-white" : "text-slate-900"}`}
                          >
                            {tasteOverlap.genreOverlapPercent}%
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap items-end justify-between gap-1">
                      <p className={`text-xs font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {isFridayNight ? "Tonight’s top 3" : "This week’s top 3"}
                      </p>
                      <p className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                        You &amp; {insightsPartner.name}
                      </p>
                    </div>

                    <div>
                      {weeklyTopSharedPicks.length === 0 ? (
                        <p className={`text-[11px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          Swipe more — we need a bit more signal for a shared top 3.
                        </p>
                      ) : (
                        weeklyTopSharedPicks.map((pick, index) => (
                          <div
                            key={pick.movieId}
                            className={`flex items-center justify-between gap-2 py-1.5 ${
                              index > 0
                                ? isDarkMode
                                  ? "border-t border-white/10"
                                  : "border-t border-slate-200/80"
                                : ""
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-xs font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                                <span className="tabular-nums text-slate-500">{index + 1}.</span> {pick.title}{" "}
                                <span className="font-normal text-slate-500">({pick.year})</span>
                              </p>
                              <p
                                className={`mt-0.5 line-clamp-1 text-[10px] leading-tight ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}
                                title={pick.reasons.join(" · ")}
                              >
                                {pick.reasons.join(" · ")}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                                isDarkMode ? "bg-violet-500/16 text-violet-100" : "bg-violet-100 text-violet-700"
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
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}
