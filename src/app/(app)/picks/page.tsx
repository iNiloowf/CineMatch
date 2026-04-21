"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AvatarBadge } from "@/components/avatar-badge";
import { matchPercentForMovie } from "@/components/movie-details-modal";
import { PageHeader } from "@/components/page-header";
import { PicksMovieRow } from "@/components/picks-movie-row";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { AppRouteEmptyCard } from "@/components/app-route-status";
import { SurfaceCard } from "@/components/surface-card";
import {
  shouldVirtualizeList,
  VirtualScrollList,
} from "@/components/virtual-scroll-list";
import { useAppState } from "@/lib/app-state";
import { formatRuntimeForDisplay } from "@/lib/format-runtime-display";
import { computeMovieMatchPercent } from "@/lib/match-score";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
type SubscriptionPlanType = "pro_monthly" | "pro_yearly" | "pro_partner_gift";
const PREMIUM_INSIGHTS_CLOSE_MS = 420;
/** Legacy: full hide for session — migrated to collapsed bar + Show. */
const premiumInsightsDismissSessionKey = (userId: string | null) =>
  `cinematch-picks-premium-insights-dismiss-v1-${userId ?? "guest"}`;
const premiumInsightsExpandedSessionKey = (userId: string | null) =>
  `cinematch-picks-premium-insights-expanded-v1-${userId ?? "guest"}`;

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
    markPickWatched,
    unmarkPickWatched,
    watchedPickReviews,
    onboardingPreferences,
    isDarkMode,
    hasProAccess,
  } = useAppState();
  const [pendingRemoveMovieId, setPendingRemoveMovieId] = useState<string | null>(null);
  const [pendingWatchedMovieId, setPendingWatchedMovieId] = useState<string | null>(null);
  const [picksListTab, setPicksListTab] = useState<"queue" | "watched">("queue");
  const [shareToast, setShareToast] = useState<ShareToast | null>(null);
  const shareToastTimerRef = useRef<number | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerError, setTrailerError] = useState<string | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [isPremiumInsightsExpanded, setIsPremiumInsightsExpanded] = useState(true);
  const [isPremiumInsightsClosing, setIsPremiumInsightsClosing] = useState(false);
  /** Drives grid 0fr→1fr when opening from collapsed (smooth expand). */
  const [insightsPanelReveal, setInsightsPanelReveal] = useState(true);
  const [isBuyProModalOpen, setIsBuyProModalOpen] = useState(false);
  const [selectedPlanType, setSelectedPlanType] = useState<SubscriptionPlanType>("pro_monthly");
  const [selectedGiftPartnerId, setSelectedGiftPartnerId] = useState("none");
  const [isGiftPartnerPickerOpen, setIsGiftPartnerPickerOpen] = useState(false);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const [billingFeedback, setBillingFeedback] = useState("");
  const premiumInsightsCloseTimerRef = useRef<number | null>(null);
  const premiumInsightsDismissKey = useMemo(
    () => premiumInsightsDismissSessionKey(currentUserId),
    [currentUserId],
  );
  const premiumInsightsExpandedKey = useMemo(
    () => premiumInsightsExpandedSessionKey(currentUserId),
    [currentUserId],
  );
  const premiumInsightsExpandedKeyRef = useRef(premiumInsightsExpandedKey);
  premiumInsightsExpandedKeyRef.current = premiumInsightsExpandedKey;

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    let expanded = window.sessionStorage.getItem(premiumInsightsExpandedKey) !== "0";
    if (window.sessionStorage.getItem(premiumInsightsDismissKey) === "1") {
      expanded = false;
      window.sessionStorage.removeItem(premiumInsightsDismissKey);
    }
    setIsPremiumInsightsExpanded(expanded);
    setIsPremiumInsightsClosing(false);
    setInsightsPanelReveal(true);
  }, [premiumInsightsDismissKey, premiumInsightsExpandedKey]);

  const pendingRemoveMovie = useMemo(
    () =>
      pendingRemoveMovieId
        ? acceptedMovies.find((movie) => movie.id === pendingRemoveMovieId) ?? null
        : null,
    [acceptedMovies, pendingRemoveMovieId],
  );
  const pendingWatchedMovie = useMemo(
    () =>
      pendingWatchedMovieId
        ? acceptedMovies.find((movie) => movie.id === pendingWatchedMovieId) ?? null
        : null,
    [acceptedMovies, pendingWatchedMovieId],
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

  const watchedMovieIdSet = useMemo(
    () => new Set(watchedPickReviews.map((entry) => entry.movie.id)),
    [watchedPickReviews],
  );

  const queueMovies = useMemo(
    () => acceptedMovies.filter((movie) => !watchedMovieIdSet.has(movie.id)),
    [acceptedMovies, watchedMovieIdSet],
  );

  const queueCount = queueMovies.length;
  const watchedCount = watchedPickReviews.length;

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
  const acceptedConnectedPartners = useMemo(
    () =>
      linkedUsers
        .filter((entry) => entry.status === "accepted")
        .map((entry) => entry.user)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [linkedUsers],
  );
  const selectedGiftPartner = useMemo(
    () =>
      selectedGiftPartnerId === "none"
        ? null
        : acceptedConnectedPartners.find((partner) => partner.id === selectedGiftPartnerId) ?? null,
    [acceptedConnectedPartners, selectedGiftPartnerId],
  );
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
      if (premiumInsightsCloseTimerRef.current) {
        window.clearTimeout(premiumInsightsCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isBuyProModalOpen && !isGiftPartnerPickerOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      if (isGiftPartnerPickerOpen) {
        setIsGiftPartnerPickerOpen(false);
        return;
      }
      setIsBuyProModalOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isBuyProModalOpen, isGiftPartnerPickerOpen]);
  useEffect(() => {
    if (!isBuyProModalOpen) {
      setIsGiftPartnerPickerOpen(false);
    }
  }, [isBuyProModalOpen]);
  useEffect(() => {
    if (selectedPlanType !== "pro_partner_gift") {
      setSelectedGiftPartnerId("none");
      setIsGiftPartnerPickerOpen(false);
    }
  }, [selectedPlanType]);
  useEffect(() => {
    if (selectedGiftPartnerId === "none") {
      return;
    }
    const stillLinked = acceptedConnectedPartners.some((partner) => partner.id === selectedGiftPartnerId);
    if (!stillLinked) {
      setSelectedGiftPartnerId("none");
    }
  }, [acceptedConnectedPartners, selectedGiftPartnerId]);

  useEffect(() => {
    const anyOpen = Boolean(
      selectedMovieId || pendingRemoveMovieId || pendingWatchedMovieId || isTrailerVisible,
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
      if (pendingWatchedMovieId) {
        setPendingWatchedMovieId(null);
        return;
      }
      if (selectedMovieId) {
        setSelectedMovieId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedMovieId, pendingRemoveMovieId, pendingWatchedMovieId, isTrailerVisible]);

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
    const title =
      acceptedMovies.find((m) => m.id === movieId)?.title ??
      data.movies.find((m) => m.id === movieId)?.title ??
      "this title";

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${title} · CineMatch`,
          text: `Open in CineMatch to swipe on “${title}”.`,
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
  }, [acceptedMovies, data.movies, showShareToast]);

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
  const requestMarkWatched = useCallback((movieId: string) => {
    setPendingWatchedMovieId(movieId);
  }, []);

  const handleUnwatch = useCallback(
    (movieId: string) => {
      void unmarkPickWatched(movieId);
    },
    [unmarkPickWatched],
  );

  const resolveAccessToken = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const sessionResult = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    return sessionResult.data.session?.access_token ?? null;
  }, []);

  const handleOpenCheckout = useCallback(async () => {
    if (
      selectedPlanType === "pro_partner_gift" &&
      (!selectedGiftPartner || selectedGiftPartnerId === "none")
    ) {
      setBillingFeedback("Pick one connected partner for the Partner Gift plan.");
      return;
    }

    const accessToken = await resolveAccessToken();
    if (!accessToken) {
      setBillingFeedback("Please sign in again, then try Pro checkout.");
      return;
    }

    setIsOpeningCheckout(true);
    setBillingFeedback("");
    try {
      const response = await fetch("/api/subscription/create-intent", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planType: selectedPlanType,
          partnerUserId:
            selectedPlanType === "pro_partner_gift"
              ? selectedGiftPartner?.id
              : undefined,
        }),
      });
      const payload = (await response.json()) as { error?: string; checkoutUrl?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not open checkout right now.");
      }
      if (!payload.checkoutUrl) {
        throw new Error("Checkout URL is missing.");
      }
      window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
      setBillingFeedback("Checkout opened in a new tab.");
    } catch (error) {
      setBillingFeedback(
        error instanceof Error ? error.message : "Could not open checkout right now.",
      );
    } finally {
      setIsOpeningCheckout(false);
    }
  }, [resolveAccessToken, selectedGiftPartner, selectedGiftPartnerId, selectedPlanType]);
  const handleClosePremiumInsights = useCallback(() => {
    if (!isPremiumInsightsExpanded || isPremiumInsightsClosing) {
      return;
    }
    setIsPremiumInsightsClosing(true);
    if (premiumInsightsCloseTimerRef.current) {
      window.clearTimeout(premiumInsightsCloseTimerRef.current);
    }
    premiumInsightsCloseTimerRef.current = window.setTimeout(() => {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(premiumInsightsExpandedKeyRef.current, "0");
      }
      setIsPremiumInsightsExpanded(false);
      setIsPremiumInsightsClosing(false);
      premiumInsightsCloseTimerRef.current = null;
    }, PREMIUM_INSIGHTS_CLOSE_MS);
  }, [isPremiumInsightsExpanded, isPremiumInsightsClosing]);

  const handleShowPremiumInsights = useCallback(() => {
    setIsPremiumInsightsExpanded(true);
    setInsightsPanelReveal(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(premiumInsightsExpandedKeyRef.current, "1");
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setInsightsPanelReveal(true);
      });
    });
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
              <span className="ui-modal-accent-bar" aria-hidden />
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
                            {formatRuntimeForDisplay(selectedMovie.runtime)}
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
                          {formatRuntimeForDisplay(selectedMovie.runtime)}
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

  const premiumInsightsBodyOpen =
    isPremiumInsightsExpanded &&
    !isPremiumInsightsClosing &&
    insightsPanelReveal;
  const premiumInsightsGridRowsFr: "0fr" | "1fr" = premiumInsightsBodyOpen ? "1fr" : "0fr";

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

        {acceptedMovies.length > 0 ? (
          <div
            className={`fade-up-enter flex rounded-[14px] p-1 ${
              isDarkMode
                ? "bg-white/[0.06] ring-1 ring-white/10"
                : "bg-slate-100 ring-1 ring-slate-200/90"
            }`}
            role="tablist"
            aria-label="Picks lists"
            style={{ animationDelay: "24ms" }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={picksListTab === "queue"}
              onClick={() => setPicksListTab("queue")}
              className={`picks-tab-label min-h-10 flex-1 rounded-[11px] px-2 transition ${
                picksListTab === "queue"
                  ? isDarkMode
                    ? "bg-violet-600/45 text-white shadow-sm ring-1 ring-violet-400/45"
                    : "bg-violet-100 text-violet-900 shadow-sm ring-1 ring-violet-200/90"
                  : isDarkMode
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-800"
              }`}
            >
              To watch
              <span className="ml-1 tabular-nums font-semibold opacity-80">({queueCount})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={picksListTab === "watched"}
              onClick={() => setPicksListTab("watched")}
              className={`picks-tab-label min-h-10 flex-1 rounded-[11px] px-2 transition ${
                picksListTab === "watched"
                  ? isDarkMode
                    ? "bg-violet-600/45 text-white shadow-sm ring-1 ring-violet-400/45"
                    : "bg-violet-100 text-violet-900 shadow-sm ring-1 ring-violet-200/90"
                  : isDarkMode
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Watched
              <span className="ml-1 tabular-nums font-semibold opacity-80">({watchedCount})</span>
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <SurfaceCard
            className="picks-stat-enter p-4 sm:p-5"
            style={{ animationDelay: "52ms" }}
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
            style={{ animationDelay: "68ms" }}
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

        <SurfaceCard className="space-y-2.5 p-3.5 sm:p-4" style={{ animationDelay: "84ms" }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={`text-xs font-semibold leading-tight sm:text-sm ${isDarkMode ? "text-white" : "text-slate-900"}`}
              >
                Premium pick insights
              </p>
              {isPremiumInsightsExpanded || isPremiumInsightsClosing ? (
                <>
                  {hasProAccess && primaryPartner && tasteOverlap ? (
                    <p
                      className={`mt-1 text-[10px] leading-snug sm:text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    >
                      Shared top picks &amp; taste stats with {primaryPartner.name}.
                    </p>
                  ) : hasProAccess && !primaryPartner ? (
                    <p
                      className={`mt-1 text-[10px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    >
                      Link a friend to see shared rankings and overlap.
                    </p>
                  ) : (
                    <p
                      className={`mt-1 text-[10px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                    >
                      Shared top 3 + taste overlap with a linked partner.
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
              {isPremiumInsightsExpanded || isPremiumInsightsClosing ? (
                <button
                  type="button"
                  onClick={handleClosePremiumInsights}
                  disabled={isPremiumInsightsClosing}
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
                  onClick={handleShowPremiumInsights}
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
            style={{ gridTemplateRows: premiumInsightsGridRowsFr }}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={`transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none motion-reduce:duration-150 ${
                  isPremiumInsightsClosing
                    ? "opacity-0 [transform:translate3d(0,-6px,0)]"
                    : isPremiumInsightsExpanded && !insightsPanelReveal
                      ? "opacity-0 [transform:translate3d(0,6px,0)]"
                      : "opacity-100 [transform:translate3d(0,0,0)]"
                }`}
              >
              {!hasProAccess ? (
                <>
                  <p
                    className={`text-[11px] leading-snug sm:text-xs sm:leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                  >
                    Unlock tonight&apos;s shared top 3 and live taste overlap on Picks.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingFeedback("");
                      setIsBuyProModalOpen(true);
                    }}
                    className="ui-btn ui-btn-primary mt-1 min-h-10 w-full text-sm sm:w-auto"
                  >
                    Buy Pro
                  </button>
                </>
              ) : (
                <>
                  {!primaryPartner ? (
                    <p className={`text-[11px] leading-snug sm:text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                      Connect with a partner (Connect tab) to unlock shared top picks here.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2 sm:mt-4">
                      {tasteOverlap ? (
                        <div
                          className={`grid grid-cols-3 gap-1.5 rounded-xl px-2 py-2 ${
                            isDarkMode ? "bg-white/[0.05]" : "bg-slate-50/95"
                          }`}
                        >
                          <div className="text-center">
                            <p className={`text-[9px] font-medium uppercase tracking-wide ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                              Overlap
                            </p>
                            <p className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                              {tasteOverlap.score}%
                            </p>
                          </div>
                          <div className="text-center">
                            <p className={`text-[9px] font-medium uppercase tracking-wide ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                              Both liked
                            </p>
                            <p className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                              {tasteOverlap.bothLikedCount}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className={`text-[9px] font-medium uppercase tracking-wide ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                              Genres
                            </p>
                            <p className={`mt-0.5 text-base font-bold tabular-nums ${isDarkMode ? "text-white" : "text-slate-900"}`}>
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
                          You &amp; {primaryPartner.name}
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

        {acceptedMovies.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-3 sm:space-y-3.5">
              {picksListTab === "queue" ? (
                queueMovies.length > 0 ? (
                  shouldVirtualizeList(queueMovies.length) ? (
                    <VirtualScrollList count={queueMovies.length} estimateItemSize={118}>
                      {(index) => {
                        const movie = queueMovies[index]!;
                        return (
                          <PicksMovieRow
                            key={movie.id}
                            movie={movie}
                            listIndex={index}
                            matchingPartners={partnerNamesByPickId.get(movie.id) ?? []}
                            isDarkMode={isDarkMode}
                            onOpenDetails={openPickDetails}
                            onShare={handleShareMovie}
                            onMarkWatched={requestMarkWatched}
                            onRequestRemove={requestRemovePick}
                          />
                        );
                      }}
                    </VirtualScrollList>
                  ) : (
                    queueMovies.map((movie, index) => (
                      <PicksMovieRow
                        key={movie.id}
                        movie={movie}
                        listIndex={index}
                        matchingPartners={partnerNamesByPickId.get(movie.id) ?? []}
                        isDarkMode={isDarkMode}
                        onOpenDetails={openPickDetails}
                        onShare={handleShareMovie}
                        onMarkWatched={requestMarkWatched}
                        onRequestRemove={requestRemovePick}
                      />
                    ))
                  )
                ) : (
                  <SurfaceCard className="space-y-2 px-4 py-5 text-center sm:px-5">
                    <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Everything here is marked watched
                    </p>
                    <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Open the Watched tab to review titles or mark them as not watched yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPicksListTab("watched")}
                      className="ui-btn ui-btn-secondary mt-1 w-full sm:mx-auto sm:w-auto"
                    >
                      Go to Watched
                    </button>
                  </SurfaceCard>
                )
              ) : watchedPickReviews.length > 0 ? (
                shouldVirtualizeList(watchedPickReviews.length) ? (
                  <VirtualScrollList count={watchedPickReviews.length} estimateItemSize={128}>
                    {(index) => {
                      const entry = watchedPickReviews[index]!;
                      return (
                        <PicksMovieRow
                          key={`${entry.movie.id}-${entry.watchedAt}`}
                          variant="watched"
                          movie={entry.movie}
                          watchedRecommended={entry.recommended}
                          listIndex={index}
                          matchingPartners={partnerNamesByPickId.get(entry.movie.id) ?? []}
                          isDarkMode={isDarkMode}
                          onOpenDetails={openPickDetails}
                          onShare={handleShareMovie}
                          onMarkWatched={requestMarkWatched}
                          onRequestRemove={requestRemovePick}
                          onUnwatch={handleUnwatch}
                        />
                      );
                    }}
                  </VirtualScrollList>
                ) : (
                  watchedPickReviews.map((entry, index) => (
                    <PicksMovieRow
                      key={`${entry.movie.id}-${entry.watchedAt}`}
                      variant="watched"
                      movie={entry.movie}
                      watchedRecommended={entry.recommended}
                      listIndex={index}
                      matchingPartners={partnerNamesByPickId.get(entry.movie.id) ?? []}
                      isDarkMode={isDarkMode}
                      onOpenDetails={openPickDetails}
                      onShare={handleShareMovie}
                      onMarkWatched={requestMarkWatched}
                      onRequestRemove={requestRemovePick}
                      onUnwatch={handleUnwatch}
                    />
                  ))
                )
              ) : (
                <SurfaceCard className="space-y-2 px-4 py-5 text-center sm:px-5">
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    No watched titles yet
                  </p>
                  <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Mark a pick as watched from the To watch tab — it will show up here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPicksListTab("queue")}
                    className="ui-btn ui-btn-secondary mt-1 w-full sm:mx-auto sm:w-auto"
                  >
                    Back to To watch
                  </button>
                </SurfaceCard>
              )}
            </div>
          </div>
        ) : null}

        {acceptedMovies.length === 0 ? (
          <AppRouteEmptyCard
            title="No picks yet"
            description="Start in Discover and accept the movies that feel right."
            isDarkMode={isDarkMode}
            tone="comfortable"
            className="fade-up-enter space-y-3 text-center"
            style={{ animationDelay: "160ms" }}
            primaryAction={{ label: "Go to Discover", href: "/discover" }}
          />
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
            <span className="ui-modal-accent-bar" aria-hidden />
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
      {pendingWatchedMovie ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/50 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close watched confirmation"
            onClick={() => setPendingWatchedMovieId(null)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto flex w-[min(100%,22rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:w-full ${
              isDarkMode
                ? "border-white/10 bg-slate-950 text-white"
                : "border-white/80 bg-white text-slate-900"
            }`}
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div className={`ui-shell-header shrink-0 ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}>
              <div className="min-w-0 flex-1 pr-2">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-violet-300/90" : "text-violet-600/90"}`}>
                  Your take
                </p>
                <h3 id="picks-watched-dialog-title" className="mt-1 line-clamp-2 text-base font-semibold leading-snug sm:text-lg">
                  {pendingWatchedMovie.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingWatchedMovieId(null)}
                aria-label="Close"
                className={`ui-shell-close shrink-0 ${
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
            <div className="ui-shell-body !pt-4">
              <p
                className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                id="picks-watched-dialog-desc"
              >
                Would you recommend this to a friend?
              </p>
            </div>
            <div
              className={`ui-shell-footer !flex-col !gap-2 !pt-4 sm:!flex-row sm:!gap-3 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}
              role="group"
              aria-labelledby="picks-watched-dialog-title"
              aria-describedby="picks-watched-dialog-desc"
            >
              <button
                type="button"
                onClick={async () => {
                  await markPickWatched(pendingWatchedMovie.id, false);
                  setPendingWatchedMovieId(null);
                }}
                className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400/80 sm:min-w-0 sm:flex-1 ${
                  isDarkMode
                    ? "border-red-500/45 bg-red-950/25 text-red-200/95 hover:border-red-400/55 hover:bg-red-950/45"
                    : "border-red-300/90 bg-red-50/40 text-red-800 hover:border-red-400 hover:bg-red-50/90"
                }`}
              >
                Not for me
              </button>
              <button
                type="button"
                onClick={async () => {
                  await markPickWatched(pendingWatchedMovie.id, true);
                  setPendingWatchedMovieId(null);
                }}
                className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/80 sm:min-w-0 sm:flex-1 ${
                  isDarkMode
                    ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200/95 hover:border-emerald-400/50 hover:bg-emerald-950/40"
                    : "border-emerald-300/90 bg-emerald-50/50 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50"
                }`}
              >
                Recommend
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isBuyProModalOpen ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/45 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close buy pro modal"
            className="absolute inset-0 cursor-default bg-transparent"
            onClick={() => setIsBuyProModalOpen(false)}
          />
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto max-w-xl overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
              isDarkMode
                ? "border-white/12 bg-slate-950 text-slate-100"
                : "border-slate-200/90 bg-white text-slate-900"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Buy Pro"
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div className={`ui-shell-header ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-inherit">Choose your Pro plan</p>
                <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Pick a subscription and continue to secure checkout.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBuyProModalOpen(false)}
                aria-label="Close"
                className={`ui-shell-close ${
                  isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="ui-icon-md ui-icon-stroke"
                  aria-hidden
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="ui-shell-body space-y-3 !pt-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  {
                    id: "pro_monthly" as const,
                    title: "Pro Monthly",
                    price: "$5.99 / month",
                    note: "Flexible billing",
                  },
                  {
                    id: "pro_yearly" as const,
                    title: "Pro Yearly",
                    price: "$49.99 / year",
                    note: "Best value",
                  },
                  {
                    id: "pro_partner_gift" as const,
                    title: "Pro + Partner Gift",
                    price: "$9.99 one-time",
                    note: "Includes one redeem code",
                  },
                ].map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanType(plan.id)}
                    className={`rounded-[14px] border px-3 py-3 text-left transition ${
                      selectedPlanType === plan.id
                        ? isDarkMode
                          ? "border-violet-400/45 bg-violet-500/12 ring-1 ring-violet-400/28"
                          : "border-violet-300 bg-violet-50 ring-1 ring-violet-200/80"
                        : isDarkMode
                          ? "border-white/10 bg-white/[0.03]"
                          : "border-slate-200/90 bg-white"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      {plan.title}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${isDarkMode ? "text-violet-200" : "text-violet-700"}`}>
                      {plan.price}
                    </p>
                    <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {plan.note}
                    </p>
                  </button>
                ))}
              </div>
              {selectedPlanType === "pro_partner_gift" ? (
                acceptedConnectedPartners.length > 0 ? (
                  <div className="space-y-2">
                    <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Choose the connected partner for this gift
                    </p>
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-expanded={isGiftPartnerPickerOpen}
                      onClick={() => setIsGiftPartnerPickerOpen(true)}
                      className={`flex w-full items-center justify-between gap-2 rounded-[14px] border px-3 py-2.5 text-left text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${
                        isDarkMode
                          ? "border-white/12 bg-white/[0.06] text-white hover:border-white/18 hover:bg-white/[0.09]"
                          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                      }`}
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2.5">
                        {selectedGiftPartner ? (
                          <AvatarBadge
                            initials={selectedGiftPartner.avatar}
                            imageUrl={selectedGiftPartner.avatarImageUrl}
                            sizeClassName="h-8 w-8 shrink-0"
                            textClassName="text-[10px] font-bold"
                          />
                        ) : null}
                        <span
                          className={`min-w-0 truncate ${
                            selectedGiftPartner
                              ? isDarkMode
                                ? "text-white"
                                : "text-slate-900"
                              : isDarkMode
                                ? "text-slate-500"
                                : "text-slate-400"
                          }`}
                        >
                          {selectedGiftPartner?.name ?? "Select partner"}
                        </span>
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className={`ui-icon-md ui-icon-stroke shrink-0 opacity-70 ${
                          isDarkMode ? "text-slate-300" : "text-slate-500"
                        }`}
                        aria-hidden
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <p className={`text-xs ${isDarkMode ? "text-amber-300" : "text-amber-700"}`}>
                    You need at least one accepted connection to use Partner Gift.
                  </p>
                )
              ) : null}
              {billingFeedback ? (
                <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {billingFeedback}
                </p>
              ) : null}
            </div>
            <div className="ui-shell-footer !flex !flex-col !pt-3">
              <button
                type="button"
                onClick={() => setIsBuyProModalOpen(false)}
                className="ui-btn ui-btn-secondary w-full"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleOpenCheckout()}
                disabled={isOpeningCheckout}
                className="ui-btn ui-btn-primary w-full disabled:opacity-70"
              >
                {isOpeningCheckout ? "Opening checkout..." : "Continue to secure checkout"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isGiftPartnerPickerOpen ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/50 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setIsGiftPartnerPickerOpen(false)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto w-full max-w-[min(92vw,26rem)] overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.28)] ${
              isDarkMode
                ? "border-white/12 bg-slate-950 text-slate-100"
                : "border-slate-200/90 bg-white text-slate-900"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="picks-gift-partner-picker-title"
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div className={`ui-shell-header relative ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}>
              <div className="min-w-0 flex-1 pt-0.5">
                <p id="picks-gift-partner-picker-title" className="text-lg font-semibold text-inherit">
                  Gift recipient
                </p>
                <p className={`mt-1 text-xs leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Choose the connected partner who should receive the redeem code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsGiftPartnerPickerOpen(false)}
                aria-label="Close"
                className={`ui-shell-close ${
                  isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="ui-shell-body max-h-[min(52vh,22rem)] space-y-2 overflow-y-auto !pt-4">
              {acceptedConnectedPartners.map((partner) => {
                const selected = partner.id === selectedGiftPartnerId;
                return (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => {
                      setSelectedGiftPartnerId(partner.id);
                      setIsGiftPartnerPickerOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-[16px] border px-3.5 py-2.5 text-left text-sm font-semibold transition active:scale-[0.99] ${
                      selected
                        ? isDarkMode
                          ? "border-violet-400/45 bg-violet-500/15 text-violet-50 ring-1 ring-violet-400/30"
                          : "border-violet-300 bg-violet-50 text-violet-900 ring-1 ring-violet-200/80"
                        : isDarkMode
                          ? "border-white/10 bg-white/[0.04] text-slate-100 hover:border-white/16 hover:bg-white/[0.07]"
                          : "border-slate-200/90 bg-slate-50/80 text-slate-900 hover:border-slate-300 hover:bg-white"
                    }`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5">
                      <AvatarBadge
                        initials={partner.avatar}
                        imageUrl={partner.avatarImageUrl}
                        sizeClassName="h-8 w-8 shrink-0"
                        textClassName="text-[10px] font-bold"
                      />
                      <span className="min-w-0 truncate">{partner.name}</span>
                    </span>
                    {selected ? (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          isDarkMode ? "bg-violet-400/25 text-violet-100" : "bg-violet-200/80 text-violet-900"
                        }`}
                      >
                        Selected
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="ui-shell-footer !flex !flex-col !flex-nowrap !gap-2 !px-4 !pt-3 sm:!px-5">
              <button
                type="button"
                onClick={() => setIsGiftPartnerPickerOpen(false)}
                className="ui-btn ui-btn-secondary w-full justify-center px-3 py-2.5 text-xs font-semibold leading-tight tracking-tight sm:text-[13px]"
              >
                Cancel
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

