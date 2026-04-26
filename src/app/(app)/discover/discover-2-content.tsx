"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DiscoverMatchExplainModal } from "@/components/discover-match-explain-modal";
import { ModalPortal } from "@/components/modal-portal";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";
import { DiscoverSearchResultRow } from "@/components/discover-search-result-row";
import {
  shouldVirtualizeList,
  VirtualScrollList,
} from "@/components/virtual-scroll-list";
import { DiscoverOnboardingNudges } from "@/components/discover-onboarding-nudges";
import { MovieSwipeCard } from "@/components/movie-swipe-card";
import { AppRouteNetworkStatus } from "@/components/app-route-status";
import { NetworkStatusBlock } from "@/components/network-status-block";
import { SurfaceCard } from "@/components/surface-card";
import { DiscoverCardSkeleton, SearchResultsSkeletonList } from "@/components/ui-skeleton";
import { FAVORITE_GENRE_LIMIT } from "@/lib/discover-constants";
import {
  loadDiscoverSession,
  saveDiscoverSession,
  type DiscoverSessionSnapshotV1,
} from "@/lib/discover-session";
import { useEscapeToClose } from "@/lib/use-escape-to-close";
import {
  explainDiscoverSwipeMatch,
  type DiscoverSwipeMatchExplanation,
} from "@/lib/match-score";
import type { Movie } from "@/lib/types";
import { useAppState } from "@/lib/app-state";

const ONBOARDING_STEP_COUNT = 3;
/**
 * How long the current card + feedback stay before we advance. Must be ≥
 * `--motion-duration-discover-swipe-accept` and ≥ burst + heart delay so nothing clips.
 */
const DISCOVER2_SWIPE_ACCEPT_COMMIT_MS = 940;
/** Reject only needs swipe-out + pass overlay; shorter than accept. */
const DISCOVER2_SWIPE_REJECT_COMMIT_MS = 340;

export type DiscoverPageContentProps = {
  currentUserId: string | null;
  discoverQueue: Movie[];
  discoverSessionKey: string;
  discoverStartOffset: number;
  discoverVisibilityTimestamp: number;
  registerMovies: (movies: Movie[]) => void;
  swipeMovie: (movieId: string, decision: "accepted" | "rejected") => Promise<void>;
  undoSwipe: (movieId: string) => Promise<void>;
  isDarkMode: boolean;
  toggleDarkMode: () => Promise<void>;
  logout: () => Promise<void>;
  currentUserName: string | null;
  onboardingPreferences: {
    favoriteGenres: string[];
    dislikedGenres: string[];
    mediaPreference: "movie" | "series" | "both";
    tasteProfile: string[];
    completedAt: string | null;
  };
  isOnboardingComplete: boolean;
  completeOnboarding: (payload: {
    favoriteGenres: string[];
    dislikedGenres: string[];
    mediaPreference: "movie" | "series" | "both";
    tasteProfile: string[];
  }) => Promise<void>;
  discoverGenreAffinity: Map<string, number>;
  discoverRejectedGenreWeights: Map<string, number>;
  discoverTasteYear: {
    center: number;
    spread: number;
    classicEngaged: boolean;
  };
  discoverPersonalizationWeight: number;
};

type LastSwipeRecord = {
  movie: Movie;
  decision: "accepted" | "rejected";
  browseIndex: number;
  focusedMovieId: string | null;
};

/**
 * Discover variant 2: full-height flex layout so the swipe card grows with the viewport (less dead
 * space under the header/search), swipe-app style density, and responsive gaps. Default route
 * (`/discover`) is controlled by `DISCOVER_DEFAULT_VARIANT` in `src/lib/discover-ab.ts`.
 */
export function DiscoverPage2Content({
  currentUserId,
  discoverQueue,
  discoverSessionKey,
  discoverStartOffset,
  discoverVisibilityTimestamp,
  registerMovies,
  swipeMovie,
  undoSwipe,
  isDarkMode,
  toggleDarkMode,
  logout,
  currentUserName,
  onboardingPreferences,
  isOnboardingComplete,
  completeOnboarding,
  discoverGenreAffinity,
  discoverRejectedGenreWeights,
  discoverTasteYear,
  discoverPersonalizationWeight,
}: DiscoverPageContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);
  const [focusedMovieId, setFocusedMovieId] = useState<string | null>(null);
  const [browseIndex, setBrowseIndex] = useState(0);
  const [transitionState, setTransitionState] = useState<"idle" | "out" | "in">("idle");
  const [transitionDirection, setTransitionDirection] = useState<"next" | "previous">("next");
  const [swipeFeedback, setSwipeFeedback] = useState<"accepted" | "rejected" | null>(null);
  const [lastSwipe, setLastSwipe] = useState<LastSwipeRecord | null>(null);
  const [matchExplanation, setMatchExplanation] = useState<DiscoverSwipeMatchExplanation | null>(
    null,
  );
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [moreMenuCoords, setMoreMenuCoords] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [menuBanner, setMenuBanner] = useState<{
    message: string;
    variant: "success" | "error";
    onRetry?: () => void;
  } | null>(null);
  type SearchFetchState = "idle" | "loading" | "ready" | "empty" | "error";
  const [searchFetchState, setSearchFetchState] = useState<SearchFetchState>("idle");
  const [searchFetchError, setSearchFetchError] = useState<string | null>(null);
  const [searchRetryKey, setSearchRetryKey] = useState(0);
  type SharedMovieFetch = "idle" | "loading" | "error" | "missing";
  const [sharedMovieFetch, setSharedMovieFetch] = useState<SharedMovieFetch>("idle");
  const [sharedMovieRetryKey, setSharedMovieRetryKey] = useState(0);
  /** Keeps a pick link working when the title is not in Discover (e.g. already in picks / hidden). */
  const [sharedLinkOverlayMovie, setSharedLinkOverlayMovie] = useState<Movie | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const swipeTimeoutRef = useRef<number | null>(null);
  const undoToastTimeoutRef = useRef<number | null>(null);
  const discoverSessionSaveTimerRef = useRef<number | null>(null);
  const discoverSessionSnapshotRef = useRef<DiscoverSessionSnapshotV1 | null>(null);
  const overlaySearchInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const moreMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const isSearchOpen = isSearchSheetOpen;
  const sharedMovieId = searchParams.get("movieId");
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);
  const [onboardingFavorites, setOnboardingFavorites] = useState<string[]>(
    onboardingPreferences.favoriteGenres,
  );
  const [onboardingDisliked, setOnboardingDisliked] = useState<string[]>(
    onboardingPreferences.dislikedGenres,
  );
  const [onboardingMediaPreference, setOnboardingMediaPreference] = useState<
    "movie" | "series" | "both"
  >(onboardingPreferences.mediaPreference);
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    setOnboardingFavorites(onboardingPreferences.favoriteGenres);
    setOnboardingDisliked(onboardingPreferences.dislikedGenres);
    setOnboardingMediaPreference(onboardingPreferences.mediaPreference);
  }, [onboardingPreferences]);

  useEffect(() => {
    if (!isOnboardingComplete) {
      setOnboardingStep(0);
    }
  }, [isOnboardingComplete]);

  useBodyScrollLock(isMoreMenuOpen);

  useEscapeToClose(isSearchOpen, () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchSheetOpen(false);
  });
  useEscapeToClose(isFilterOpen, () => setIsFilterOpen(false));
  useEscapeToClose(isMoreMenuOpen, () => setIsMoreMenuOpen(false));

  const visibleDiscoverIds = useMemo(
    () => new Set(discoverQueue.map((movie) => movie.id)),
    [discoverQueue],
  );

  useEffect(() => {
    if (!sharedMovieId) {
      setSharedMovieFetch("idle");
      return;
    }

    const existingMovie =
      discoverQueue.find((entry) => entry.id === sharedMovieId) ??
      searchResults.find((entry) => entry.id === sharedMovieId);

    if (existingMovie) {
      registerMovies([existingMovie]);
      setSelectedGenres([]);
      setSharedLinkOverlayMovie(existingMovie);
      setFocusedMovieId(existingMovie.id);
      setIsSearchSheetOpen(false);
      setSharedMovieFetch("idle");
      router.replace("/discover", { scroll: false });
      return;
    }

    let active = true;
    const controller = new AbortController();
    setSharedMovieFetch("loading");

    void (async () => {
      try {
        const response = await fetch(
          `/api/movies?movieId=${encodeURIComponent(sharedMovieId)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!active) {
          return;
        }

        if (!response.ok) {
          setSharedMovieFetch("error");
          return;
        }

        const payload = (await response.json()) as { movie?: Movie | null };

        if (!active) {
          return;
        }

        if (!payload.movie) {
          setSharedMovieFetch("missing");
          return;
        }

        registerMovies([payload.movie]);
        setSelectedGenres([]);
        setSharedLinkOverlayMovie(payload.movie);
        setFocusedMovieId(payload.movie.id);
        setIsSearchSheetOpen(false);
        setSharedMovieFetch("idle");
        router.replace("/discover", { scroll: false });
      } catch {
        if (!active) {
          return;
        }
        setSharedMovieFetch("error");
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    discoverQueue,
    registerMovies,
    router,
    searchResults,
    sharedMovieId,
    sharedMovieRetryKey,
  ]);

  useEffect(() => {
    if (normalizedSearchQuery.length < 2) {
      setSearchFetchState("idle");
      setSearchFetchError(null);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchFetchState("loading");
      setSearchFetchError(null);

      try {
        const response = await fetch(
          `/api/movies?source=tmdb&query=${encodeURIComponent(
            searchQuery.trim(),
          )}${currentUserId ? `&userId=${encodeURIComponent(currentUserId)}` : ""}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          const errPayload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          setSearchFetchState("error");
          setSearchFetchError(
            errPayload.error ?? "Search couldn’t be completed. Try again.",
          );
          setSearchResults([]);
          return;
        }

        const payload = (await response.json()) as { movies?: Movie[] };
        const movies = payload.movies ?? [];
        registerMovies(movies);
        setSearchResults(movies);

        if (movies.length === 0) {
          setSearchFetchState("empty");
        } else {
          setSearchFetchState("ready");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSearchFetchState("error");
        setSearchFetchError("We couldn’t reach the search service. Check your connection.");
        setSearchResults([]);
      }
    }, 280);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    currentUserId,
    normalizedSearchQuery,
    registerMovies,
    searchQuery,
    searchRetryKey,
  ]);

  const genres = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(discoverQueue.flatMap((movie) => movie.genre)),
      ).sort((left, right) => left.localeCompare(right)),
    ];
  }, [discoverQueue]);
  const onboardingGenres = useMemo(
    () =>
      Array.from(
        new Set(
          discoverQueue.flatMap((movie) =>
            movie.genre.filter((genre) => genre !== "Movie" && genre !== "Series"),
          ),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [discoverQueue],
  );

  const onboardingDislikeGenreOptions = useMemo(
    () => onboardingGenres.filter((genre) => !onboardingFavorites.includes(genre)),
    [onboardingGenres, onboardingFavorites],
  );

  const toggleOnboardingFavoriteGenre = useCallback((genre: string) => {
    setOnboardingFavorites((current) => {
      if (current.includes(genre)) {
        return current.filter((entry) => entry !== genre);
      }
      if (current.length >= FAVORITE_GENRE_LIMIT) {
        return current;
      }
      setOnboardingDisliked((disliked) => disliked.filter((entry) => entry !== genre));
      return [...current, genre];
    });
  }, []);

  const filteredQueue = useMemo(() => {
    return discoverQueue.filter((movie) => {
      const matchesGenre =
        selectedGenres.length === 0 ||
        selectedGenres.some((genre) => movie.genre.includes(genre));

      return matchesGenre;
    });
  }, [discoverQueue, selectedGenres]);

  const sortedSearchResults = useMemo(() => {
    if (normalizedSearchQuery.length < 2) {
      return [];
    }

    return [...searchResults]
      .filter((movie) => visibleDiscoverIds.has(movie.id))
      .sort((left, right) => {
        const leftTitle = left.title.toLowerCase();
        const rightTitle = right.title.toLowerCase();
        const leftStarts = leftTitle.startsWith(normalizedSearchQuery) ? 1 : 0;
        const rightStarts = rightTitle.startsWith(normalizedSearchQuery) ? 1 : 0;

        if (leftStarts !== rightStarts) {
          return rightStarts - leftStarts;
        }

        const leftIndex = leftTitle.indexOf(normalizedSearchQuery);
        const rightIndex = rightTitle.indexOf(normalizedSearchQuery);
        const safeLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
        const safeRightIndex =
          rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

        if (safeLeftIndex !== safeRightIndex) {
          return safeLeftIndex - safeRightIndex;
        }

        return left.title.localeCompare(right.title);
      });
  }, [normalizedSearchQuery, searchResults, visibleDiscoverIds]);

  const safeBrowseIndex =
    filteredQueue.length === 0
      ? 0
      : Math.min(browseIndex, filteredQueue.length - 1);
  const focusedMovie =
    focusedMovieId
      ? discoverQueue.find((entry) => entry.id === focusedMovieId) ??
        filteredQueue.find((entry) => entry.id === focusedMovieId) ??
        searchResults.find((entry) => entry.id === focusedMovieId) ??
        (sharedLinkOverlayMovie?.id === focusedMovieId ? sharedLinkOverlayMovie : null)
      : null;
  const movie = focusedMovie ?? filteredQueue[safeBrowseIndex];

  /** Keeps the current title when possible; only jumps when it drops out of the new filter. */
  const applyGenreFilterChange = useCallback(
    (nextGenres: string[]) => {
      const nextFiltered = discoverQueue.filter((m) => {
        return (
          nextGenres.length === 0 ||
          nextGenres.some((g) => m.genre.includes(g))
        );
      });

      const currentId =
        focusedMovieId ??
        (filteredQueue.length > 0 ? filteredQueue[safeBrowseIndex]?.id : null) ??
        null;

      let nextBrowse = 0;
      if (nextFiltered.length > 0) {
        if (currentId) {
          const idx = nextFiltered.findIndex((m) => m.id === currentId);
          nextBrowse =
            idx >= 0
              ? idx
              : Math.min(safeBrowseIndex, nextFiltered.length - 1);
        } else {
          nextBrowse = Math.min(safeBrowseIndex, nextFiltered.length - 1);
        }
      }

      setBrowseIndex(nextBrowse);
      setFocusedMovieId(null);
      setSelectedGenres(nextGenres);
    },
    [discoverQueue, filteredQueue, focusedMovieId, safeBrowseIndex],
  );

  useEffect(() => {
    setBrowseIndex(0);
    setFocusedMovieId(null);
    setSharedLinkOverlayMovie(null);
  }, [discoverSessionKey]);

  useEffect(() => {
    if (typeof window === "undefined" || sharedMovieId) {
      return;
    }

    const snapshot = loadDiscoverSession(currentUserId);
    if (!snapshot) {
      return;
    }

    setSearchQuery(snapshot.searchQuery);
    setSelectedGenres(snapshot.selectedGenres);
    setBrowseIndex(snapshot.browseIndex);
    setFocusedMovieId(snapshot.focusedMovieId);
    setIsSearchSheetOpen(snapshot.isSearchSheetOpen);
  }, [currentUserId, sharedMovieId]);

  useEffect(() => {
    if (!focusedMovieId || discoverQueue.length === 0) {
      return;
    }

    if (!discoverQueue.some((entry) => entry.id === focusedMovieId)) {
      if (sharedLinkOverlayMovie?.id === focusedMovieId) {
        return;
      }
      setFocusedMovieId(null);
    }
  }, [discoverQueue, focusedMovieId, sharedLinkOverlayMovie]);

  useEffect(() => {
    if (filteredQueue.length === 0) {
      return;
    }

    setBrowseIndex((current) => {
      const maxIndex = filteredQueue.length - 1;
      return current > maxIndex ? maxIndex : current;
    });
  }, [filteredQueue.length]);

  useLayoutEffect(() => {
    discoverSessionSnapshotRef.current = {
      v: 1,
      searchQuery,
      selectedGenres,
      browseIndex,
      focusedMovieId,
      isSearchSheetOpen,
      deckShuffleSeed: discoverSessionKey,
      deckStartOffset: discoverStartOffset,
      deckVisibilityTimestamp: discoverVisibilityTimestamp,
    };
  }, [
    searchQuery,
    selectedGenres,
    browseIndex,
    focusedMovieId,
    isSearchSheetOpen,
    discoverSessionKey,
    discoverStartOffset,
    discoverVisibilityTimestamp,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (discoverSessionSaveTimerRef.current) {
      window.clearTimeout(discoverSessionSaveTimerRef.current);
    }

    discoverSessionSaveTimerRef.current = window.setTimeout(() => {
      const payload = discoverSessionSnapshotRef.current;
      if (payload) {
        saveDiscoverSession(currentUserId, payload);
      }
    }, 450);

    return () => {
      if (discoverSessionSaveTimerRef.current) {
        window.clearTimeout(discoverSessionSaveTimerRef.current);
        discoverSessionSaveTimerRef.current = null;
      }
      const payload = discoverSessionSnapshotRef.current;
      if (payload) {
        saveDiscoverSession(currentUserId, payload);
      }
    };
  }, [
    browseIndex,
    currentUserId,
    discoverSessionKey,
    discoverStartOffset,
    discoverVisibilityTimestamp,
    focusedMovieId,
    isSearchSheetOpen,
    searchQuery,
    selectedGenres,
  ]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const onVisibilityChange = () => {
      if (document.visibilityState !== "hidden") {
        return;
      }
      const payload = discoverSessionSnapshotRef.current;
      if (payload) {
        saveDiscoverSession(currentUserId, payload);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [currentUserId]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }

      if (swipeTimeoutRef.current) {
        window.clearTimeout(swipeTimeoutRef.current);
      }

      if (undoToastTimeoutRef.current) {
        window.clearTimeout(undoToastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMoreMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      const targetNode = event.target as Node | null;
      if (!targetNode) {
        return;
      }

      const inTrigger = menuRef.current?.contains(targetNode) ?? false;
      const inPanel = moreMenuPanelRef.current?.contains(targetNode) ?? false;
      if (!inTrigger && !inPanel) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isMoreMenuOpen]);

  useLayoutEffect(() => {
    if (!isMoreMenuOpen) {
      setMoreMenuCoords(null);
      return;
    }
    if (!menuRef.current) {
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    setMoreMenuCoords({
      top: rect.bottom + 8,
      right: Math.max(12, globalThis.innerWidth - rect.right),
    });
  }, [isMoreMenuOpen]);

  useEffect(() => {
    if (!isMoreMenuOpen) {
      return;
    }
    const main = document.getElementById("main-content");
    if (!main) {
      return;
    }
    const onScroll = () => {
      setIsMoreMenuOpen(false);
    };
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      main.removeEventListener("scroll", onScroll);
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    if (!isMoreMenuOpen) {
      return;
    }
    const onResize = () => {
      setIsMoreMenuOpen(false);
    };
    globalThis.addEventListener("resize", onResize, { passive: true });
    return () => {
      globalThis.removeEventListener("resize", onResize);
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      overlaySearchInputRef.current?.focus();
      const currentLength = overlaySearchInputRef.current?.value.length ?? 0;
      overlaySearchInputRef.current?.setSelectionRange(currentLength, currentLength);
    }, 30);

    return () => window.clearTimeout(timer);
  }, [isSearchOpen]);

  const navigateCard = useCallback((direction: "next" | "previous") => {
    if (transitionState !== "idle") {
      return;
    }

    if (focusedMovieId) {
      setSharedLinkOverlayMovie((current) =>
        current?.id === focusedMovieId ? null : current,
      );
      setFocusedMovieId(null);

      if (filteredQueue.length === 0) {
        return;
      }

      if (direction === "next") {
        setBrowseIndex((current) => Math.min(current, filteredQueue.length - 1));
      } else {
        setBrowseIndex((current) => Math.max(current - 1, 0));
      }
      return;
    }

    const nextIndex =
      direction === "next"
        ? Math.min(safeBrowseIndex + 1, filteredQueue.length - 1)
        : Math.max(safeBrowseIndex - 1, 0);

    if (nextIndex === safeBrowseIndex) {
      return;
    }

    setTransitionDirection(direction);
    setTransitionState("out");

    transitionTimeoutRef.current = window.setTimeout(() => {
      setBrowseIndex(nextIndex);
      setTransitionState("in");

      transitionTimeoutRef.current = window.setTimeout(() => {
        setTransitionState("idle");
      }, 260);
    }, 190);
  }, [
    filteredQueue.length,
    focusedMovieId,
    safeBrowseIndex,
    transitionState,
  ]);

  const handleSelectSearchMovie = useCallback((selectedMovie: Movie) => {
    registerMovies([selectedMovie]);
    setSharedLinkOverlayMovie(null);
    setFocusedMovieId(selectedMovie.id);
    const movieIndex = discoverQueue.findIndex((entry) => entry.id === selectedMovie.id);

    if (movieIndex >= 0) {
      setBrowseIndex(movieIndex);
    }

    setSelectedGenres([]);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchSheetOpen(false);
  }, [discoverQueue, registerMovies]);

  const triggerHaptic = (decision: "accepted" | "rejected") => {
    if (typeof window === "undefined" || !("navigator" in window)) {
      return;
    }

    const canVibrate =
      "vibrate" in window.navigator &&
      typeof window.navigator.vibrate === "function";

    if (!canVibrate) {
      return;
    }

    window.navigator.vibrate(decision === "accepted" ? [14, 24, 18] : [18]);
  };

  const handleSwipe = useCallback((decision: "accepted" | "rejected") => {
    if (!movie || transitionState !== "idle" || swipeFeedback) {
      return;
    }

    const swipedMovie = movie;
    const nextBrowseIndex =
      filteredQueue.length <= 1
        ? 0
        : Math.min(safeBrowseIndex, filteredQueue.length - 2);

    setSwipeFeedback(decision);
    setFocusedMovieId(null);
    triggerHaptic(decision);

    if (undoToastTimeoutRef.current) {
      window.clearTimeout(undoToastTimeoutRef.current);
    }

    swipeTimeoutRef.current = window.setTimeout(() => {
      registerMovies([swipedMovie]);
      setBrowseIndex(nextBrowseIndex);
      setSwipeFeedback(null);
      setSharedLinkOverlayMovie((current) =>
        current?.id === swipedMovie.id ? null : current,
      );
      setLastSwipe({
        movie: swipedMovie,
        decision,
        browseIndex: safeBrowseIndex,
        focusedMovieId,
      });
      undoToastTimeoutRef.current = window.setTimeout(() => {
        setLastSwipe((current) =>
          current?.movie.id === swipedMovie.id ? null : current,
        );
      }, 5200);

      void swipeMovie(swipedMovie.id, decision);
    },
      decision === "accepted"
        ? DISCOVER2_SWIPE_ACCEPT_COMMIT_MS
        : DISCOVER2_SWIPE_REJECT_COMMIT_MS,
    );
  }, [
    movie,
    transitionState,
    swipeFeedback,
    filteredQueue.length,
    safeBrowseIndex,
    focusedMovieId,
    registerMovies,
    swipeMovie,
  ]);

  const openMatchExplanation = useCallback(() => {
    if (!movie || !currentUserId) {
      return;
    }
    setMatchExplanation(
      explainDiscoverSwipeMatch(movie, {
        genreAffinity: discoverGenreAffinity,
        rejectedGenreWeights: discoverRejectedGenreWeights,
        onboarding: {
          favoriteGenres: onboardingPreferences.favoriteGenres,
          dislikedGenres: onboardingPreferences.dislikedGenres,
          mediaPreference: onboardingPreferences.mediaPreference,
        },
        tasteYear: discoverTasteYear,
        calendarYear: new Date().getFullYear(),
        personalizationWeight: discoverPersonalizationWeight,
      }),
    );
  }, [
    movie,
    currentUserId,
    discoverGenreAffinity,
    discoverRejectedGenreWeights,
    discoverTasteYear,
    discoverPersonalizationWeight,
    onboardingPreferences.favoriteGenres,
    onboardingPreferences.dislikedGenres,
    onboardingPreferences.mediaPreference,
  ]);

  const onSwipeAccept = useCallback(() => {
    handleSwipe("accepted");
  }, [handleSwipe]);
  const onSwipeReject = useCallback(() => {
    handleSwipe("rejected");
  }, [handleSwipe]);
  const onCardPrevious = useCallback(() => {
    navigateCard("previous");
  }, [navigateCard]);
  const onCardNext = useCallback(() => {
    navigateCard("next");
  }, [navigateCard]);

  const handleUndoSwipe = async () => {
    if (!lastSwipe) {
      return;
    }

    if (undoToastTimeoutRef.current) {
      window.clearTimeout(undoToastTimeoutRef.current);
    }

    const restoredSwipe = lastSwipe;
    setLastSwipe(null);
    await undoSwipe(restoredSwipe.movie.id);
    registerMovies([restoredSwipe.movie]);
    setBrowseIndex(restoredSwipe.browseIndex);
    setFocusedMovieId(restoredSwipe.focusedMovieId);
  };

  const showMenuBanner = useCallback(
    (
      result: { ok: boolean; message: string },
      retry?: () => void,
    ) => {
      const showRetry = !result.ok && Boolean(retry);
      setMenuBanner({
        message: result.message,
        variant: result.ok ? "success" : "error",
        onRetry: showRetry ? retry : undefined,
      });
      const dismissMs = showRetry ? 9000 : 3600;
      window.setTimeout(() => {
        setMenuBanner((current) =>
          current?.message === result.message ? null : current,
        );
      }, dismissMs);
    },
    [],
  );

  const persistOnboarding = async (skipSelection: boolean) => {
    setIsSavingOnboarding(true);
    const favoriteGenres = skipSelection
      ? []
      : Array.from(
          new Set(
            onboardingFavorites.filter(
              (genre) => !onboardingDisliked.includes(genre),
            ),
          ),
        );
    const dislikedGenres = skipSelection
      ? []
      : Array.from(
          new Set(
            onboardingDisliked.filter((genre) => !favoriteGenres.includes(genre)),
          ),
        );
    await completeOnboarding({
      favoriteGenres,
      dislikedGenres,
      mediaPreference: onboardingMediaPreference,
      tasteProfile: onboardingPreferences.tasteProfile,
    });
    setIsSavingOnboarding(false);
  };

  return (
    <div
      className="discover-v2-page-stack discover-page-stack flex h-full min-h-0 w-full max-w-md min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden sm:gap-2"
      data-discover-ab="discover2"
    >
      <ModalPortal open={!isOnboardingComplete}>
        <div className="ui-overlay z-[var(--z-overlay)] bg-slate-950/55 backdrop-blur-md">
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 flex max-h-[min(90dvh,44rem)] flex-col overflow-hidden rounded-[28px] border ${
              isDarkMode
                ? "border-white/10 bg-slate-950 text-slate-100"
                : "border-slate-200/90 bg-white text-slate-900"
            }`}
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div className="ui-shell-header shrink-0">
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    isDarkMode ? "text-violet-300/90" : "text-violet-600/90"
                  }`}
                >
                  Step {onboardingStep + 1} of {ONBOARDING_STEP_COUNT}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {["Movies or series?", "Favorite genres", "Genres to skip"][onboardingStep] ??
                    "Tune Discover"}
                </p>
                <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {[
                    "Pick what Discover should prioritize.",
                    `Select up to ${FAVORITE_GENRE_LIMIT} genres you want more of (A–Z).`,
                    "Tap genres you usually avoid. Favorites are hidden so they won’t clash.",
                  ][onboardingStep] ?? ""}
                </p>
              </div>
            </div>
            <div className="ui-shell-body !min-h-0 !flex-1 !overflow-y-auto !pt-3">
              {onboardingStep === 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { id: "movie" as const, label: "Movies" },
                    { id: "series" as const, label: "Series" },
                    { id: "both" as const, label: "Both" },
                  ].map((option) => {
                    const selected = onboardingMediaPreference === option.id;
                    return (
                      <button
                        key={`ob-media-${option.id}`}
                        type="button"
                        onClick={() => setOnboardingMediaPreference(option.id)}
                        className={`min-h-[2.75rem] w-full rounded-[14px] px-3 py-2.5 text-center text-sm font-semibold transition ${
                          selected
                            ? isDarkMode
                              ? "bg-white/[0.06] text-white shadow-[inset_0_0_0_2px_rgba(167,139,250,0.95)] ring-0"
                              : "bg-slate-50 text-violet-900 shadow-[inset_0_0_0_2px_rgba(124,58,237,0.85)]"
                            : isDarkMode
                              ? "border border-white/12 bg-white/8 text-slate-200 hover:bg-white/10"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {onboardingStep === 1 ? (
                <div>
                  <p
                    className={`mb-3 text-xs font-semibold ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {onboardingFavorites.length}/{FAVORITE_GENRE_LIMIT} selected
                  </p>
                  <ul className="grid list-none grid-cols-2 gap-2">
                    {onboardingGenres.map((genre) => (
                      <li key={`ob-like-${genre}`}>
                        <button
                          type="button"
                          onClick={() => toggleOnboardingFavoriteGenre(genre)}
                          className={`flex min-h-[2.75rem] w-full items-center justify-center rounded-[14px] px-2 py-2 text-center text-sm font-semibold leading-tight ${
                            onboardingFavorites.includes(genre)
                              ? "bg-violet-600 text-white"
                              : isDarkMode
                                ? "border border-white/12 bg-white/8 text-slate-200"
                                : "border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {genre}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {onboardingStep === 2 ? (
                <div>
                  {onboardingDislikeGenreOptions.length === 0 ? (
                    <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      No other genres left to exclude — you already favor all available genres.
                    </p>
                  ) : (
                    <ul className="grid list-none grid-cols-2 gap-2">
                      {onboardingDislikeGenreOptions.map((genre) => (
                        <li key={`ob-dislike-${genre}`}>
                          <button
                            type="button"
                            onClick={() =>
                              setOnboardingDisliked((current) =>
                                current.includes(genre)
                                  ? current.filter((entry) => entry !== genre)
                                  : [...current, genre],
                              )
                            }
                            className={`flex min-h-[2.75rem] w-full items-center justify-center rounded-[14px] px-2 py-2 text-center text-sm font-semibold leading-tight ${
                              onboardingDisliked.includes(genre)
                                ? "bg-rose-600 text-white"
                                : isDarkMode
                                  ? "border border-white/12 bg-white/8 text-slate-200"
                                  : "border border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            {genre}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            <div className="ui-shell-footer !flex !w-full !flex-col !gap-2 !pt-3">
              {onboardingStep === 0 ? (
                <button
                  type="button"
                  disabled={isSavingOnboarding}
                  onClick={() => {
                    void persistOnboarding(true);
                  }}
                  className="ui-btn ui-btn-secondary w-full justify-center"
                >
                  Skip setup
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSavingOnboarding}
                  onClick={() => setOnboardingStep((step) => Math.max(0, step - 1))}
                  className="ui-btn ui-btn-secondary w-full justify-center"
                >
                  Back
                </button>
              )}
              {onboardingStep < ONBOARDING_STEP_COUNT - 1 ? (
                <button
                  type="button"
                  disabled={isSavingOnboarding}
                  onClick={() =>
                    setOnboardingStep((step) =>
                      Math.min(ONBOARDING_STEP_COUNT - 1, step + 1),
                    )
                  }
                  className="ui-btn ui-btn-primary w-full justify-center"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSavingOnboarding}
                  onClick={() => {
                    void persistOnboarding(false);
                  }}
                  className="ui-btn ui-btn-primary w-full justify-center"
                >
                  {isSavingOnboarding ? "Saving..." : "Start Discovering"}
                </button>
              )}
            </div>
          </div>
        </div>
      </ModalPortal>
      {sharedMovieId && sharedMovieFetch === "loading" ? (
        <div
          className="flex min-h-[min(70dvh,32rem)] flex-col space-y-3"
          role="status"
          aria-live="polite"
        >
          <p
            className={`text-center text-sm font-medium ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Opening shared title…
          </p>
          <div className="min-h-0 flex-1">
            <DiscoverCardSkeleton />
          </div>
        </div>
      ) : null}

      {sharedMovieId && (sharedMovieFetch === "error" || sharedMovieFetch === "missing") ? (
        <NetworkStatusBlock
          variant="error"
          isDarkMode={isDarkMode}
          title={
            sharedMovieFetch === "missing"
              ? "That shared movie isn’t available"
              : "Couldn’t open the shared movie"
          }
          description={
            sharedMovieFetch === "missing"
              ? "The link may be wrong or the title was removed from search."
              : "Check your connection, then try loading the link again."
          }
          onRetry={() => setSharedMovieRetryKey((count) => count + 1)}
          secondaryAction={{
            label: "Dismiss",
            onClick: () => {
              setSharedMovieFetch("idle");
              router.replace("/discover");
            },
          }}
        />
      ) : null}

      {!isSearchOpen ? (
        <div className="shrink-0 space-y-2 sm:space-y-2.5">
          <div className="mx-0.5 flex items-center justify-between gap-2 px-0.5 py-0.5 sm:mx-1 sm:gap-3 sm:py-1">
            <div className="min-w-0 flex-1 pr-0.5">
              <p
                className={`text-[14px] font-bold uppercase tracking-[0.18em] ${
                  isDarkMode ? "text-fuchsia-200" : "text-violet-700"
                }`}
              >
                CineMatch
              </p>
            </div>
            <div className="flex shrink-0">
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  aria-label="Open more options"
                  aria-haspopup="dialog"
                  aria-expanded={isMoreMenuOpen}
                  aria-controls={isMoreMenuOpen ? "discover-more-menu" : undefined}
                  onClick={() => setIsMoreMenuOpen((current) => !current)}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-full transition ${
                    isDarkMode
                      ? isMoreMenuOpen
                        ? "bg-white/12 text-white ring-2 ring-violet-400/45"
                        : "text-slate-300 hover:bg-white/8"
                      : isMoreMenuOpen
                        ? "bg-slate-200/90 text-slate-900 ring-2 ring-violet-500/35"
                        : "text-slate-700 hover:bg-black/5"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="ui-icon-md"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="5" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="12" cy="19" r="1.8" />
                  </svg>
                </button>
              </div>
              {typeof document !== "undefined" && isMoreMenuOpen && moreMenuCoords
                ? createPortal(
                    <>
                      <div
                        role="presentation"
                        className="fixed inset-0 z-[var(--z-overlay)] bg-slate-900/35 backdrop-blur-[2px] dark:bg-black/50"
                        onClick={() => setIsMoreMenuOpen(false)}
                        aria-hidden
                      />
                      <div
                        ref={moreMenuPanelRef}
                        id="discover-more-menu"
                        className="ui-menu-panel discover-more-menu fixed z-[var(--z-popover)] w-[min(20rem,calc(100dvi-1.5rem))] max-h-[min(72dvh,32rem)] overflow-y-auto p-0 shadow-2xl"
                        style={{
                          top: moreMenuCoords.top,
                          right: moreMenuCoords.right,
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="discover-more-menu-title"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="px-1.5 py-1">
                          <p
                            id="discover-more-menu-title"
                            className={`px-2 pt-0.5 pb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] ${
                              isDarkMode ? "text-slate-500" : "text-slate-500"
                            }`}
                          >
                            Account
                          </p>
                          <div className="space-y-0.5">
                            <Link
                              href="/settings"
                              onClick={() => setIsMoreMenuOpen(false)}
                              className="ui-menu-item group flex w-full items-center gap-3 rounded-[0.9rem] px-2.5 py-2.5 font-medium"
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  isDarkMode ? "bg-violet-500/15 text-violet-200" : "bg-violet-100 text-violet-700"
                                }`}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="ui-icon-md ui-icon-stroke"
                                  strokeWidth="1.75"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </span>
                              <span className="min-w-0">Settings</span>
                            </Link>
                            <Link
                              href="/profile"
                              onClick={() => setIsMoreMenuOpen(false)}
                              className="ui-menu-item group flex w-full items-center gap-3 rounded-[0.9rem] px-2.5 py-2.5 font-medium"
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  isDarkMode ? "bg-sky-500/15 text-sky-200" : "bg-sky-100 text-sky-700"
                                }`}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="ui-icon-md ui-icon-stroke"
                                  strokeWidth="1.75"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                  <circle cx="12" cy="7" r="4" />
                                </svg>
                              </span>
                              <span className="min-w-0">Profile</span>
                            </Link>
                          </div>
                          <p
                            className={`px-2 pb-1.5 pt-3 text-[0.7rem] font-semibold uppercase tracking-[0.14em] ${
                              isDarkMode ? "text-slate-500" : "text-slate-500"
                            }`}
                          >
                            Friends
                          </p>
                          <div className="space-y-0.5">
                            <Link
                              href="/friends"
                              onClick={() => setIsMoreMenuOpen(false)}
                              className="ui-menu-item group flex w-full items-center gap-3 rounded-[0.9rem] px-2.5 py-2.5 font-medium"
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  isDarkMode ? "bg-violet-500/15 text-violet-200" : "bg-violet-100 text-violet-700"
                                }`}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="ui-icon-md ui-icon-stroke"
                                  strokeWidth="1.75"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                                  <path d="M17 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                                </svg>
                              </span>
                              <div className="min-w-0 text-left">
                                <span className="block">Friends & search</span>
                                <span
                                  className={`mt-0.5 block text-xs font-normal ${
                                    isDarkMode ? "text-slate-500" : "text-slate-500"
                                  }`}
                                >
                                  Add people by User ID
                                </span>
                              </div>
                            </Link>
                          </div>
                          <div
                            className={`mt-2 flex w-full items-center justify-between gap-3 rounded-[0.9rem] px-2.5 py-2.5 ${
                              isDarkMode ? "bg-white/[0.07]" : "bg-slate-100/80"
                            }`}
                          >
                            <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--color-text-strong)]">
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                  isDarkMode ? "bg-white/10" : "bg-white shadow-sm"
                                }`}
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  className="ui-icon-md ui-icon-stroke"
                                  strokeWidth="1.75"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                                </svg>
                              </span>
                              <span>Dark mode</span>
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isDarkMode}
                              aria-label="Dark mode"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void toggleDarkMode();
                              }}
                              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
                                isDarkMode ? "bg-violet-600" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`pointer-events-none absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                                  isDarkMode ? "translate-x-5" : "translate-x-0"
                                }`}
                                aria-hidden
                              />
                            </button>
                          </div>
                          <div
                            className={`my-1.5 h-px w-full ${
                              isDarkMode ? "bg-white/10" : "bg-slate-200/80"
                            }`}
                            aria-hidden
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsMoreMenuOpen(false);
                              void logout().then(() => {
                                router.push("/");
                              });
                            }}
                            className={`ui-menu-item discover-more-menu__signout flex w-full items-center gap-3 rounded-[0.9rem] px-2.5 py-2.5 text-left text-sm font-semibold ${
                              isDarkMode ? "text-rose-300" : "text-rose-600"
                            }`}
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                isDarkMode ? "bg-rose-500/15" : "bg-rose-100"
                              }`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="ui-icon-md ui-icon-stroke"
                                strokeWidth="1.75"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                              </svg>
                            </span>
                            <span>Sign out</span>
                          </button>
                        </div>
                      </div>
                    </>,
                    document.body,
                  )
                : null}
            </div>
          </div>
          <DiscoverOnboardingNudges
            userId={currentUserId}
            isDarkMode={isDarkMode}
            hasActiveBrowse={Boolean(movie)}
            isOnboardingComplete={isOnboardingComplete}
          />
          <div
            className={`ui-glass-panel discover-toolbar-enter discover-search-toolbar rounded-[22px] border px-3 py-2 sm:px-3.5 ${
              isDarkMode ? "border-white/12" : "border-slate-200/90"
            }`}
          >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="relative min-w-0 flex-1">
              <p id="discover-search-hint" className="sr-only">
                Type at least two characters to open live search. Results open in a sheet so you
                can pick a title without losing your place.
              </p>
              <input
                value={searchQuery}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setSearchQuery(nextValue);

                  if (nextValue.trim().length < 2) {
                    setSearchResults([]);
                  } else {
                    setIsSearchSheetOpen(true);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                enterKeyHint="search"
                placeholder="Search a movie or series"
                aria-describedby="discover-search-hint"
                className={`ui-input-shell w-full min-w-0 py-2 pl-9 text-[13px] outline-none focus:border-violet-400 max-[380px]:text-[12px] sm:pl-10 ${
                  searchQuery.length > 0
                    ? "pr-10 max-[380px]:pr-9 sm:pr-11"
                    : "pr-3 max-[380px]:pr-2.5 sm:pr-4"
                }`}
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="ui-icon-md ui-icon-stroke"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
              </span>
              {searchQuery.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setIsSearchSheetOpen(false);
                  }}
                  aria-label="Clear search"
                  className="ui-soft-pill absolute right-2 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="ui-icon-sm ui-icon-stroke"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              aria-label="Open genre filter"
              title="Filter Discover by genre"
              className="ui-icon-button relative flex min-h-11 shrink-0 items-center justify-center gap-1.5 px-2 hover:bg-white/12 min-[400px]:min-w-0 min-[400px]:px-3"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="ui-icon-md ui-icon-stroke shrink-0"
                aria-hidden="true"
              >
                <path d="M4 6h16" />
                <path d="M7 12h10" />
                <path d="M10 18h4" />
              </svg>
              <span
                className={`hidden min-[400px]:inline text-xs font-semibold ${
                  isDarkMode ? "text-slate-200" : "text-slate-700"
                }`}
              >
                Filter
              </span>
              {selectedGenres.length > 0 ? (
                <span
                  className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white ring-2 ${
                    isDarkMode ? "ring-slate-950/90" : "ring-white/90"
                  }`}
                >
                  {selectedGenres.length}
                </span>
              ) : null}
            </button>
          </div>

          {normalizedSearchQuery.length > 0 || selectedGenres.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {normalizedSearchQuery.length > 0 && sortedSearchResults.length > 0 ? (
                <span className="ui-chip ui-chip--surface ui-chip--surface-lg font-semibold">
                  {sortedSearchResults.length} found
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        </div>
      ) : null}

      {menuBanner ? (
        <div
          className={`fixed inset-x-0 z-[200] flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top,0px))] ${
            menuBanner.onRetry ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="flex w-full max-w-md flex-col items-stretch gap-2 sm:items-center">
            <div
              role="status"
              className={`mx-auto w-full max-w-sm rounded-2xl px-4 py-3 text-center text-sm font-semibold leading-snug shadow-[0_20px_50px_rgba(0,0,0,0.45)] sm:text-base ${
                menuBanner.variant === "error"
                  ? isDarkMode
                    ? "border border-rose-400/50 bg-rose-950/95 text-rose-50 ring-1 ring-rose-400/20"
                    : "border border-rose-200 bg-rose-50 text-rose-900 ring-1 ring-rose-200/60"
                  : menuBanner.variant === "success"
                    ? isDarkMode
                      ? "border border-emerald-400/45 bg-slate-950/95 text-white ring-1 ring-white/10"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200/70"
                    : isDarkMode
                      ? "border border-white/20 bg-slate-950/95 text-white ring-1 ring-white/10"
                      : "border border-slate-200 bg-white text-slate-900 ring-1 ring-slate-200/80"
              }`}
            >
              {menuBanner.message}
            </div>
            {menuBanner.onRetry ? (
              <button type="button" onClick={menuBanner.onRetry} className="ui-btn ui-btn-primary text-xs">
                Try again
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <ModalPortal open={isSearchOpen}>
        <div
          role="presentation"
          className={`ui-overlay ui-overlay--fill z-[var(--z-overlay)] backdrop-blur-2xl ${
            isDarkMode ? "bg-slate-950/68" : "bg-slate-950/48"
          }`}
          onClick={() => {
            setSearchQuery("");
            setSearchResults([]);
            setIsSearchSheetOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="discover-search-sheet-title"
            className={`ui-shell ui-shell--fullscreen ui-shell--dialog-md mx-auto flex flex-col overflow-hidden border ${
              isDarkMode
                ? "border-white/12 bg-slate-950/72 backdrop-blur-2xl"
                : "border-slate-200/80 bg-white"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div
              className={`ui-shell-header !border-b-black/5 backdrop-blur-xl !pt-[max(1rem,env(safe-area-inset-top,0px))] ${
                isDarkMode ? "bg-slate-950/90" : "bg-white/75"
              }`}
            >
              <div className="min-w-0 flex-1">
                <h2
                  id="discover-search-sheet-title"
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Search results
                </h2>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Pick one title to open in Discover.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsSearchSheetOpen(false);
                }}
                aria-label="Close search"
                className={`ui-shell-close ${
                  isDarkMode
                    ? "bg-white/10 text-slate-200"
                    : "bg-slate-100 text-slate-700"
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
              className={`border-b border-black/5 px-5 py-4 backdrop-blur-xl ${
                isDarkMode ? "bg-slate-950/80" : "bg-white/60"
              }`}
            >
              <div className="relative">
                <p id="discover-overlay-search-hint" className="sr-only">
                  Type at least two characters. Choose a result to open it on your Discover stack.
                </p>
                <input
                  ref={overlaySearchInputRef}
                  value={searchQuery}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setSearchQuery(nextValue);

                    if (nextValue.trim().length < 2) {
                      setSearchResults([]);
                    } else {
                      setIsSearchSheetOpen(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  enterKeyHint="search"
                  placeholder="Search a movie or series"
                  aria-describedby="discover-overlay-search-hint"
                  className={`w-full rounded-[18px] border py-2.5 pl-10 pr-11 text-sm outline-none transition ${
                    isDarkMode
                      ? "border-white/10 bg-white/6 text-white placeholder:text-slate-400 backdrop-blur-md focus:border-violet-400 focus:bg-white/10"
                      : "border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 backdrop-blur-md focus:border-violet-400 focus:bg-white"
                  }`}
                />
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="ui-icon-md ui-icon-stroke"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </span>
                {searchQuery.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setIsSearchSheetOpen(false);
                    }}
                    aria-label="Clear search"
                    className={`absolute right-2 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full ${
                      isDarkMode
                        ? "bg-white/8 text-slate-300"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="ui-icon-sm ui-icon-stroke"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                ) : null}
              </div>
              {searchFetchState === "ready" && sortedSearchResults.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="ui-chip ui-chip--surface ui-chip--surface-lg font-semibold">
                    {sortedSearchResults.length} found
                  </span>
                </div>
              ) : null}
            </div>

            <div className="ui-shell-body pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              {normalizedSearchQuery.length < 2 ? (
                <SurfaceCard className="space-y-3 text-center">
                  <h3
                    className={`text-lg font-semibold ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Keep typing
                  </h3>
                  <p
                    className={`text-sm leading-6 ${
                      isDarkMode ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    Enter at least two characters to search movies and series.
                  </p>
                </SurfaceCard>
              ) : null}

              {normalizedSearchQuery.length >= 2 &&
              (searchFetchState === "loading" || searchFetchState === "idle") ? (
                <div className="space-y-3" role="status" aria-live="polite">
                  <p
                    className={`text-center text-sm font-medium ${
                      isDarkMode ? "text-slate-300" : "text-slate-600"
                    }`}
                  >
                    Searching the catalog…
                  </p>
                  <SearchResultsSkeletonList rows={5} />
                </div>
              ) : null}

              {searchFetchState === "error" ? (
                <NetworkStatusBlock
                  variant="error"
                  isDarkMode={isDarkMode}
                  title="Search couldn’t finish"
                  description={searchFetchError ?? "Try again in a moment."}
                  onRetry={() => setSearchRetryKey((count) => count + 1)}
                />
              ) : null}

              {searchFetchState === "empty" ? (
                <NetworkStatusBlock
                  variant="empty"
                  isDarkMode={isDarkMode}
                  title="No matches for that search"
                  description="Try another spelling, a shorter title, or a different keyword."
                  secondaryAction={{
                    label: "Clear search",
                    onClick: () => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setIsSearchSheetOpen(false);
                    },
                  }}
                  tertiaryAction={{
                    label: selectedGenres.length > 0 ? "Clear genre filters" : "Open genre filters",
                    onClick: () => {
                      if (selectedGenres.length > 0) {
                        applyGenreFilterChange([]);
                      }
                      setIsFilterOpen(true);
                    },
                  }}
                />
              ) : null}

              {searchFetchState === "ready" &&
              normalizedSearchQuery.length >= 2 &&
              searchResults.length > 0 &&
              sortedSearchResults.length === 0 ? (
                <NetworkStatusBlock
                  variant="empty"
                  isDarkMode={isDarkMode}
                  title="Already in your Discover queue"
                  description="Every result for this search is already on your stack. Clear the search or pick something from your queue."
                  secondaryAction={{
                    label: "Clear search",
                    onClick: () => {
                      setSearchQuery("");
                      setSearchResults([]);
                      setIsSearchSheetOpen(false);
                    },
                  }}
                  tertiaryAction={{
                    label: "Close search",
                    onClick: () => {
                      setIsSearchSheetOpen(false);
                    },
                  }}
                />
              ) : null}

              {searchFetchState === "ready" && sortedSearchResults.length > 0 ? (
                shouldVirtualizeList(sortedSearchResults.length) ? (
                  <VirtualScrollList
                    count={sortedSearchResults.length}
                    estimateItemSize={132}
                    className="max-h-[min(65vh,36rem)] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                  >
                    {(index) => (
                      <DiscoverSearchResultRow
                        result={sortedSearchResults[index]!}
                        isDarkMode={isDarkMode}
                        onSelect={handleSelectSearchMovie}
                      />
                    )}
                  </VirtualScrollList>
                ) : (
                  <div className="space-y-3">
                    {sortedSearchResults.map((result) => (
                      <DiscoverSearchResultRow
                        key={result.id}
                        result={result}
                        isDarkMode={isDarkMode}
                        onSelect={handleSelectSearchMovie}
                      />
                    ))}
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>
      </ModalPortal>

      <ModalPortal open={isFilterOpen}>
        <div
          role="presentation"
          className="ui-overlay ui-overlay--bottom z-[var(--z-sheet)] bg-slate-950/35 backdrop-blur-sm"
          onClick={() => setIsFilterOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="discover-filter-sheet-title"
            className={`ui-shell ui-shell--bottom expand-sheet w-full shadow-[0_25px_80px_rgba(15,23,42,0.18)] ${
              isDarkMode
                ? "border border-white/12 bg-slate-950/78 backdrop-blur-2xl"
                : "border border-white/70 bg-white"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div className="ui-shell-header">
              <div className="min-w-0 flex-1">
                <p
                  id="discover-filter-sheet-title"
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Filter by genre
                </p>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Pick one or more genres for this queue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                aria-label="Close filter"
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

            <div className="ui-shell-body !min-h-0 !max-h-[min(52dvh,26rem)] !overflow-y-auto !overflow-x-hidden overscroll-contain !px-2 !pb-1 !pt-3 sm:!px-4 sm:!pb-2">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {genres.map((genre) => {
                  const active =
                    genre === "All"
                      ? selectedGenres.length === 0
                      : selectedGenres.includes(genre);
                  const isAll = genre === "All";

                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => {
                        if (genre === "All") {
                          applyGenreFilterChange([]);
                          return;
                        }

                        applyGenreFilterChange(
                          selectedGenres.includes(genre)
                            ? selectedGenres.filter((entry) => entry !== genre)
                            : [...selectedGenres, genre],
                        );
                      }}
                      className={`ui-chip-btn !h-auto min-h-[2.75rem] w-full justify-center text-center text-sm leading-snug sm:min-h-[3rem] sm:text-[0.9375rem] ${
                        isAll ? "col-span-2 sm:col-span-3" : ""
                      } ${
                        active
                          ? "border border-violet-500/35 bg-violet-600 text-white shadow-sm"
                          : isDarkMode
                            ? "border border-white/10 bg-white/[0.08] text-slate-100 backdrop-blur-sm hover:bg-white/[0.12]"
                            : "border border-slate-200/90 bg-white/80 text-slate-700 shadow-sm backdrop-blur-sm hover:bg-white"
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="ui-shell-footer !pt-4">
              <button
                type="button"
                onClick={() => {
                  applyGenreFilterChange([]);
                }}
                className="ui-btn ui-btn-secondary min-w-0 flex-1"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="ui-btn ui-btn-primary min-w-0 flex-1"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {lastSwipe ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-4 z-[var(--z-banner)] flex justify-center px-3 pt-[max(0.25rem,env(safe-area-inset-top,0px))] sm:px-4"
          role="status"
          aria-live="polite"
        >
          <div
            className={`app-notify-banner pointer-events-auto relative w-full max-w-[min(100%,20rem)] overflow-hidden rounded-2xl border px-3 py-2.5 backdrop-blur-xl sm:max-w-md sm:rounded-[24px] sm:px-3.5 sm:py-3 ${
              isDarkMode
                ? "border-white/12 bg-slate-950/92 text-slate-100 shadow-[0_12px_36px_rgba(0,0,0,0.42)]"
                : "border-slate-200/85 bg-white/95 text-slate-900 shadow-[0_10px_32px_rgba(124,58,237,0.1)]"
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[1.05rem] leading-none shadow-[0_2px_10px_rgba(109,40,217,0.22)] sm:h-10 sm:w-10 sm:text-lg ${
                  isDarkMode ? "bg-violet-500 text-white" : "bg-violet-600 text-white"
                }`}
                aria-hidden
              >
                {lastSwipe.decision === "accepted" ? "★" : "↩"}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[9px] font-semibold uppercase tracking-[0.18em] ${
                    isDarkMode ? "text-violet-300/95" : "text-violet-600"
                  }`}
                >
                  Swipe recorded
                </p>
                <p
                  className={`mt-0.5 text-sm font-semibold leading-tight sm:text-[0.95rem] ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  {lastSwipe.decision === "accepted" ? "Saved to picks" : "Skipped for now"}
                </p>
                <p
                  className={`mt-0.5 line-clamp-2 text-[11px] leading-snug sm:text-xs ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                  title={lastSwipe.movie.title}
                >
                  {lastSwipe.movie.title}
                </p>
              </div>
              <button
                type="button"
                onClick={handleUndoSwipe}
                aria-label="Undo last swipe"
                className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold leading-none tracking-wide sm:min-h-8 sm:px-2.5 sm:text-[10px] ${
                  isDarkMode ? "bg-white/10 text-slate-200 hover:bg-white/14" : "bg-slate-100 text-slate-600 hover:bg-slate-200/90"
                }`}
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`discover2-swipe-viewport relative z-0 flex min-h-0 flex-1 flex-col items-stretch justify-stretch overflow-x-clip overflow-y-visible px-0.5 pt-1.5 pb-1 sm:px-0.5 sm:pt-2 sm:pb-1.5 ${
          isDarkMode
            ? "discover-card-viewport border-t border-white/12"
            : "mt-0.5 rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-b from-slate-100/90 to-white shadow-[0_1px_0_rgba(15,23,42,0.06)]"
        }`}
      >
        {movie ? (
          /* Fills space between header and bottom nav; width follows app column (max-w-md). */
          <div
            className={`discover2-main-card flex h-full min-h-0 w-full min-w-0 max-w-md flex-1 flex-col self-stretch overflow-hidden rounded-[28px] sm:rounded-[32px] ring-1 ${
              isDarkMode
                ? "ring-white/10 shadow-[0_20px_55px_rgba(0,0,0,0.5)]"
                : "ring-slate-200/90 shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
            }`}
          >
            <div
              className={`discover-card-stage flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-visible ${
                transitionState === "idle"
                  ? ""
                  : transitionState === "out"
                    ? transitionDirection === "next"
                      ? "discover-card-out-left"
                      : "discover-card-out-right"
                    : transitionDirection === "next"
                      ? "discover-card-in-right"
                      : "discover-card-in-left"
              }`}
            >
              <MovieSwipeCard
                key={movie.id}
                movie={movie}
                onAccept={onSwipeAccept}
                onReject={onSwipeReject}
                onPrevious={onCardPrevious}
                onNext={onCardNext}
                canGoPrevious={focusedMovieId ? filteredQueue.length > 0 : safeBrowseIndex > 0}
                canGoNext={
                  focusedMovieId
                    ? filteredQueue.length > 0
                    : safeBrowseIndex < filteredQueue.length - 1
                }
                isInteractionLocked={transitionState !== "idle" || Boolean(swipeFeedback)}
                swipeFeedback={swipeFeedback}
                suppressTrailerPlayButton={!isOnboardingComplete}
                onMatchPercentClick={currentUserId ? openMatchExplanation : undefined}
                posterLayout="immersive"
              />
            </div>
          </div>
        ) : filteredQueue.length === 0 && discoverQueue.length > 0 ? (
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-2 py-4">
            <AppRouteNetworkStatus
              compact
              variant="empty"
              isDarkMode={isDarkMode}
              title="No titles match these filters"
              description="Try clearing genres or adjust the filter sheet."
              secondaryAction={{
                label: "Clear genres",
                onClick: () => {
                  applyGenreFilterChange([]);
                },
              }}
              tertiaryAction={{
                label: "Filters",
                onClick: () => setIsFilterOpen(true),
              }}
            />
          </div>
        ) : (
          <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-2 py-4">
            <AppRouteNetworkStatus
              compact
              variant="empty"
              isDarkMode={isDarkMode}
              title="You’re caught up for now"
              description="Open Picks or Shared to keep exploring."
              secondaryAction={{
                label: "Picks",
                onClick: () => {
                  router.push("/picks");
                },
              }}
              tertiaryAction={{
                label: "Shared",
                onClick: () => {
                  router.push("/shared");
                },
              }}
            />
          </div>
        )}
      </div>

      {matchExplanation ? (
        <DiscoverMatchExplainModal
          explanation={matchExplanation}
          isDarkMode={isDarkMode}
          onClose={() => setMatchExplanation(null)}
        />
      ) : null}
    </div>
  );
}

