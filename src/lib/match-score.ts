import { discoverYearMatchNudge } from "@/lib/discover-taste";
import type { Movie, OnboardingPreferences } from "@/lib/types";

/** Midpoint before taste adjustments — IMDb/popularity must not inflate “match %”. */
const TASTE_MATCH_NEUTRAL_BASE = 54;
const FAVORITE_GENRE_BONUS = 7.5;
/** Stronger than a single favorite so “avoid” genres actually pull the dial down. */
const DISLIKED_GENRE_PENALTY = 22;
/** Title mixes something you love and something you skip — net score shouldn’t look like a slam dunk. */
const MIXED_GENRE_CONFLICT_PENALTY = 12;
/** User picked favorite genres — if this title has none of them, don’t show a “great” match. */
const NO_FAVORITE_OVERLAP_PENALTY = 22;
/** History on genres you didn’t list as favorites counts less (still possible, but weaker). */
const AFFINITY_OFF_FAVORITE_MULTIPLIER = 0.48;

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
        let add = Math.min(28, w * 2.65);
        if (favoriteGenres.size > 0 && !favoriteGenres.has(genre)) {
          add *= AFFINITY_OFF_FAVORITE_MULTIPLIER;
        }
        score += add;
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

  if (favoriteGenres.size > 0 && movieGenres.length > 0) {
    const overlapsFavorite = movieGenres.some((genre) => favoriteGenres.has(genre));
    if (!overlapsFavorite) {
      score -= NO_FAVORITE_OVERLAP_PENALTY;
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
 * Plain-language breakdown for the Discover card match % (same inputs as
 * `computeDiscoverSwipeMatchPercent`). Shown when the user taps Match.
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
  const affinity = options.genreAffinity;
  const rejectedW = options.rejectedGenreWeights;
  const favoriteGenres = normalizeGenreSet(options.onboarding.favoriteGenres);
  const dislikedGenres = normalizeGenreSet(options.onboarding.dislikedGenres);
  const percent = computeDiscoverSwipeMatchPercent(movie, options);

  const rawGenres = movie.genre
    .map((genre) => genre.trim())
    .filter(
      (genre) =>
        Boolean(genre) && genre.toLowerCase() !== "movie" && genre.toLowerCase() !== "series",
    );

  const bullets: string[] = [];

  bullets.push(
    `**${percent}%** is about **your taste**, not how famous or viral a title is. We don’t use IMDb score or popularity inside this number — only genres you care about, what you’ve saved or skipped, and (a little) release year.`,
  );

  if (w < 0.15) {
    bullets.push(
      `We’re **still learning** your habits — most of this score comes from what you chose when you joined. Save and rate a few more titles and it’ll follow you more closely.`,
    );
  } else {
    bullets.push(
      `Roughly **${Math.round(w * 100)}%** of the signal now comes from **what you actually watch and save**; the rest ties back to your signup choices.`,
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
    if (dis) {
      bits.push("you told us you usually want **less** of this");
    } else if (fav) {
      bits.push("this matches a genre you said you **want more** of");
    }
    if (affinity.size > 0 && aff > 0.45) {
      bits.push("similar to things you’ve **liked or picked** lately");
    } else if (affinity.size > 0 && aff > 0) {
      bits.push("a bit like titles you’ve **rated or saved** before");
    }
    if (rej > 0.05) {
      bits.push("you’ve **passed** similar titles on Discover recently");
    }

    if (bits.length === 0) {
      continue;
    }
    genreLines.push(`**${display}**: ${bits.join(" · ")}.`);
  }

  if (genreLines.length === 0) {
    bullets.push(
      `The genres here didn’t line up strongly with your favorites or avoids yet — **${percent}%** is mostly the neutral starting point until we know you better.`,
    );
  } else {
    for (const line of genreLines.slice(0, 5)) {
      bullets.push(line);
    }
  }

  const movieGenreKeys = rawGenres.map((g) => g.trim().toLowerCase());
  const overlapsStatedFavorite =
    favoriteGenres.size > 0 &&
    movieGenreKeys.length > 0 &&
    movieGenreKeys.some((g) => favoriteGenres.has(g));
  if (favoriteGenres.size > 0 && movieGenreKeys.length > 0 && !overlapsStatedFavorite) {
    bullets.push(
      `None of this title’s genres are in your **favorite** list — we **lower** the match, and history on those genres counts less than genres you asked for.`,
    );
  }

  const hitsFavorite = rawGenres.some((g) => favoriteGenres.has(g.trim().toLowerCase()));
  const hitsDisliked = rawGenres.some((g) => dislikedGenres.has(g.trim().toLowerCase()));
  if (hitsFavorite && hitsDisliked) {
    bullets.push(
      `This title mixes something you **love** with something you’d **rather skip**, so we **don’t** treat it like a perfect match.`,
    );
  }

  const mediaPreference = options.onboarding.mediaPreference ?? "both";
  if (mediaPreference !== "both" && movie.mediaType !== mediaPreference) {
    bullets.push(
      `You asked Discover to focus on **${mediaPreference === "movie" ? "movies" : "series"}**; this one is a **${movie.mediaType}**, so we lower the match a little.`,
    );
  }

  const center = Math.round(options.tasteYear.center);
  const spread = options.tasteYear.spread;
  const diff = Math.abs(movie.year - center);

  if (options.tasteYear.classicEngaged && movie.year < 1995) {
    bullets.push(
      `**${movie.year}** fits the **older** films you tend to enjoy — we give that a small boost.`,
    );
  } else if (diff <= spread * 1.15) {
    bullets.push(
      `**${movie.year}** is close to the **kinds of years** you usually pick (around **${center}**), so the match gets a small lift.`,
    );
  } else if (movie.year < center - spread * 1.4) {
    bullets.push(
      `**${movie.year}** is **older** than most of what you watch — we nudge the match **down** a bit.`,
    );
  } else {
    bullets.push(
      `**${movie.year}** is a bit outside your usual era (around **${center}**), so release year only nudges the score slightly.`,
    );
  }

  bullets.push(
    `We show the result on a **28–98** scale so you can compare titles quickly — it’s a guide, not a guarantee.`,
  );

  const headline =
    movie.title.length > 40
      ? `Your ${percent}% taste match`
      : `${movie.title} — ${percent}% match`;

  return {
    percent,
    headline,
    bullets,
  };
}
