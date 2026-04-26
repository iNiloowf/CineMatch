import { NextRequest } from "next/server";
import { z } from "zod";
import { DISCOVER_REJECT_HIDE_WINDOW_MS } from "@/lib/discover-constants";
import { passesDiscoverListEligibility } from "@/lib/discover-quality";
import { apiJsonOk } from "@/server/api-response";
import { parseSearchParams } from "@/server/api-validation";
import { getDatabase, getMergedMovies } from "@/server/mock-db";
import {
  fetchTmdbMediaByPicksId,
  isTmdbConfigured,
  searchTmdbMedia,
} from "@/server/tmdb";

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
  const movies =
    source === "tmdb"
      ? query
        ? await searchTmdbMedia(query)
        : await getMergedMovies()
      : database.movies;
  const calendarYear = new Date().getFullYear();
  const filteredMovies = movies.filter((m) =>
    passesDiscoverListEligibility(m, calendarYear),
  );

  if (movieId) {
    const mergedMovies = await getMergedMovies();
    let exactMovie =
      movies.find((movie) => movie.id === movieId) ??
      mergedMovies.find((movie) => movie.id === movieId) ??
      null;
    if (!exactMovie) {
      exactMovie = (await fetchTmdbMediaByPicksId(movieId)) ?? null;
    }

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
