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

export type DiscoverSwipeMatchExplanation = {
  percent: number;
  headline: string;
  bullets: string[];
};

/**
 * Human-readable breakdown for the Discover card match % (same inputs as
 * `computeDiscoverSwipeMatchPercent`). Used after a successful Like.
 */
export function explainDiscoverSwipeMatch(
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
): DiscoverSwipeMatchExplanation {
  const w = Math.max(0, Math.min(1, options.personalizationWeight));
  const cold = 1 - w;
  const percent = computeDiscoverSwipeMatchPercent(movie, options);
  const favoriteGenres = normalizeGenreSet(options.onboarding.favoriteGenres);
  const dislikedGenres = normalizeGenreSet(options.onboarding.dislikedGenres);
  const affinity = options.genreAffinity;
  const rejectedW = options.rejectedGenreWeights;

  const rawGenres = movie.genre
    .map((genre) => genre.trim())
    .filter(
      (genre) =>
        Boolean(genre) && genre.toLowerCase() !== "movie" && genre.toLowerCase() !== "series",
    );

  const bullets: string[] = [];

  bullets.push(
    `We start from this title’s **IMDb ${movie.rating.toFixed(1)}** score, then adjust for your genres, what you’ve liked or skipped, and release year. The **${percent}%** on the card is that blend, rounded.`,
  );

  if (cold > 0.04) {
    bullets.push(
      `About **${Math.round(cold * 100)}%** of the mix comes from tastes you set in onboarding; **${Math.round(w * 100)}%** comes from titles you’ve saved or passed in Discover and Picks. As you swipe more, the second part grows.`,
    );
  } else {
    bullets.push(
      `Most of this score now comes from **your history** (likes, Picks, passes). Onboarding is only a small tie-breaker.`,
    );
  }

  const mediaPreference = options.onboarding.mediaPreference ?? "both";
  if (mediaPreference !== "both" && movie.mediaType !== mediaPreference) {
    bullets.push(
      `You asked for **${mediaPreference === "movie" ? "movies" : "series"}**; this title is the other format, so we nudge the match **down** a bit.`,
    );
  }

  const genreLines: string[] = [];
  for (const display of rawGenres) {
    const key = display.toLowerCase();
    const aff = affinity.get(key) ?? 0;
    const rej = rejectedW.get(key) ?? 0;
    const fav = favoriteGenres.has(key);
    const dis = dislikedGenres.has(key);

    const parts: string[] = [];
    if (dis) {
      parts.push("you marked this genre as less preferred");
    }
    if (rej > 0.05) {
      parts.push("you’ve recently passed titles that share this genre");
    }
    if (affinity.size > 0 && aff > 0) {
      parts.push("it lines up with genres you’ve liked or picked");
    } else if (fav && !dis) {
      parts.push("it’s one of your favorite genres");
    }

    if (parts.length === 0) {
      continue;
    }
    genreLines.push(`**${display}** — ${parts.join("; ")}.`);
  }

  for (const line of genreLines.slice(0, 5)) {
    bullets.push(line);
  }

  const rawNudge = discoverYearMatchNudge(movie.year, options.tasteYear, options.calendarYear);
  const scaledNudge = rawNudge * w;
  if (Math.abs(scaledNudge) < 0.28) {
    bullets.push(
      `**${movie.year}** is close enough to your usual era that the year fit only **nudges** the score (stronger once you’ve saved more titles).`,
    );
  } else if (scaledNudge > 0) {
    bullets.push(
      `**${movie.year}** **boosts** the match a little — it sits nearer the release years you usually watch.`,
    );
  } else {
    bullets.push(
      `**${movie.year}** **lowers** the match a little — it’s farther from the release years you usually watch.`,
    );
  }

  bullets.push(
    `We keep the percentage between **28%** and **98%** so the dial stays readable — it’s a guide, not a guarantee.`,
  );

  const headline =
    movie.title.length > 42
      ? `Why ~${percent}% match?`
      : `Why “${movie.title}” matched at ~${percent}%`;

  return {
    percent,
    headline,
    bullets,
  };
}
