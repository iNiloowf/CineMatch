import { NextRequest, NextResponse } from "next/server";
import { Movie } from "@/lib/types";
import { getDatabase, getMergedMovies } from "@/server/mock-db";
import { isTmdbConfigured, searchTmdbMedia } from "@/server/tmdb";

const REJECT_HIDE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_DISCOVER_RATING = 3;
const MIN_DISCOVER_RUNTIME_MINUTES = 20;

function getRuntimeMinutes(runtimeLabel: string) {
  if (!runtimeLabel || runtimeLabel === "Runtime unavailable") {
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
  const userId = request.nextUrl.searchParams.get("userId");
  const database = getDatabase();
  const source = request.nextUrl.searchParams.get("source");
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const movies =
    source === "tmdb"
      ? query
        ? await searchTmdbMedia(query)
        : await getMergedMovies()
      : database.movies;
  const filteredMovies = movies.filter(passesDiscoverQualityThreshold);

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
        return Number.isFinite(rejectedAt) && now - rejectedAt < REJECT_HIDE_WINDOW_MS;
      })
      .map((entry) => entry.movieId),
  );

  return NextResponse.json({
    movies: filteredMovies.filter((movie) => !hiddenMovies.has(movie.id)),
    source: isTmdbConfigured() ? "tmdb+mock" : "mock",
  });
}
