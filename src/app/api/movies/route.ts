import { NextRequest } from "next/server";
import { z } from "zod";
import { DISCOVER_REJECT_HIDE_WINDOW_MS } from "@/lib/discover-constants";
import { passesDiscoverListEligibility } from "@/lib/discover-quality";
import { Movie } from "@/lib/types";
import { apiJsonOk } from "@/server/api-response";
import { parseSearchParams } from "@/server/api-validation";
import { getDatabase, getMergedMovies } from "@/server/mock-db";
import { isTmdbConfigured, searchTmdbMedia } from "@/server/tmdb";

const moviesQuerySchema = z.object({
  userId: z.string().optional(),
  movieId: z.string().optional(),
  source: z.string().optional(),
  query: z.string().optional(),
});
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
  const isTmdbSearch = source === "tmdb" && query.length > 0;
  const movies =
    source === "tmdb"
      ? isTmdbSearch
        ? await searchTmdbMedia(query)
        : await getMergedMovies()
      : database.movies;
  const calendarYear = new Date().getFullYear();
  // Default deck: recent era only; search keeps pre-floor classics findable.
  const filteredMovies = movies.filter((m) =>
    passesDiscoverListEligibility(
      m,
      calendarYear,
      isTmdbSearch ? { eraFloorYear: null } : undefined,
    ),
  );

  if (movieId) {
    const mergedMovies = await getMergedMovies();
    const exactMovie =
      movies.find((movie) => movie.id === movieId) ??
      mergedMovies.find((movie) => movie.id === movieId) ??
      null;

    return apiJsonOk(
      {
        movie: exactMovie,
        source: isTmdbConfigured() ? "tmdb+mock" : "mock",
      },
      request,
    );
  }

  if (!userId) {
    return apiJsonOk(
      {
        movies: filteredMovies,
        source: isTmdbConfigured() ? "tmdb+mock" : "mock",
      },
      request,
    );
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

  return apiJsonOk(
    {
      movies: filteredMovies.filter((movie) => !hiddenMovies.has(movie.id)),
      source: isTmdbConfigured() ? "tmdb+mock" : "mock",
    },
    request,
  );
}
