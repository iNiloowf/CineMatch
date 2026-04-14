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
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleDiscoverIds = useMemo(
    () => new Set(discoverQueue.map((movie) => movie.id)),
    [discoverQueue],
  );
  const searchableMovies = useMemo(() => {
    if (normalizedSearchQuery.length < 2) {
      return discoverQueue;
    }

    return [
      ...searchResults.filter((movie) => visibleDiscoverIds.has(movie.id)),
      ...discoverQueue.filter(
        (movie) => !searchResults.some((entry) => entry.id === movie.id),
      ),
    ];
  }, [discoverQueue, normalizedSearchQuery, searchResults, visibleDiscoverIds]);

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
        selectedGenres.length === 0 ||
        selectedGenres.some((genre) => movie.genre.includes(genre));

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
  }, [normalizedSearchQuery, searchableMovies, selectedGenres]);

  const movie = filteredQueue[0];
  const previewResults = filteredQueue.slice(0, 5);

  return (
    <div className="flex min-h-full flex-col gap-3 overflow-hidden">
      <div className="space-y-2">
        <div
          className={`rounded-[24px] border px-3 py-3 backdrop-blur-xl ${
            isDarkMode
              ? "border-white/10 bg-slate-950/72"
              : "border-white/70 bg-white/90 shadow-[0_16px_34px_rgba(124,58,237,0.08)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search a movie or series"
                className={`w-full rounded-[18px] border py-3 pl-10 pr-4 text-sm outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-white/8 text-white placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/10"
                    : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-violet-400"
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
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              aria-label="Open genre filter"
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border transition ${
                isDarkMode
                  ? "border-white/10 bg-white/8 text-white hover:bg-white/12"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
              {normalizedSearchQuery.length > 0 && filteredQueue.length > 0 ? (
                <span
                  className={`rounded-full px-3 py-2 text-xs font-semibold ${
                    isDarkMode
                      ? "bg-white/8 text-slate-200"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {filteredQueue.length} found
                </span>
              ) : null}
            </div>
          ) : null}

          {normalizedSearchQuery.length > 0 && previewResults.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {previewResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => setSearchQuery(result.title)}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition ${
                    movie?.id === result.id
                      ? "bg-violet-600 text-white"
                      : isDarkMode
                        ? "bg-white/8 text-slate-200 hover:bg-white/12"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {result.title}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

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
                        setSelectedGenres([]);
                        return;
                      }

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
                onClick={() => setSelectedGenres([])}
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
