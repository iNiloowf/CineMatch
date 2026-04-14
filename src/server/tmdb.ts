import { Movie } from "@/lib/types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

type TmdbDiscoverMovie = {
  id: number;
  title: string;
  overview: string;
  vote_average: number;
  poster_path: string | null;
  release_date: string | null;
  genre_ids: number[];
};

type TmdbPagedResults = {
  results: TmdbDiscoverMovie[];
};

type TmdbMovieDetails = {
  id: number;
  title: string;
  overview: string;
  vote_average: number;
  poster_path: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
};

function getTmdbHeaders() {
  const readAccessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const headers: Record<string, string> = {
    accept: "application/json",
  };

  if (readAccessToken) {
    headers.Authorization = `Bearer ${readAccessToken}`;
  }

  return headers;
}

function getTmdbQueryParams() {
  const apiKey = process.env.TMDB_API_KEY;
  return apiKey ? `&api_key=${apiKey}` : "";
}

export function isTmdbConfigured() {
  return Boolean(
    process.env.TMDB_API_READ_ACCESS_TOKEN || process.env.TMDB_API_KEY,
  );
}

async function tmdbFetch<T>(path: string) {
  const response = await fetch(`${TMDB_BASE_URL}${path}`, {
    headers: getTmdbHeaders(),
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function minutesToRuntimeLabel(runtime: number | null) {
  if (!runtime || runtime <= 0) {
    return "Runtime unavailable";
  }

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function makeAccentPalette(seed: number) {
  const palettes = [
    ["#4a245f", "#c595ff"],
    ["#7c3aed", "#f9c4ff"],
    ["#5b21b6", "#60a5fa"],
    ["#8b5cf6", "#fde68a"],
    ["#6d28d9", "#fca5a5"],
    ["#9333ea", "#93c5fd"],
  ];

  const [accentFrom, accentTo] = palettes[seed % palettes.length];
  return { accentFrom, accentTo };
}

function mapTmdbMovie(details: TmdbMovieDetails): Movie {
  const genres = details.genres.map((genre) => genre.name);
  const { accentFrom, accentTo } = makeAccentPalette(details.id);

  return {
    id: `tmdb-${details.id}`,
    title: details.title,
    year: details.release_date
      ? Number(details.release_date.slice(0, 4))
      : new Date().getFullYear(),
    runtime: minutesToRuntimeLabel(details.runtime),
    rating: Number(details.vote_average.toFixed(1)),
    genre: genres.length > 0 ? genres : ["Movie"],
    description:
      details.overview ||
      "No description is available for this movie yet on TMDB.",
    poster: {
      eyebrow: genres[0] ?? "Featured",
      accentFrom,
      accentTo,
      imageUrl: details.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${details.poster_path}`
        : undefined,
    },
  };
}

// TMDB's discover endpoint is great for browsing, and the details endpoint
// fills in the runtime and full genre names our app needs for movie cards.
export async function fetchTmdbDiscoverMovies(page = 1, limit = 12) {
  if (!isTmdbConfigured()) {
    return [];
  }

  const discover = await tmdbFetch<TmdbPagedResults>(
    `/discover/movie?language=en-US&include_adult=false&include_video=false&sort_by=popularity.desc&page=${page}${getTmdbQueryParams()}`,
  );

  const detailCandidates = discover.results
    .filter((movie) => movie.poster_path && movie.overview)
    .slice(0, limit);

  const detailResults = await Promise.all(
    detailCandidates.map((movie) =>
      tmdbFetch<TmdbMovieDetails>(
        `/movie/${movie.id}?language=en-US${getTmdbQueryParams()}`,
      ),
    ),
  );

  return detailResults.map(mapTmdbMovie);
}

export async function fetchTmdbMoviePool(pages = 4, limitPerPage = 12) {
  if (!isTmdbConfigured()) {
    return [];
  }

  const pageNumbers = Array.from({ length: pages }, (_, index) => index + 1);
  const results = await Promise.all(
    pageNumbers.map((page) => fetchTmdbDiscoverMovies(page, limitPerPage)),
  );

  const seenIds = new Set<string>();

  return results.flat().filter((movie) => {
    if (seenIds.has(movie.id)) {
      return false;
    }

    seenIds.add(movie.id);
    return true;
  });
}

export async function searchTmdbMovies(query: string, limit = 10) {
  if (!isTmdbConfigured() || query.trim().length === 0) {
    return [];
  }

  const search = await tmdbFetch<TmdbPagedResults>(
    `/search/movie?language=en-US&include_adult=false&query=${encodeURIComponent(
      query.trim(),
    )}&page=1${getTmdbQueryParams()}`,
  );

  const detailCandidates = search.results
    .filter((movie) => movie.poster_path && movie.overview)
    .slice(0, limit);

  const detailResults = await Promise.all(
    detailCandidates.map((movie) =>
      tmdbFetch<TmdbMovieDetails>(
        `/movie/${movie.id}?language=en-US${getTmdbQueryParams()}`,
      ),
    ),
  );

  return detailResults.map(mapTmdbMovie);
}
