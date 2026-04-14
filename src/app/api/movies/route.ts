import { NextRequest, NextResponse } from "next/server";
import { getDatabase, getMergedMovies } from "@/server/mock-db";
import { isTmdbConfigured, searchTmdbMedia } from "@/server/tmdb";

const REJECT_HIDE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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

  if (!userId) {
    return NextResponse.json({
      movies,
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
    movies: movies.filter((movie) => !hiddenMovies.has(movie.id)),
    source: isTmdbConfigured() ? "tmdb+mock" : "mock",
  });
}
