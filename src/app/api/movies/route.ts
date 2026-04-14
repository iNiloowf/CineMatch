import { NextRequest, NextResponse } from "next/server";
import { getDatabase, getMergedMovies } from "@/server/mock-db";
import { isTmdbConfigured, searchTmdbMovies } from "@/server/tmdb";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const database = getDatabase();
  const source = request.nextUrl.searchParams.get("source");
  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  const movies =
    source === "tmdb"
      ? query
        ? await searchTmdbMovies(query)
        : await getMergedMovies()
      : database.movies;

  if (!userId) {
    return NextResponse.json({
      movies,
      source: isTmdbConfigured() ? "tmdb+mock" : "mock",
    });
  }

  const seenMovies = new Set(
    database.swipes
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.movieId),
  );

  return NextResponse.json({
    movies: movies.filter((movie) => !seenMovies.has(movie.id)),
    source: isTmdbConfigured() ? "tmdb+mock" : "mock",
  });
}
