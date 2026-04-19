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
