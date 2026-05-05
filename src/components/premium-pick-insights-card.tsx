"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  /** Used only for ranking tie-break. */
  popularity: number;
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

function movieGenreList(movie: { genre: string[] }) {
  return movie.genre
    .map((genre) => genre.trim().toLowerCase())
    .filter((genre) => Boolean(genre) && genre !== "movie" && genre !== "series");
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

  const sharedTasteGenres = useMemo(() => {
    const overlap = new Set<string>();
    for (const genre of acceptedGenres) {
      if (partnerAcceptedGenres.has(genre)) {
        overlap.add(genre);
      }
    }
    return overlap;
  }, [acceptedGenres, partnerAcceptedGenres]);

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

    const genreBasis =
      sharedTasteGenres.size > 0
        ? sharedTasteGenres
        : new Set<string>([...acceptedGenres, ...partnerAcceptedGenres]);

    const candidates = data.movies
      .filter((movie) => !acceptedMovieIdSet.has(movie.id) || !partnerAcceptedMovieIds.has(movie.id))
      .filter((movie) => !userRejectedMovieIds.has(movie.id))
      .filter((movie) => !partnerRejectedMovieIds.has(movie.id))
      .filter((movie) => {
        if (genreBasis.size === 0) {
          return true;
        }
        return movieGenreList(movie).some((g) => genreBasis.has(g));
      })
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

        const genres = movieGenreList(movie);
        const overlapGenreLabels: string[] = [];
        for (const g of genres) {
          const inBoth =
            sharedTasteGenres.size > 0 ? sharedTasteGenres.has(g) : genreBasis.has(g);
          if (!inBoth) {
            continue;
          }
          const raw = movie.genre.find((x) => x.trim().toLowerCase() === g);
          if (raw) {
            overlapGenreLabels.push(raw.trim());
          }
        }
        const sharedGenreHits =
          sharedTasteGenres.size > 0
            ? genres.filter((g) => sharedTasteGenres.has(g)).length
            : genres.filter((g) => genreBasis.has(g)).length;

        const pop = movie.popularity ?? 0;
        const popularityBoost = Math.min(22, Math.log1p(Math.max(0, pop)) * 2.4);
        const yearBoost = movie.year >= 2020 ? 10 : movie.year >= 2015 ? 7 : movie.year >= 2010 ? 4 : 0;
        const ratingBoost = Math.min(12, (movie.rating ?? 0) * 0.9);

        const blendScore = clampPercent(
          avgScore + sharedGenreHits * 5.5 + popularityBoost + yearBoost + ratingBoost + (likedByExactlyOne ? 3 : 0),
        );

        const reasons: string[] = [];
        const uniqueLabels = [...new Set(overlapGenreLabels.map((l) => l.replace(/\s+/g, " ").trim()))];
        if (uniqueLabels.length > 0) {
          const labelShort = `${uniqueLabels.slice(0, 2).join(", ")}${uniqueLabels.length > 2 ? "…" : ""}`;
          reasons.push(sharedTasteGenres.size > 0 ? `Shared tastes: ${labelShort}` : `Genres: ${labelShort}`);
        } else if (sharedGenreHits > 0) {
          reasons.push(`${sharedGenreHits} overlapping genre${sharedGenreHits === 1 ? "" : "s"}`);
        }
        if (pop >= 40) {
          reasons.push("Trending");
        }
        if (likedByExactlyOne) {
          reasons.push("One of you already liked it");
        }
        reasons.push(`Fit ${blendScore}%`);

        return {
          movieId: movie.id,
          title: movie.title,
          year: movie.year,
          score: blendScore,
          popularity: pop,
          reasons,
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (right.popularity !== left.popularity) {
          return right.popularity - left.popularity;
        }
        return right.year - left.year;
      });

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
    sharedTasteGenres,
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
  const showExpandedChrome = isExpanded && !isClosing;
  const showCollapsedSubtitle = !isExpanded && !isClosing;

  const collapsedTileSubtitle = useMemo(() => {
    if (!hasProAccess) {
      return "Taste overlap & genre picks — Pro";
    }
    if (!insightsPartner) {
      return "Who you match with — add a link";
    }
    return "Shared taste & suggestions for two";
  }, [hasProAccess, insightsPartner]);

  const tileSurface = isDarkMode
    ? "border-white/14 bg-gradient-to-br from-violet-950/55 to-slate-950/80 ring-1 ring-white/10"
    : "border-violet-200/90 bg-gradient-to-br from-white via-violet-50/80 to-fuchsia-50/50 ring-1 ring-violet-100/90 shadow-[0_12px_32px_rgba(109,40,217,0.12)]";
  const iconTileWrap = isDarkMode
    ? "bg-violet-500/25 text-violet-100 ring-2 ring-violet-400/35"
    : "bg-violet-600 text-white ring-2 ring-violet-300/60 shadow-sm";

  const toggleExpanded = useCallback(() => {
    if (isClosing) {
      return;
    }
    if (isExpanded) {
      handleClose();
    } else {
      handleShow();
    }
  }, [handleClose, handleShow, isClosing, isExpanded]);

  return (
    <section
      className={`discover-toolbar-enter relative overflow-hidden rounded-[22px] sm:rounded-[24px] ${tileSurface}`}
      style={{ animationDelay: `${animationDelayMs}ms` }}
      aria-label="Premium insight"
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500"
        aria-hidden
      />
      <div className="relative p-4 sm:p-5">
        <div className="flex gap-3 sm:gap-3.5">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${iconTileWrap}`}
            aria-hidden
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 18V6" strokeLinecap="round" />
              <path d="M10 18v-5" strokeLinecap="round" />
              <path d="M16 18V9" strokeLinecap="round" />
              <path d="M22 18V4" strokeLinecap="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={`text-[15px] font-bold leading-tight tracking-tight sm:text-base ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  Premium insight
                </p>
                {showExpandedChrome ? (
                  <>
                    {hasProAccess && insightsPartner && tasteOverlap ? (
                      <p
                        className={`mt-0.5 text-[11px] font-semibold leading-snug sm:text-xs ${isDarkMode ? "text-violet-200/85" : "text-violet-700/85"}`}
                      >
                        Overlap vs {insightsPartner.name}
                        {acceptedConnectedPartners.length > 1 ? " · switch below" : ""}.
                      </p>
                    ) : hasProAccess && !insightsPartner ? (
                      <p
                        className={`mt-0.5 text-[11px] font-semibold leading-snug sm:text-xs ${isDarkMode ? "text-violet-200/85" : "text-violet-700/85"}`}
                      >
                        Link a friend to see overlap.
                      </p>
                    ) : (
                      <p
                        className={`mt-0.5 text-[11px] font-semibold leading-snug sm:text-xs ${isDarkMode ? "text-violet-200/85" : "text-violet-700/85"}`}
                      >
                        Pro: overlap + 3 genre-based picks.
                      </p>
                    )}
                  </>
                ) : showCollapsedSubtitle ? (
                  <p
                    className={`mt-0.5 text-[11px] font-semibold leading-snug sm:text-xs ${isDarkMode ? "text-violet-200/85" : "text-violet-700/85"}`}
                  >
                    {collapsedTileSubtitle}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
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
                <button
                  type="button"
                  onClick={toggleExpanded}
                  disabled={isClosing}
                  aria-expanded={Boolean(isExpanded && !isClosing)}
                  aria-label={isExpanded ? "Collapse Premium insight" : "Expand Premium insight"}
                  className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg text-base font-light transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 motion-reduce:active:scale-100"
                >
                  <span className={`text-base ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} aria-hidden>
                    {isExpanded ? "−" : "+"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="grid transition-[grid-template-rows] duration-[420ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-[grid-template-rows] motion-reduce:transition-none motion-reduce:duration-150"
          style={{ gridTemplateRows: gridRowsFr }}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={`pt-3 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none motion-reduce:duration-150 sm:pt-3.5 ${
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
                        Shared-genre picks + taste overlap with a partner.
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
                          Open{" "}
                          <Link href="/friends" className="font-semibold underline underline-offset-2">
                            Friends
                          </Link>{" "}
                          and connect to unlock picks.
                        </p>
                      ) : (
                        <div className="space-y-2 sm:space-y-3">
                          {acceptedConnectedPartners.length > 1 ? (
                            <label className="block space-y-1.5">
                              <span
                                className={`block text-[10px] font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                              >
                                Compare with
                              </span>
                              <div className="relative isolate">
                                <select
                                  value={insightsPartner.id}
                                  onChange={(e) => setInsightsPartnerId(e.target.value)}
                                  aria-label="Choose friend for Premium insight"
                                  className={`w-full min-h-[2.75rem] cursor-pointer appearance-none rounded-xl border py-2.5 pl-3 pr-10 text-left text-sm font-medium shadow-none transition outline-none focus-visible:border-violet-400/90 focus-visible:outline-none motion-reduce:transition-none ${
                                    isDarkMode
                                      ? "border-white/20 bg-white/[0.08] text-white focus-visible:shadow-[inset_0_0_0_2px_rgba(167,139,250,0.45)] [&:focus-visible]:bg-white/[0.1]"
                                      : "border-slate-200/95 bg-white text-slate-900 focus-visible:shadow-[inset_0_0_0_2px_rgba(139,92,246,0.35)]"
                                  }`}
                                >
                                  {acceptedConnectedPartners.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                                <span
                                  className={`pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                                  aria-hidden
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-4 w-4 shrink-0"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="m6 9 6 6 6-6" />
                                  </svg>
                                </span>
                              </div>
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
                              {isFridayNight ? "Tonight’s picks" : "Genre picks"}
                            </p>
                            <p className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                              You &amp; {insightsPartner.name}
                            </p>
                          </div>

                          <div>
                            {weeklyTopSharedPicks.length === 0 ? (
                              <p className={`text-[11px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                                Nothing matches your shared genres yet — keep swiping together.
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
      </div>
    </section>
  );
}
