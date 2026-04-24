import { Movie } from "@/lib/types";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

type TmdbDiscoverMedia = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  vote_average: number;
  poster_path: string | null;
  release_date: string | null;
  first_air_date?: string | null;
  genre_ids: number[];
};

type TmdbPagedResults = {
  results: TmdbDiscoverMedia[];
};

type TmdbMovieDetails = {
  id: number;
  title: string;
  overview: string;
  vote_average: number;
  popularity?: number;
  poster_path: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
};

type TmdbTvDetails = {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  popularity?: number;
  poster_path: string | null;
  first_air_date: string | null;
  episode_run_time: number[];
  genres: { id: number; name: string }[];
};

type TmdbVideoResult = {
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
  published_at?: string;
};

type TmdbVideosResponse = {
  results: TmdbVideoResult[];
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
    return "N/A";
  }

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

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

function passesQualityThreshold(movie: Movie) {
  if (movie.rating < 3) {
    return false;
  }

  const runtimeMinutes = getRuntimeMinutes(movie.runtime);

  if (runtimeMinutes !== null && runtimeMinutes < 20) {
    return false;
  }

  return true;
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
    mediaType: "movie",
    year: details.release_date
      ? Number(details.release_date.slice(0, 4))
      : new Date().getFullYear(),
    runtime: minutesToRuntimeLabel(details.runtime),
    rating: Number(details.vote_average.toFixed(1)),
    popularity:
      typeof details.popularity === "number" && Number.isFinite(details.popularity)
        ? details.popularity
        : undefined,
    genre: genres.length > 0 ? genres : ["Movie"],
    description:
      details.overview ||
      "No description is available for this movie yet on TMDB.",
    trailerUrl: undefined,
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

function mapTmdbSeries(details: TmdbTvDetails): Movie {
  const genres = details.genres.map((genre) => genre.name);
  const { accentFrom, accentTo } = makeAccentPalette(details.id);
  const averageRuntime =
    details.episode_run_time.find((runtime) => runtime > 0) ?? null;

  return {
    id: `tmdb-tv-${details.id}`,
    title: details.name,
    mediaType: "series",
    year: details.first_air_date
      ? Number(details.first_air_date.slice(0, 4))
      : new Date().getFullYear(),
    runtime: minutesToRuntimeLabel(averageRuntime),
    rating: Number(details.vote_average.toFixed(1)),
    popularity:
      typeof details.popularity === "number" && Number.isFinite(details.popularity)
        ? details.popularity
        : undefined,
    genre: genres.length > 0 ? genres : ["Series"],
    description:
      details.overview ||
      "No description is available for this series yet on TMDB.",
    trailerUrl: undefined,
    poster: {
      eyebrow: genres[0] ?? "Series",
      accentFrom,
      accentTo,
      imageUrl: details.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${details.poster_path}`
        : undefined,
    },
  };
}

function parseTmdbMovieId(movieId: string) {
  const movieMatch = movieId.match(/^tmdb-(\d+)$/);

  if (movieMatch) {
    return { mediaPath: "movie", tmdbId: Number(movieMatch[1]) } as const;
  }

  const seriesMatch = movieId.match(/^tmdb-tv-(\d+)$/);

  if (seriesMatch) {
    return { mediaPath: "tv", tmdbId: Number(seriesMatch[1]) } as const;
  }

  return null;
}

function buildYoutubeEmbedUrl(videoKey: string) {
  const searchParams = new URLSearchParams({
    autoplay: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });

  return `https://www.youtube.com/embed/${videoKey}?${searchParams.toString()}`;
}

function scoreTmdbVideo(video: TmdbVideoResult) {
  let score = 0;

  if (video.site.toLowerCase() === "youtube") {
    score += 100;
  }

  if (video.type === "Trailer") {
    score += 40;
  } else if (video.type === "Teaser") {
    score += 20;
  }

  if (video.official) {
    score += 15;
  }

  const normalizedName = video.name.toLowerCase();

  if (normalizedName.includes("official")) {
    score += 8;
  }

  if (normalizedName.includes("trailer")) {
    score += 6;
  }

  const publishedAt = video.published_at
    ? new Date(video.published_at).getTime()
    : 0;

  return score * 1_000_000_000_000 + publishedAt;
}

export async function fetchTmdbTrailerEmbedUrl(movieId: string) {
  if (!isTmdbConfigured()) {
    return null;
  }

  const parsedMovieId = parseTmdbMovieId(movieId);

  if (!parsedMovieId) {
    return null;
  }

  const videos = await tmdbFetch<TmdbVideosResponse>(
    `/${parsedMovieId.mediaPath}/${parsedMovieId.tmdbId}/videos?language=en-US${getTmdbQueryParams()}`,
  );

  const selectedVideo = [...videos.results]
    .filter((video) => video.key)
    .sort((left, right) => scoreTmdbVideo(right) - scoreTmdbVideo(left))[0];

  if (!selectedVideo || selectedVideo.site.toLowerCase() !== "youtube") {
    return null;
  }

  return buildYoutubeEmbedUrl(selectedVideo.key);
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

  return detailResults.map(mapTmdbMovie).filter(passesQualityThreshold);
}

export async function fetchTmdbDiscoverSeries(page = 1, limit = 12) {
  if (!isTmdbConfigured()) {
    return [];
  }

  const discover = await tmdbFetch<TmdbPagedResults>(
    `/discover/tv?language=en-US&include_adult=false&sort_by=popularity.desc&page=${page}${getTmdbQueryParams()}`,
  );

  const detailCandidates = discover.results
    .filter((series) => series.poster_path && series.overview)
    .slice(0, limit);

  const detailResults = await Promise.all(
    detailCandidates.map((series) =>
      tmdbFetch<TmdbTvDetails>(
        `/tv/${series.id}?language=en-US${getTmdbQueryParams()}`,
      ),
    ),
  );

  return detailResults.map(mapTmdbSeries).filter(passesQualityThreshold);
}

export async function fetchTmdbMediaPool(pages = 4, limitPerPage = 12) {
  if (!isTmdbConfigured()) {
    return [];
  }

  const pageNumbers = Array.from({ length: pages }, (_, index) => index + 1);
  const results = await Promise.all(
    pageNumbers.flatMap((page) => [
      fetchTmdbDiscoverMovies(page, limitPerPage),
      fetchTmdbDiscoverSeries(page, limitPerPage),
    ]),
  );

  const seenIds = new Set<string>();

  return results.flat().filter((entry) => {
    if (!passesQualityThreshold(entry) || seenIds.has(entry.id)) {
      return false;
    }

    seenIds.add(entry.id);
    return true;
  });
}

export async function searchTmdbMedia(query: string, limit = 8) {
  if (!isTmdbConfigured() || query.trim().length === 0) {
    return [];
  }

  const [movieSearch, tvSearch] = await Promise.all([
    tmdbFetch<TmdbPagedResults>(
      `/search/movie?language=en-US&include_adult=false&query=${encodeURIComponent(
        query.trim(),
      )}&page=1${getTmdbQueryParams()}`,
    ),
    tmdbFetch<TmdbPagedResults>(
      `/search/tv?language=en-US&include_adult=false&query=${encodeURIComponent(
        query.trim(),
      )}&page=1${getTmdbQueryParams()}`,
    ),
  ]);

  const movieCandidates = movieSearch.results
    .filter((movie) => movie.poster_path && movie.overview)
    .slice(0, limit);
  const seriesCandidates = tvSearch.results
    .filter((series) => series.poster_path && series.overview)
    .slice(0, limit);

  const [movieDetails, seriesDetails] = await Promise.all([
    Promise.all(
      movieCandidates.map((movie) =>
        tmdbFetch<TmdbMovieDetails>(
          `/movie/${movie.id}?language=en-US${getTmdbQueryParams()}`,
        ),
      ),
    ),
    Promise.all(
      seriesCandidates.map((series) =>
        tmdbFetch<TmdbTvDetails>(
          `/tv/${series.id}?language=en-US${getTmdbQueryParams()}`,
        ),
      ),
    ),
  ]);

  return [...movieDetails.map(mapTmdbMovie), ...seriesDetails.map(mapTmdbSeries)]
    .filter(passesQualityThreshold)
    .sort((left, right) => left.title.localeCompare(right.title))
    .slice(0, limit * 2);
}
