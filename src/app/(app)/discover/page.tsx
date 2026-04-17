"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DiscoverOnboardingNudges } from "@/components/discover-onboarding-nudges";
import { MovieSwipeCard } from "@/components/movie-swipe-card";
import { NetworkStatusBlock } from "@/components/network-status-block";
import { SurfaceCard } from "@/components/surface-card";
import { DiscoverCardSkeleton, SearchResultsSkeletonList } from "@/components/ui-skeleton";
import {
  loadDiscoverSession,
  saveDiscoverSession,
  type DiscoverSessionSnapshotV1,
} from "@/lib/discover-session";
import { useEscapeToClose } from "@/lib/use-escape-to-close";
import { Movie } from "@/lib/types";
import { useAppState } from "@/lib/app-state";

type DiscoverPageContentProps = {
  currentUserId: string | null;
  discoverQueue: Movie[];
  discoverSessionKey: string;
  registerMovies: (movies: Movie[]) => void;
  swipeMovie: (movieId: string, decision: "accepted" | "rejected") => Promise<void>;
  undoSwipe: (movieId: string) => Promise<void>;
  isDarkMode: boolean;
  toggleDarkMode: () => Promise<void>;
  pasteInviteLinkFromClipboard: () => Promise<{ ok: boolean; message: string }>;
};

type LastSwipeRecord = {
  movie: Movie;
  decision: "accepted" | "rejected";
  browseIndex: number;
  focusedMovieId: string | null;
};

function DiscoverPageContent({
  currentUserId,
  discoverQueue,
  discoverSessionKey,
  registerMovies,
  swipeMovie,
  undoSwipe,
  isDarkMode,
  toggleDarkMode,
  pasteInviteLinkFromClipboard,
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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
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
  const transitionTimeoutRef = useRef<number | null>(null);
  const swipeTimeoutRef = useRef<number | null>(null);
  const undoToastTimeoutRef = useRef<number | null>(null);
  const discoverSessionSaveTimerRef = useRef<number | null>(null);
  const overlaySearchInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const isSearchOpen = isSearchSheetOpen;
  const sharedMovieId = searchParams.get("movieId");
  const undoTipStorageKey = `cinematch-discover-nudge-undo-${currentUserId ?? "guest"}`;
  const [undoTipDismissed, setUndoTipDismissed] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(undoTipStorageKey) === "1";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setUndoTipDismissed(window.localStorage.getItem(undoTipStorageKey) === "1");
  }, [undoTipStorageKey]);

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
      setFocusedMovieId(existingMovie.id);
      setIsSearchSheetOpen(false);
      setSharedMovieFetch("idle");
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
        setFocusedMovieId(payload.movie.id);
        setIsSearchSheetOpen(false);
        setSharedMovieFetch("idle");
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
    (focusedMovieId
      ? filteredQueue.find((entry) => entry.id === focusedMovieId) ??
        searchResults.find((entry) => entry.id === focusedMovieId)
      : null) ?? null;
  const movie = focusedMovie ?? filteredQueue[safeBrowseIndex];

  useEffect(() => {
    setBrowseIndex(0);
    setFocusedMovieId(null);
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
      setFocusedMovieId(null);
    }
  }, [discoverQueue, focusedMovieId]);

  useEffect(() => {
    if (filteredQueue.length === 0) {
      return;
    }

    setBrowseIndex((current) => {
      const maxIndex = filteredQueue.length - 1;
      return current > maxIndex ? maxIndex : current;
    });
  }, [filteredQueue.length]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (discoverSessionSaveTimerRef.current) {
      window.clearTimeout(discoverSessionSaveTimerRef.current);
    }

    discoverSessionSaveTimerRef.current = window.setTimeout(() => {
      const payload: DiscoverSessionSnapshotV1 = {
        v: 1,
        searchQuery,
        selectedGenres,
        browseIndex,
        focusedMovieId,
        isSearchSheetOpen,
      };
      saveDiscoverSession(currentUserId, payload);
    }, 450);

    return () => {
      if (discoverSessionSaveTimerRef.current) {
        window.clearTimeout(discoverSessionSaveTimerRef.current);
      }
    };
  }, [
    browseIndex,
    currentUserId,
    focusedMovieId,
    isSearchSheetOpen,
    searchQuery,
    selectedGenres,
  ]);

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

      if (!menuRef.current?.contains(targetNode)) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
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

  const navigateCard = (direction: "next" | "previous") => {
    if (transitionState !== "idle") {
      return;
    }

    if (focusedMovieId) {
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
  };

  const handleSelectSearchMovie = (selectedMovie: Movie) => {
    registerMovies([selectedMovie]);
    setFocusedMovieId(selectedMovie.id);
    const movieIndex = discoverQueue.findIndex((entry) => entry.id === selectedMovie.id);

    if (movieIndex >= 0) {
      setBrowseIndex(movieIndex);
    }

    setSelectedGenres([]);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearchSheetOpen(false);
  };

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

  const handleSwipe = (decision: "accepted" | "rejected") => {
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

    swipeTimeoutRef.current = window.setTimeout(async () => {
      setBrowseIndex(nextBrowseIndex);
      registerMovies([swipedMovie]);
      setSwipeFeedback(null);
      await swipeMovie(swipedMovie.id, decision);
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
    }, 230);
  };

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

  const handlePasteInviteLink = async () => {
    setIsMoreMenuOpen(false);

    const runPaste = async () => {
      const result = await pasteInviteLinkFromClipboard();
      const showRetry = !result.ok;
      setMenuBanner({
        message: result.message,
        variant: result.ok ? "success" : "error",
        onRetry: showRetry ? () => void runPaste() : undefined,
      });
      const dismissMs = showRetry ? 9000 : 3600;
      window.setTimeout(() => {
        setMenuBanner((current) =>
          current?.message === result.message ? null : current,
        );
      }, dismissMs);
    };

    void runPaste();
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-visible">
      {sharedMovieId && sharedMovieFetch === "loading" ? (
        <div className="space-y-3" role="status" aria-live="polite">
          <p
            className={`text-center text-sm font-medium ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Opening shared title…
          </p>
          <DiscoverCardSkeleton />
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
        <div className="flex items-center justify-between px-1 pb-1 pt-0.5">
          <h1
            className={`text-[1.45rem] font-semibold tracking-[-0.03em] ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            CineMatch
          </h1>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-label="Open more options"
              aria-expanded={isMoreMenuOpen}
              onClick={() => setIsMoreMenuOpen((current) => !current)}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-full transition ${
                isDarkMode
                  ? "text-slate-300 hover:bg-white/8"
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
            {isMoreMenuOpen ? (
              <div
                className="ui-menu-panel absolute right-0 top-12 z-[var(--z-popover)] w-56 p-2"
              >
                <Link
                  href="/settings"
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="ui-menu-item block px-3 py-2.5 font-medium"
                >
                  Settings
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="ui-menu-item block px-3 py-2.5 font-medium"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={() => void handlePasteInviteLink()}
                  className="ui-menu-item mt-1 block w-full px-3 py-2.5 text-left font-medium"
                >
                  Paste Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void toggleDarkMode();
                    setIsMoreMenuOpen(false);
                  }}
                  className="ui-menu-item mt-1 flex w-full items-center justify-between px-3 py-2.5 text-left font-medium"
                >
                  <span>Dark mode</span>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                      isDarkMode
                        ? "bg-violet-500/24 text-violet-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {isDarkMode ? "On" : "Off"}
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {menuBanner ? (
        <div
          className={`fixed inset-x-0 top-4 z-[var(--z-banner)] flex justify-center px-4 ${
            menuBanner.onRetry ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="flex max-w-md flex-col items-center gap-2">
            <div
              className={`ui-toast-note px-4 py-2 text-center font-semibold ${
                menuBanner.variant === "error"
                  ? isDarkMode
                    ? "border border-rose-400/30 text-rose-100 shadow-[0_10px_32px_rgba(244,63,94,0.12)]"
                    : "border border-rose-200/80 text-rose-800 shadow-[0_10px_32px_rgba(244,63,94,0.08)]"
                  : menuBanner.variant === "success"
                    ? isDarkMode
                      ? "border border-emerald-400/32 text-emerald-50 shadow-[0_10px_32px_rgba(16,185,129,0.14)]"
                      : "border border-emerald-200/90 text-emerald-900 shadow-[0_10px_32px_rgba(16,185,129,0.1)]"
                    : isDarkMode
                      ? "border border-white/12 text-slate-100"
                      : "border border-slate-200/85 text-slate-800"
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

      {!isSearchOpen ? (
      <>
        <DiscoverOnboardingNudges
          userId={currentUserId}
          isDarkMode={isDarkMode}
          hasActiveBrowse={Boolean(movie)}
        />
        <div
          className="ui-glass-panel px-3 py-2.5 max-[380px]:px-2.5"
        >
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="relative min-w-0 flex-1">
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
                placeholder="Search a movie or series"
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
              className="ui-icon-button relative flex min-h-11 min-w-11 shrink-0 items-center justify-center hover:bg-white/12"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="ui-icon-md ui-icon-stroke"
              aria-hidden="true"
            >
              <path d="M4 6h16" />
              <path d="M7 12h10" />
              <path d="M10 18h4" />
            </svg>
              {selectedGenres.length > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-semibold text-white">
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
      </>
      ) : null}

      {isSearchOpen ? (
        <div
          className={`ui-overlay ui-overlay--fill z-[var(--z-overlay)] backdrop-blur-2xl ${
            isDarkMode ? "bg-slate-950/88" : "bg-slate-950/48"
          }`}
        >
          <div
            className={`ui-shell ui-shell--fullscreen ui-shell--dialog-md mx-auto flex flex-col overflow-hidden border ${
              isDarkMode
                ? "border-white/10 bg-slate-950"
                : "border-slate-200/80 bg-white"
            }`}
          >
            <div
              className={`ui-shell-header !border-b-black/5 backdrop-blur-xl !pt-[max(1rem,env(safe-area-inset-top,0px))] ${
                isDarkMode ? "bg-slate-950/90" : "bg-white/75"
              }`}
            >
              <div className="min-w-0 flex-1">
                <h2
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
                  placeholder="Search a movie or series"
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
                        setSelectedGenres([]);
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
                <div className="space-y-3">
                  {sortedSearchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectSearchMovie(result)}
                      className={`flex w-full items-start gap-3 rounded-[24px] border px-4 py-4 text-left ${
                        isDarkMode
                          ? "border-white/10 bg-white/6"
                          : "border-white/80 bg-white/80 shadow-[0_14px_34px_rgba(148,163,184,0.08)]"
                      }`}
                    >
                      <div
                        className="flex h-16 w-14 shrink-0 items-end rounded-[16px] p-2 text-white"
                        style={{
                          backgroundImage: result.poster.imageUrl
                            ? `linear-gradient(145deg, rgba(30, 20, 50, 0.3), rgba(20, 16, 30, 0.76)), url(${result.poster.imageUrl})`
                            : `linear-gradient(145deg, ${result.poster.accentFrom}, ${result.poster.accentTo})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
                          {result.mediaType === "series" ? "Series" : "Movie"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                          <h3
                            className={`min-w-0 text-sm font-semibold sm:flex-1 sm:truncate ${
                              isDarkMode ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {result.title}
                          </h3>
                          <span className="ui-chip ui-chip--surface w-fit shrink-0">
                            {result.year}
                          </span>
                        </div>
                        <p
                          className={`mt-1 line-clamp-2 text-sm leading-6 ${
                            isDarkMode ? "text-slate-300" : "text-slate-600"
                          }`}
                        >
                          {result.description}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-[var(--rhythm-stack)]">
                          <span className="ui-chip ui-chip--accent">
                            {result.rating.toFixed(1)}
                          </span>
                          <span className="ui-chip ui-chip--surface">
                            {result.runtime}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isFilterOpen ? (
        <div className="ui-overlay ui-overlay--bottom z-[var(--z-sheet)] bg-slate-950/35 backdrop-blur-sm">
          <div
            className={`ui-shell ui-shell--bottom expand-soft w-full shadow-[0_25px_80px_rgba(15,23,42,0.18)] ${
              isDarkMode
                ? "border border-white/10 bg-slate-950"
                : "border border-white/70 bg-white"
            }`}
          >
            <div className="ui-shell-header">
              <div className="min-w-0 flex-1">
                <p
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

            <div className="ui-shell-body flex flex-wrap content-start gap-2 !pt-3">
              {genres.map((genre) => {
                const active =
                  genre === "All"
                    ? selectedGenres.length === 0
                    : selectedGenres.includes(genre);

                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      if (genre === "All") {
                        setBrowseIndex(0);
                        setFocusedMovieId(null);
                        setSelectedGenres([]);
                        return;
                      }

                      setBrowseIndex(0);
                      setFocusedMovieId(null);
                      setSelectedGenres((current) =>
                        current.includes(genre)
                          ? current.filter((entry) => entry !== genre)
                          : [...current, genre],
                      );
                    }}
                    className={`ui-chip-btn max-[380px]:px-3 max-[380px]:py-1.5 max-[380px]:text-xs ${
                      active
                        ? "bg-violet-600 text-white"
                        : isDarkMode
                          ? "bg-white/8 text-slate-200"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
            <div className="ui-shell-footer !pt-4">
              <button
                type="button"
                onClick={() => {
                  setBrowseIndex(0);
                  setFocusedMovieId(null);
                  setSelectedGenres([]);
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
      ) : null}

      <div className="min-h-0 flex-1 overflow-visible pt-1 pb-2">
        {movie ? (
          <div className="flex h-full flex-col overflow-visible rounded-[30px]">
            <div
              className={`discover-card-stage ${
                transitionState === "idle"
                  ? ""
                  : transitionState === "out"
                    ? transitionDirection === "next"
                      ? "discover-card-out-left"
                      : "discover-card-out-right"
                    : transitionDirection === "next"
                      ? "discover-card-in-right"
                      : "discover-card-in-left"
              } h-full overflow-visible`}
            >
              <MovieSwipeCard
                key={movie.id}
                movie={movie}
                onAccept={() => handleSwipe("accepted")}
                onReject={() => handleSwipe("rejected")}
                onPrevious={() => navigateCard("previous")}
                onNext={() => navigateCard("next")}
                canGoPrevious={focusedMovieId ? filteredQueue.length > 0 : safeBrowseIndex > 0}
                canGoNext={
                  focusedMovieId
                    ? filteredQueue.length > 0
                    : safeBrowseIndex < filteredQueue.length - 1
                }
                isInteractionLocked={transitionState !== "idle" || Boolean(swipeFeedback)}
                swipeFeedback={swipeFeedback}
              />
            </div>
          </div>
        ) : filteredQueue.length === 0 && discoverQueue.length > 0 ? (
          <NetworkStatusBlock
            variant="empty"
            isDarkMode={isDarkMode}
            title="No titles match these filters"
            description="Broaden or clear your genre picks, or open the filter sheet to choose different genres."
            secondaryAction={{
              label: "Clear genres",
              onClick: () => {
                setBrowseIndex(0);
                setFocusedMovieId(null);
                setSelectedGenres([]);
              },
            }}
            tertiaryAction={{
              label: "Adjust filters",
              onClick: () => setIsFilterOpen(true),
            }}
          />
        ) : (
          <NetworkStatusBlock
            variant="empty"
            isDarkMode={isDarkMode}
            title="You’ve gone through every title for now"
            description="Jump into your saved picks or shared lists to see what overlaps with people you’re linked with."
            secondaryAction={{
              label: "View picks",
              onClick: () => {
                router.push("/picks");
              },
            }}
            tertiaryAction={{
              label: "Shared list",
              onClick: () => {
                router.push("/shared");
              },
            }}
          />
        )}
      </div>

      {lastSwipe ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[var(--z-toast-anchor)] flex justify-center px-4 sm:bottom-6">
          <div
            className={`discover-undo-toast pointer-events-auto flex w-full max-w-md flex-wrap items-center gap-2 rounded-[26px] border px-3 py-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl max-[380px]:max-w-[calc(100vw-0.75rem)] max-[380px]:gap-2 sm:gap-3 sm:px-4 ${
              isDarkMode
                ? "border-white/10 bg-slate-950/92"
                : "border-white/80 bg-white/94"
            }`}
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                lastSwipe.decision === "accepted"
                  ? "bg-violet-600 text-white"
                  : isDarkMode
                    ? "bg-white/10 text-slate-200"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {lastSwipe.decision === "accepted" ? "✓" : "×"}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`truncate text-sm font-semibold ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {lastSwipe.movie.title}
              </p>
              <p
                className={`text-xs ${
                  isDarkMode ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {lastSwipe.decision === "accepted"
                  ? "Added to your picks."
                  : "Removed from Discover for now."}
              </p>
            </div>
            <button
              type="button"
              onClick={handleUndoSwipe}
              className="ui-btn ui-btn-primary shrink-0 rounded-full px-3 py-2 text-xs max-[380px]:mt-0.5 max-[380px]:w-full max-[380px]:basis-full max-[380px]:justify-center sm:mt-0 sm:w-auto sm:basis-auto"
            >
              Undo
            </button>
            {!undoTipDismissed ? (
              <div className="flex w-full basis-full flex-col gap-2 border-t border-black/8 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p
                  className={`min-w-0 text-[11px] leading-snug sm:flex-1 ${
                    isDarkMode ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  You can undo a swipe for a few seconds with{" "}
                  <span className="font-semibold text-inherit">Undo</span> here.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem(undoTipStorageKey, "1");
                    }
                    setUndoTipDismissed(true);
                  }}
                  className={`ui-btn ui-btn-ghost shrink-0 self-end text-xs sm:self-auto ${
                    isDarkMode ? "text-violet-200" : "text-violet-700"
                  }`}
                >
                  Got it
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DiscoverPage() {
  const {
    currentUserId,
    discoverQueue,
    discoverSessionKey,
    registerMovies,
    swipeMovie,
    undoSwipe,
    isDarkMode,
    updateSettings,
    acceptInviteToken,
  } = useAppState();

  const toggleDarkMode = async () => {
    await updateSettings({ darkMode: !isDarkMode });
  };

  const pasteInviteLinkFromClipboard = async () => {
    if (typeof window === "undefined" || !navigator.clipboard?.readText) {
      return {
        ok: false,
        message: "Clipboard access is not available on this device.",
      };
    }

    try {
      const clipboardText = (await navigator.clipboard.readText()).trim();
      if (!clipboardText) {
        return { ok: false, message: "Clipboard is empty." };
      }

      const extractToken = () => {
        if (clipboardText.startsWith("invite-")) {
          return clipboardText;
        }

        try {
          const parsed = new URL(clipboardText);
          const inviteToken = parsed.searchParams.get("invite");
          return inviteToken?.trim() || null;
        } catch {
          return null;
        }
      };

      const token = extractToken();
      if (!token) {
        return {
          ok: false,
          message: "Clipboard text is not a valid CineMatch invite link.",
        };
      }

      const result = await acceptInviteToken(token);
      return {
        ok: result.ok,
        message: result.ok
          ? `Connected with ${result.partnerName ?? "your match"}.`
          : result.message,
      };
    } catch {
      return {
        ok: false,
        message: "Clipboard permission was denied.",
      };
    }
  };

  return (
    <DiscoverPageContent
      key={currentUserId ?? "guest"}
      currentUserId={currentUserId}
      discoverQueue={discoverQueue}
      discoverSessionKey={discoverSessionKey}
      registerMovies={registerMovies}
      swipeMovie={swipeMovie}
      undoSwipe={undoSwipe}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
      pasteInviteLinkFromClipboard={pasteInviteLinkFromClipboard}
    />
  );
}
