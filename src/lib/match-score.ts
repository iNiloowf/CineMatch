import { discoverYearMatchNudge } from "@/lib/discover-taste";
import type { Movie, OnboardingPreferences } from "@/lib/types";

type MatchContext = {
  /** Legacy: set of genres from accepted swipes (binary bonuses). */
  acceptedGenres?: Iterable<string>;
  /**
   * When provided, replaces binary `acceptedGenres` for swipe affinity: accepts + Picks reviews.
   */
  genreAffinityWeights?: Map<string, number>;
  /** Decayed cumulative weight from Discover passes on genres (downweights). */
  rejectedGenreWeights?: Map<string, number>;
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
  const affinity = context?.genreAffinityWeights;
  const rejectedW = context?.rejectedGenreWeights;

  const movieGenres = movie.genre
    .map((genre) => genre.trim().toLowerCase())
    .filter((genre) => Boolean(genre) && genre !== "movie" && genre !== "series");

  let score = 44 + movie.rating * 5.2;

  for (const genre of movieGenres) {
    if (affinity && affinity.size > 0) {
      const w = affinity.get(genre) ?? 0;
      if (w > 0) {
        score += Math.min(28, w * 2.65);
      }
    } else if (acceptedGenres.has(genre)) {
      score += 5.5;
    }

    if (favoriteGenres.has(genre)) {
      score += 8.5;
    }
    if (dislikedGenres.has(genre)) {
      score -= 13;
    }

    const rej = rejectedW?.get(genre) ?? 0;
    if (rej > 0) {
      score -= Math.min(18, rej * 6.2);
    }
  }

  const mediaPreference = context?.onboarding?.mediaPreference ?? "both";
  if (mediaPreference !== "both" && movie.mediaType !== mediaPreference) {
    score -= 8;
  }

  return Math.max(28, Math.min(98, Math.round(score)));
}

/** Blends onboarding-only taste with full personalized signals (used for Discover queue + card). */
export function computeDiscoverPreferenceBlend(
  movie: Movie,
  personalizationWeight: number,
  opts: {
    genreAffinity: Map<string, number>;
    rejectedGenreWeights: Map<string, number>;
    onboarding: Pick<
      OnboardingPreferences,
      "favoriteGenres" | "dislikedGenres" | "mediaPreference"
    >;
  },
): number {
  const w = Math.max(0, Math.min(1, personalizationWeight));
  const cold = 1 - w;
  const onboardingOnly = computeMovieMatchPercent(movie, {
    onboarding: opts.onboarding,
  });
  const full = computeMovieMatchPercent(movie, {
    genreAffinityWeights: opts.genreAffinity,
    rejectedGenreWeights: opts.rejectedGenreWeights,
    onboarding: opts.onboarding,
  });
  return cold * onboardingOnly + w * full;
}

/**
 * Discover swipe card: same blend as queue + release-year nudge scaled by personalization.
 */
export function computeDiscoverSwipeMatchPercent(
  movie: Movie,
  options: {
    genreAffinity: Map<string, number>;
    rejectedGenreWeights: Map<string, number>;
    onboarding: Pick<
      OnboardingPreferences,
      "favoriteGenres" | "dislikedGenres" | "mediaPreference"
    >;
    tasteYear: {
      center: number;
      spread: number;
      classicEngaged: boolean;
    };
    calendarYear: number;
    personalizationWeight: number;
  },
): number {
  const base = computeDiscoverPreferenceBlend(
    movie,
    options.personalizationWeight,
    {
      genreAffinity: options.genreAffinity,
      rejectedGenreWeights: options.rejectedGenreWeights,
      onboarding: options.onboarding,
    },
  );
  const nudge =
    discoverYearMatchNudge(movie.year, options.tasteYear, options.calendarYear) *
    options.personalizationWeight;
  return Math.max(28, Math.min(98, Math.round(base + nudge)));
}
