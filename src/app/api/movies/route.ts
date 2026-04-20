import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DISCOVER_REJECT_HIDE_WINDOW_MS } from "@/lib/discover-constants";
import { Movie } from "@/lib/types";
import { parseSearchParams } from "@/server/api-validation";
import { getDatabase, getMergedMovies } from "@/server/mock-db";
import { isTmdbConfigured, searchTmdbMedia } from "@/server/tmdb";

const moviesQuerySchema = z.object({
  userId: z.string().optional(),
  movieId: z.string().optional(),
  source: z.string().optional(),
  query: z.string().optional(),
});
const MIN_DISCOVER_RATING = 3;
const MIN_DISCOVER_RUNTIME_MINUTES = 20;

function getRuntimeMinutes(runtimeLabel: string) {
  if (!runtimeLabel || runtimeLabel === "N/A") {
    return null;
  }

  const hoursMatch = runtimeLabel.match(/(\d+)h/);
  const minutesMatch = runtimeLabel.match(/(\d+)m/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  const totalMinutes = hours * 60 + minutes;

  return totalMinutes > 0 ? totalMinutes : null;
}

function passesDiscoverQualityThreshold(movie: Movie) {
  if (movie.rating < MIN_DISCOVER_RATING) {
    return false;
  }

  const runtimeMinutes = getRuntimeMinutes(movie.runtime);

  if (runtimeMinutes !== null && runtimeMinutes < MIN_DISCOVER_RUNTIME_MINUTES) {
    return false;
  }

  return true;
}

export async function GET(request: NextRequest) {
  const parsedQuery = parseSearchParams(request, moviesQuerySchema);
  if (!parsedQuery.ok) {
    return parsedQuery.response;
  }
  const { userId: rawUserId, movieId: rawMovieId, source, query: rawQuery } =
    parsedQuery.data;
  const userId = rawUserId?.trim() || undefined;
  const movieId = rawMovieId?.trim() || undefined;
  const database = getDatabase();
  const query = rawQuery?.trim() ?? "";
  const movies =
    source === "tmdb"
      ? query
        ? await searchTmdbMedia(query)
        : await getMergedMovies()
      : database.movies;
  const filteredMovies = movies.filter(passesDiscoverQualityThreshold);

  if (movieId) {
    const mergedMovies = await getMergedMovies();
    const exactMovie =
      movies.find((movie) => movie.id === movieId) ??
      mergedMovies.find((movie) => movie.id === movieId) ??
      null;

    return NextResponse.json({
      movie: exactMovie,
      source: isTmdbConfigured() ? "tmdb+mock" : "mock",
    });
  }

  if (!userId) {
    return NextResponse.json({
      movies: filteredMovies,
      source: isTmdbConfigured() ? "tmdb+mock" : "mock",
    });
  }

  const now = Date.now();
  const hiddenMovies = new Set(
    database.swipes
      .filter((entry) => {
        if (entry.userId !== userId) {
          return false;
        }

        if (entry.decision === "accepted") {
          return true;
        }

        if (entry.decision !== "rejected") {
          return false;
        }

        const rejectedAt = new Date(entry.createdAt).getTime();
        return Number.isFinite(rejectedAt) && now - rejectedAt < DISCOVER_REJECT_HIDE_WINDOW_MS;
      })
      .map((entry) => entry.movieId),
  );

  return NextResponse.json({
    movies: filteredMovies.filter((movie) => !hiddenMovies.has(movie.id)),
    source: isTmdbConfigured() ? "tmdb+mock" : "mock",
  });
}
