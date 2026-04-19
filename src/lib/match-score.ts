import type { Movie, OnboardingPreferences } from "@/lib/types";

type MatchContext = {
  acceptedGenres?: Iterable<string>;
  onboarding?: Pick<
    OnboardingPreferences,
    "favoriteGenres" | "dislikedGenres" | "mediaPreference"
  > | null;
};

function normalizeGenreSet(values: Iterable<string> | undefined) {
  const set = new Set<string>();
  if (!values) {
    return set;
  }
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    set.add(trimmed.toLowerCase());
  }
  return set;
}

export function computeMovieMatchPercent(
  movie: Movie,
  context?: MatchContext,
): number {
  const acceptedGenres = normalizeGenreSet(context?.acceptedGenres);
  const favoriteGenres = normalizeGenreSet(context?.onboarding?.favoriteGenres);
  const dislikedGenres = normalizeGenreSet(context?.onboarding?.dislikedGenres);

  const movieGenres = movie.genre
    .map((genre) => genre.trim().toLowerCase())
    .filter((genre) => Boolean(genre) && genre !== "movie" && genre !== "series");

  let score = 44 + movie.rating * 5.2;

  for (const genre of movieGenres) {
    if (acceptedGenres.has(genre)) {
      score += 5.5;
    }
    if (favoriteGenres.has(genre)) {
      score += 8.5;
    }
    if (dislikedGenres.has(genre)) {
      score -= 13;
    }
  }

  const mediaPreference = context?.onboarding?.mediaPreference ?? "both";
  if (mediaPreference !== "both" && movie.mediaType !== mediaPreference) {
    score -= 8;
  }

  return Math.max(28, Math.min(98, Math.round(score)));
}

function movieGenresNormalized(movie: Movie): string[] {
  return movie.genre
    .map((genre) => genre.trim().toLowerCase())
    .filter((genre) => Boolean(genre) && genre !== "movie" && genre !== "series");
}

function collectGenreSetFromMovies(movies: Movie[]): Set<string> {
  const set = new Set<string>();
  for (const entry of movies) {
    for (const genre of movieGenresNormalized(entry)) {
      set.add(genre);
    }
  }
  return set;
}

/** Share of this title’s genres that overlap a reference set (0–100). */
function genreOverlapPercent(movieGenres: string[], reference: Set<string>): number {
  if (movieGenres.length === 0 || reference.size === 0) {
    return 0;
  }
  let hits = 0;
  for (const genre of movieGenres) {
    if (reference.has(genre)) {
      hits += 1;
    }
  }
  return Math.round((hits / movieGenres.length) * 100);
}

export type DiscoverMatchBreakdown = {
  /** Genres overlap with titles you liked (saved picks). */
  likedGenrePercent: number;
  /** Genres overlap with titles you passed on Discover. */
  passedGenrePercent: number;
  /** Genres overlap with watched titles you recommended. */
  recommendedWatchedGenrePercent: number;
  /** Genres overlap with watched titles you did not recommend. */
  notRecommendedWatchedGenrePercent: number;
  /** Genres overlap with onboarding “favorite” genres. */
  favoritesGenrePercent: number;
  /** Genres overlap with onboarding “dislike” genres (higher = more overlap with avoided tastes). */
  dislikedGenreOverlapPercent: number;
};

export function computeDiscoverMatchBreakdown(
  movie: Movie,
  options: {
    likedMovies: Movie[];
    rejectedMovies: Movie[];
    recommendedWatchedMovies: Movie[];
    notRecommendedWatchedMovies: Movie[];
    onboarding: Pick<OnboardingPreferences, "favoriteGenres" | "dislikedGenres"> | null;
  },
): DiscoverMatchBreakdown {
  const movieGenres = movieGenresNormalized(movie);
  const likedSet = collectGenreSetFromMovies(options.likedMovies);
  const passedSet = collectGenreSetFromMovies(options.rejectedMovies);
  const recSet = collectGenreSetFromMovies(options.recommendedWatchedMovies);
  const nrecSet = collectGenreSetFromMovies(options.notRecommendedWatchedMovies);
  const favoriteSet = normalizeGenreSet(options.onboarding?.favoriteGenres ?? []);
  const dislikedSet = normalizeGenreSet(options.onboarding?.dislikedGenres ?? []);

  return {
    likedGenrePercent: genreOverlapPercent(movieGenres, likedSet),
    passedGenrePercent: genreOverlapPercent(movieGenres, passedSet),
    recommendedWatchedGenrePercent: genreOverlapPercent(movieGenres, recSet),
    notRecommendedWatchedGenrePercent: genreOverlapPercent(movieGenres, nrecSet),
    favoritesGenrePercent: genreOverlapPercent(movieGenres, favoriteSet),
    dislikedGenreOverlapPercent: genreOverlapPercent(movieGenres, dislikedSet),
  };
}

