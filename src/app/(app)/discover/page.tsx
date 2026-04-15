"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MovieSwipeCard } from "@/components/movie-swipe-card";
import { SurfaceCard } from "@/components/surface-card";
import { Movie } from "@/lib/types";
import { useAppState } from "@/lib/app-state";

type DiscoverPageContentProps = {
  currentUserId: string | null;
  discoverQueue: Movie[];
  registerMovies: (movies: Movie[]) => void;
  swipeMovie: (movieId: string, decision: "accepted" | "rejected") => Promise<void>;
  isDarkMode: boolean;
};

function DiscoverPageContent({
  currentUserId,
  discoverQueue,
  registerMovies,
  swipeMovie,
  isDarkMode,
}: DiscoverPageContentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false);
  const [focusedMovieId, setFocusedMovieId] = useState<string | null>(null);
  const [browseIndex, setBrowseIndex] = useState(0);
  const [transitionState, setTransitionState] = useState<"idle" | "out" | "in">("idle");
  const [transitionDirection, setTransitionDirection] = useState<"next" | "previous">("next");
  const transitionTimeoutRef = useRef<number | null>(null);
  const overlaySearchInputRef = useRef<HTMLInputElement | null>(null);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const isSearchOpen = isSearchSheetOpen;
  const visibleDiscoverIds = useMemo(
    () => new Set(discoverQueue.map((movie) => movie.id)),
    [discoverQueue],
  );

  useEffect(() => {
    if (normalizedSearchQuery.length < 2) {
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
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

        if (!response.ok || !active) {
          return;
        }

        const payload = (await response.json()) as { movies?: Movie[] };
        registerMovies(payload.movies ?? []);
        setSearchResults(payload.movies ?? []);
      } catch {
        if (active) {
          setSearchResults([]);
        }
      }
    }, 280);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [currentUserId, normalizedSearchQuery, registerMovies, searchQuery]);

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
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

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

  return (
    <div className="flex min-h-full flex-col gap-3 overflow-hidden">
      {!isSearchOpen ? (
      <div className="space-y-2">
        <div
          className={`rounded-[24px] border px-3 py-3 backdrop-blur-xl ${
            isDarkMode
              ? "border-white/10 bg-slate-950/66"
              : "border-white/70 bg-white/78 shadow-[0_16px_34px_rgba(124,58,237,0.08)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
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
                className={`w-full rounded-[18px] border py-3 pl-10 pr-4 text-sm outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-white/6 text-white placeholder:text-slate-400 backdrop-blur-md focus:border-violet-400 focus:bg-white/10"
                    : "border-slate-200 bg-white/72 text-slate-900 placeholder:text-slate-400 backdrop-blur-md focus:border-violet-400 focus:bg-white/88"
                }`}
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
                  className={`absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full ${
                    isDarkMode
                      ? "bg-white/8 text-slate-300"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
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
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border transition ${
                isDarkMode
                  ? "border-white/10 bg-white/6 text-white backdrop-blur-md hover:bg-white/12"
                  : "border-slate-200 bg-white/72 text-slate-700 backdrop-blur-md hover:bg-slate-50/90"
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
                <span
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${
                    isDarkMode
                      ? "bg-white/8 text-slate-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {sortedSearchResults.length} found
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      ) : null}

      {isSearchOpen ? (
        <div
          className={`fixed inset-0 z-[120] px-4 pb-4 pt-3 backdrop-blur-2xl ${
            isDarkMode ? "bg-slate-950/88" : "bg-slate-950/48"
          }`}
        >
          <div
            className={`mx-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-[30px] border ${
              isDarkMode
                ? "border-white/10 bg-slate-950"
                : "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,242,255,0.92))]"
            }`}
          >
            <div className="sticky top-0 z-10 border-b border-black/5 px-4 py-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2
                    className={`text-lg font-semibold ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Search results
                  </h2>
                  <p
                    className={`text-sm ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
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
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${
                    isDarkMode
                      ? "bg-white/8 text-slate-200"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Close
                </button>
              </div>
              <div className="relative mt-4">
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
                  className={`w-full rounded-[18px] border py-3 pl-10 pr-11 text-sm outline-none transition ${
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
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
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
                    className={`absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full ${
                      isDarkMode
                        ? "bg-white/8 text-slate-300"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                ) : null}
              </div>
              {normalizedSearchQuery.length > 0 && sortedSearchResults.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-2 text-xs font-semibold ${
                      isDarkMode
                        ? "bg-white/8 text-slate-200"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {sortedSearchResults.length} found
                  </span>
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {sortedSearchResults.length > 0 ? (
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
                        <div className="flex items-center gap-2">
                          <h3
                            className={`truncate text-sm font-semibold ${
                              isDarkMode ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {result.title}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                              isDarkMode
                                ? "bg-white/8 text-slate-300"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
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
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                            {result.rating.toFixed(1)}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              isDarkMode
                                ? "bg-white/8 text-slate-300"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {result.runtime}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <SurfaceCard className="space-y-3 text-center">
                  <h3
                    className={`text-lg font-semibold ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    No results yet
                  </h3>
                  <p
                    className={`text-sm leading-6 ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Try another title and I’ll bring matching movies or series here.
                  </p>
                </SurfaceCard>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isFilterOpen ? (
        <div className="fixed inset-0 z-40 flex items-end bg-slate-950/35 px-4 pb-4 pt-12 backdrop-blur-sm">
          <div
            className={`expand-soft mx-auto w-full max-w-md rounded-[32px] p-5 shadow-[0_25px_80px_rgba(15,23,42,0.18)] ${
              isDarkMode
                ? "border border-white/10 bg-slate-950"
                : "border border-white/70 bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  className={`text-lg font-semibold ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Filter by genre
                </p>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  Pick one or more genres for this queue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  isDarkMode
                    ? "bg-white/8 text-slate-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex max-h-[55vh] flex-wrap gap-2 overflow-y-auto">
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
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
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
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setBrowseIndex(0);
                  setFocusedMovieId(null);
                  setSelectedGenres([]);
                }}
                className={`flex-1 rounded-[20px] px-4 py-3 text-sm font-semibold ${
                  isDarkMode
                    ? "bg-white/8 text-slate-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex-1 rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        {movie ? (
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
            }`}
          >
            <MovieSwipeCard
              key={movie.id}
              movie={movie}
              onAccept={async () => {
                setFocusedMovieId(null);
                setBrowseIndex((current) =>
                  filteredQueue.length <= 1
                    ? 0
                    : Math.min(current, filteredQueue.length - 2),
                );
                registerMovies([movie]);
                await swipeMovie(movie.id, "accepted");
              }}
              onReject={async () => {
                setFocusedMovieId(null);
                setBrowseIndex((current) =>
                  filteredQueue.length <= 1
                    ? 0
                    : Math.min(current, filteredQueue.length - 2),
                );
                registerMovies([movie]);
                await swipeMovie(movie.id, "rejected");
              }}
              onPrevious={() => navigateCard("previous")}
              onNext={() => navigateCard("next")}
              canGoPrevious={focusedMovieId ? filteredQueue.length > 0 : safeBrowseIndex > 0}
              canGoNext={
                focusedMovieId
                  ? filteredQueue.length > 0
                  : safeBrowseIndex < filteredQueue.length - 1
              }
              isInteractionLocked={transitionState !== "idle"}
            />
          </div>
        ) : filteredQueue.length === 0 && discoverQueue.length > 0 ? (
          <SurfaceCard className="space-y-4 text-center">
          <div className="space-y-2">
            <h2
              className={`text-xl font-semibold ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              No titles match this search
            </h2>
            <p
              className={`text-sm leading-6 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Try another title or switch the genre filter back to all genres.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedGenres([]);
            }}
            className="w-full rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Clear filters
          </button>
          </SurfaceCard>
        ) : (
          <SurfaceCard className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-lg font-semibold text-violet-700">
            8
          </div>
          <div className="space-y-2">
            <h2
              className={`text-xl font-semibold ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              You’ve gone through every title for now.
            </h2>
            <p
              className={`text-sm leading-6 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Jump into your saved picks or head to shared lists to see what
              overlaps with people you’re linked with.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/picks"
              className="rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
            >
              View picks
            </Link>
            <Link
              href="/shared"
              className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Shared list
            </Link>
          </div>
          </SurfaceCard>
        )}
      </div>
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
    isDarkMode,
  } = useAppState();

  return (
    <DiscoverPageContent
      key={`${currentUserId ?? "guest"}-${discoverSessionKey}`}
      currentUserId={currentUserId}
      discoverQueue={discoverQueue}
      registerMovies={registerMovies}
      swipeMovie={swipeMovie}
      isDarkMode={isDarkMode}
    />
  );
}
