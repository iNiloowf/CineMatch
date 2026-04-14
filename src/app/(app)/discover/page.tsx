"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MovieSwipeCard } from "@/components/movie-swipe-card";
import { SurfaceCard } from "@/components/surface-card";
import { Movie } from "@/lib/types";
import { useAppState } from "@/lib/app-state";

export default function DiscoverPage() {
  const { currentUserId, discoverQueue, registerMovies, swipeMovie, isDarkMode } =
    useAppState();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const searchableMovies = useMemo(() => {
    if (normalizedSearchQuery.length < 2) {
      return discoverQueue;
    }

    return [
      ...searchResults,
      ...discoverQueue.filter(
        (movie) => !searchResults.some((entry) => entry.id === movie.id),
      ),
    ];
  }, [discoverQueue, normalizedSearchQuery, searchResults]);

  useEffect(() => {
    if (normalizedSearchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
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
      } finally {
        if (active) {
          setIsSearching(false);
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
        new Set(searchableMovies.flatMap((movie) => movie.genre)),
      ).sort((left, right) => left.localeCompare(right)),
    ];
  }, [searchableMovies]);

  const filteredQueue = useMemo(() => {
    const matchingMovies = searchableMovies.filter((movie) => {
      const matchesQuery =
        normalizedSearchQuery.length === 0 ||
        movie.title.toLowerCase().includes(normalizedSearchQuery) ||
        movie.description.toLowerCase().includes(normalizedSearchQuery) ||
        movie.genre.some((entry) =>
          entry.toLowerCase().includes(normalizedSearchQuery),
        ) ||
        String(movie.year).includes(normalizedSearchQuery);

      const matchesGenre =
        selectedGenre === "All" || movie.genre.includes(selectedGenre);

      return matchesQuery && matchesGenre;
    });

    if (normalizedSearchQuery.length === 0) {
      return matchingMovies;
    }

    return [...matchingMovies].sort((left, right) => {
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
  }, [normalizedSearchQuery, searchableMovies, selectedGenre]);

  const movie = filteredQueue[0];
  const hasFilters = selectedGenre !== "All" || searchQuery.trim().length > 0;
  const previewResults = filteredQueue.slice(0, 5);

  return (
    <div className="space-y-4">
      <SurfaceCard className="space-y-4 overflow-hidden p-0">
        <div
          className={`px-5 pb-4 pt-5 ${
            isDarkMode
              ? "bg-[linear-gradient(135deg,rgba(139,92,246,0.22),rgba(15,23,42,0.08))]"
              : "bg-[linear-gradient(135deg,rgba(245,243,255,0.95),rgba(255,255,255,0.88))]"
          }`}
        >
          <div className="space-y-1">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                isDarkMode ? "text-violet-200/80" : "text-violet-500"
              }`}
            >
              Movie matching
            </p>
            <h1
              className={`text-2xl font-semibold tracking-tight ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Discover
            </h1>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              aria-label="Open genre filter"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-violet-600 text-white shadow-[0_14px_24px_rgba(124,58,237,0.25)] transition hover:bg-violet-500"
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
            </button>

            <div className="relative flex-1">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title or description"
                className={`w-full rounded-[22px] border px-4 py-3 pr-11 text-sm outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-white/8 text-white placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/10"
                    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-violet-400"
                }`}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
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
            </div>
          </div>
        </div>

        <div className="space-y-3 px-5 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                isDarkMode
                  ? "bg-white/8 text-slate-200"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {selectedGenre === "All" ? "All genres" : selectedGenre}
            </span>
            {searchQuery.trim().length > 0 ? (
              <span
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  isDarkMode
                    ? "bg-violet-500/15 text-violet-100"
                    : "bg-violet-100 text-violet-700"
                }`}
              >
                Search: {searchQuery.trim()}
              </span>
            ) : null}
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedGenre("All");
                }}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  isDarkMode
                    ? "bg-white/8 text-slate-200 hover:bg-white/12"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Clear
              </button>
            ) : null}
          </div>

          <p
            className={`text-sm leading-6 ${
              isDarkMode ? "text-slate-300" : "text-slate-500"
            }`}
          >
            Browse one movie at a time, keep what feels right, and skip the
            rest.
          </p>

          {normalizedSearchQuery.length > 0 ? (
            <div
              className={`rounded-[22px] border px-4 py-3 ${
                isDarkMode
                  ? "border-white/10 bg-white/6"
                  : "border-slate-200 bg-slate-50/90"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  className={`text-sm font-semibold ${
                    isDarkMode ? "text-white" : "text-slate-900"
                  }`}
                >
                  Search results
                </p>
                <p
                  className={`text-xs font-medium ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {isSearching
                    ? "Searching..."
                    : `${filteredQueue.length} match${
                        filteredQueue.length === 1 ? "" : "es"
                      }`}
                </p>
              </div>

              {previewResults.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {previewResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => setSearchQuery(result.title)}
                      className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                        movie?.id === result.id
                          ? "bg-violet-600 text-white"
                          : isDarkMode
                            ? "bg-white/8 text-slate-200 hover:bg-white/12"
                            : "bg-white text-slate-700 shadow-sm hover:bg-slate-100"
                      }`}
                    >
                      {result.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </SurfaceCard>

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
                  Choose one genre to narrow the movie list.
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
                const active = selectedGenre === genre;

                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => {
                      setSelectedGenre(genre);
                      setIsFilterOpen(false);
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
          </div>
        </div>
      ) : null}

      {movie ? (
        <MovieSwipeCard
          movie={movie}
          onAccept={async () => {
            registerMovies([movie]);
            await swipeMovie(movie.id, "accepted");
          }}
          onReject={async () => {
            registerMovies([movie]);
            await swipeMovie(movie.id, "rejected");
          }}
        />
      ) : filteredQueue.length === 0 && discoverQueue.length > 0 ? (
        <SurfaceCard className="space-y-4 text-center">
          <div className="space-y-2">
            <h2
              className={`text-xl font-semibold ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              No movies match this search
            </h2>
            <p
              className={`text-sm leading-6 ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Try another title or switch the genre filter back to all movies.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedGenre("All");
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
              You’ve gone through every mock movie.
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
  );
}
