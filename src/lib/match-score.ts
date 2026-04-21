import { discoverYearMatchNudge } from "@/lib/discover-taste";
import type { Movie, OnboardingPreferences } from "@/lib/types";

/** Midpoint before taste adjustments — IMDb/popularity must not inflate “match %”. */
const TASTE_MATCH_NEUTRAL_BASE = 54;
const FAVORITE_GENRE_BONUS = 7.5;
/** Stronger than a single favorite so “avoid” genres actually pull the dial down. */
const DISLIKED_GENRE_PENALTY = 22;
/** Title mixes something you love and something you skip — net score shouldn’t look like a slam dunk. */
const MIXED_GENRE_CONFLICT_PENALTY = 12;

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

  let score = TASTE_MATCH_NEUTRAL_BASE;

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
      score += FAVORITE_GENRE_BONUS;
    }
    if (dislikedGenres.has(genre)) {
      score -= DISLIKED_GENRE_PENALTY;
    }

    const rej = rejectedW?.get(genre) ?? 0;
    if (rej > 0) {
      score -= Math.min(18, rej * 6.2);
    }
  }

  if (movieGenres.length > 0) {
    const hitsFavorite = movieGenres.some((genre) => favoriteGenres.has(genre));
    const hitsDisliked = movieGenres.some((genre) => dislikedGenres.has(genre));
    if (hitsFavorite && hitsDisliked) {
      score -= MIXED_GENRE_CONFLICT_PENALTY;
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
  const affinity = options.genreAffinity;
  const rejectedW = options.rejectedGenreWeights;
  const favoriteGenres = normalizeGenreSet(options.onboarding.favoriteGenres);
  const dislikedGenres = normalizeGenreSet(options.onboarding.dislikedGenres);

  const onboardingOnly = computeMovieMatchPercent(movie, {
    onboarding: options.onboarding,
  });
  const fullPersonalized = computeMovieMatchPercent(movie, {
    genreAffinityWeights: affinity,
    rejectedGenreWeights: rejectedW,
    onboarding: options.onboarding,
  });
  const blend = computeDiscoverPreferenceBlend(movie, w, {
    genreAffinity: affinity,
    rejectedGenreWeights: rejectedW,
    onboarding: options.onboarding,
  });
  const rawYearNudge = discoverYearMatchNudge(
    movie.year,
    options.tasteYear,
    options.calendarYear,
  );
  const scaledYearNudge = rawYearNudge * w;
  const rawBeforeClamp = blend + scaledYearNudge;
  const percent = computeDiscoverSwipeMatchPercent(movie, options);

  const rawGenres = movie.genre
    .map((genre) => genre.trim())
    .filter(
      (genre) =>
        Boolean(genre) && genre.toLowerCase() !== "movie" && genre.toLowerCase() !== "series",
    );

  const bullets: string[] = [];

  bullets.push(
    `**No IMDb / popularity in this %** — neutral taste base **${TASTE_MATCH_NEUTRAL_BASE}**, then genres & history only. Inner scores: **${onboardingOnly}%** (signup) vs **${fullPersonalized}%** (with likes, Picks, passes). Blend **${blend.toFixed(1)}%** = **${cold.toFixed(2)}**×${onboardingOnly} + **${w.toFixed(2)}**×${fullPersonalized}.`,
  );

  if (w < 0.12) {
    bullets.push(
      `Personalization weight is **${Math.round(w * 100)}%** — the score still leans on what you chose at signup until you save more titles.`,
    );
  }

  const genreLines: string[] = [];
  for (const display of rawGenres) {
    const key = display.toLowerCase();
    const aff = affinity.get(key) ?? 0;
    const rej = rejectedW.get(key) ?? 0;
    const fav = favoriteGenres.has(key);
    const dis = dislikedGenres.has(key);

    const bits: string[] = [];
    if (affinity.size > 0 && aff > 0) {
      bits.push(`likes/Picks signal **${aff.toFixed(2)}**`);
    }
    if (fav && !dis) {
      bits.push("onboarding **favorite**");
    }
    if (dis) {
      bits.push("onboarding **avoid**");
    }
    if (rej > 0.02) {
      bits.push(`recent passes **${rej.toFixed(2)}**`);
    }

    if (bits.length === 0) {
      continue;
    }
    genreLines.push(`**${display}**: ${bits.join(" · ")}.`);
  }

  if (genreLines.length === 0) {
    bullets.push(
      `No genre on this title hit a strong signal yet — **${percent}%** is mostly the **${TASTE_MATCH_NEUTRAL_BASE}** baseline plus blend (not popularity).`,
    );
  } else {
    for (const line of genreLines.slice(0, 5)) {
      bullets.push(line);
    }
  }

  const hitsFavorite = rawGenres.some((g) => favoriteGenres.has(g.trim().toLowerCase()));
  const hitsDisliked = rawGenres.some((g) => dislikedGenres.has(g.trim().toLowerCase()));
  if (hitsFavorite && hitsDisliked) {
    bullets.push(
      `This title includes **both** a genre you **favorite** and one you **avoid** → **−${MIXED_GENRE_CONFLICT_PENALTY}** mixed-genre adjustment.`,
    );
  }

  const mediaPreference = options.onboarding.mediaPreference ?? "both";
  if (mediaPreference !== "both" && movie.mediaType !== mediaPreference) {
    bullets.push(
      `You prefer **${mediaPreference === "movie" ? "movies" : "series"}**; this is **${movie.mediaType}** → **−8** in the inner score (same as the card).`,
    );
  }

  const center = Math.round(options.tasteYear.center);
  const spread = Math.round(options.tasteYear.spread);
  const roundedCombined = Math.round(rawBeforeClamp);
  const clampNote =
    roundedCombined !== percent
      ? ` Inner **${roundedCombined}%** was clamped to **${percent}%**.`
      : "";

  bullets.push(
    `**Release year:** your history clusters ~**${center}** (±**${spread}** yrs). **${movie.year}** → year factor **${rawYearNudge >= 0 ? "+" : ""}${rawYearNudge.toFixed(2)}** × personalization **${w.toFixed(2)}** = **${scaledYearNudge >= 0 ? "+" : ""}${scaledYearNudge.toFixed(2)}** on top of **${blend.toFixed(1)}%** → **${rawBeforeClamp.toFixed(1)}** before rounding.`,
  );

  bullets.push(
    `**Dial:** round(**${rawBeforeClamp.toFixed(1)}**) → **${roundedCombined}%**, then cap **28–98** → **${percent}%** shown.${clampNote}`,
  );

  const headline =
    movie.title.length > 42
      ? `~${percent}% match — breakdown`
      : `“${movie.title}” · ~${percent}%`;

  return {
    percent,
    headline,
    bullets,
  };
}
