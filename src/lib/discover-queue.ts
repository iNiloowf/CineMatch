import { DISCOVER_REJECT_HIDE_WINDOW_MS } from "@/lib/discover-constants";
import { passesDiscoverQualityThreshold } from "@/lib/discover-quality";
import { computeMovieMatchPercent } from "@/lib/match-score";
import type { Movie, OnboardingPreferences, SwipeRecord } from "@/lib/types";

export function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function normalizeGenreKey(entry: string) {
  const normalized = entry.trim().toLowerCase();
  if (!normalized || normalized === "movie" || normalized === "series") {
    return null;
  }
  return normalized;
}

function buildAcceptedGenreCounts(acceptedMovies: Movie[]) {
  return acceptedMovies.reduce<Map<string, number>>((counts, movie) => {
    movie.genre.forEach((entry) => {
      const key = normalizeGenreKey(entry);
      if (!key) {
        return;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return counts;
  }, new Map<string, number>());
}

/**
 * Merge Picks “watched” signals into genre weights: strong for thumbs-up, weak for thumbs-down.
 */
function mergePickEngagementIntoGenreCounts(
  base: Map<string, number>,
  pickEngagement: { movieId: string; recommended: boolean }[],
  moviesById: Map<string, Movie>,
) {
  for (const { movieId, recommended } of pickEngagement) {
    const movie = moviesById.get(movieId);
    if (!movie) {
      continue;
    }
    const weight = recommended ? 2.35 : 0.42;
    movie.genre.forEach((entry) => {
      const key = normalizeGenreKey(entry);
      if (!key) {
        return;
      }
      base.set(key, (base.get(key) ?? 0) + weight);
    });
  }
}

export type DiscoverPickEngagement = {
  movieId: string;
  recommended: boolean;
};

function computeTasteYearProfile(
  acceptedMovies: Movie[],
  pickEngagement: DiscoverPickEngagement[],
  moviesById: Map<string, Movie>,
  calendarYear: number,
): { center: number; spread: number; classicEngaged: boolean } {
  const samples: { year: number; w: number }[] = [];

  for (const m of acceptedMovies) {
    samples.push({ year: m.year, w: 1 });
  }
  for (const pe of pickEngagement) {
    const m = moviesById.get(pe.movieId);
    if (!m) {
      continue;
    }
    samples.push({ year: m.year, w: pe.recommended ? 1.55 : 0.4 });
  }

  if (samples.length === 0) {
    return {
      center: calendarYear - 5,
      spread: 16,
      classicEngaged: false,
    };
  }

  let sumW = 0;
  let sumY = 0;
  for (const s of samples) {
    sumW += s.w;
    sumY += s.year * s.w;
  }
  const center = sumY / sumW;

  const years = samples.map((s) => s.year);
  const mean = years.reduce((a, b) => a + b, 0) / years.length;
  let varSum = 0;
  for (const y of years) {
    varSum += (y - mean) ** 2;
  }
  const spread = Math.max(9, Math.min(30, Math.sqrt(varSum / years.length) || 14));

  const classicEngaged =
    center <= 2001 || samples.some((s) => s.year <= 1996 && s.w >= 1);

  return { center, spread, classicEngaged };
}

function popularityBoost(movie: Movie): number {
  const p = movie.popularity;
  if (typeof p === "number" && Number.isFinite(p) && p > 0) {
    return Math.min(26, 6.2 * Math.log1p(p));
  }
  return Math.min(9, Math.max(0, (movie.rating - 5.4) * 2.1));
}

function yearPreferenceScore(
  movieYear: number,
  taste: { center: number; spread: number; classicEngaged: boolean },
  calendarYear: number,
): number {
  const { center, spread, classicEngaged } = taste;
  const diff = Math.abs(movieYear - center);
  let score = Math.max(0, 34 - (diff / (spread * 1.05)) * 9);

  if (!classicEngaged && center >= 2002 && movieYear < 1992) {
    score -= Math.min(26, (1992 - movieYear) * 0.42);
  }

  if (classicEngaged && movieYear < 1985) {
    score += 5;
  }

  const recencyNudge = (movieYear - 1975) / Math.max(1, calendarYear - 1975);
  score += Math.min(9, 9 * recencyNudge);

  return score;
}

/**
 * Computes the ordered Discover deck: quality filter, swipe visibility, taste scoring, shuffle, rotation.
 */
export function buildDiscoverQueue(options: {
  movies: Movie[];
  swipes: SwipeRecord[];
  currentUserId: string | null;
  discoverShuffleSeed: string;
  discoverStartOffset: number;
  discoverVisibilityTimestamp: number;
  onboardingPreferences: OnboardingPreferences;
  /** Picks “watched” reviews for the current user — boosts genres & calibrates release-year taste. */
  pickEngagement?: DiscoverPickEngagement[];
}): Movie[] {
  const {
    movies,
    swipes,
    currentUserId,
    discoverShuffleSeed,
    discoverStartOffset,
    discoverVisibilityTimestamp,
    onboardingPreferences,
    pickEngagement = [],
  } = options;

  const moviesById = new Map(movies.map((m) => [m.id, m]));
  const calendarYear = new Date().getFullYear();

  const acceptedIds = new Set(
    currentUserId
      ? swipes
          .filter(
            (swipe) =>
              swipe.userId === currentUserId && swipe.decision === "accepted",
          )
          .map((swipe) => swipe.movieId)
      : [],
  );

  const acceptedMovies = movies.filter((movie) => acceptedIds.has(movie.id));

  const genreAffinity = buildAcceptedGenreCounts(acceptedMovies);
  if (currentUserId && pickEngagement.length > 0) {
    mergePickEngagementIntoGenreCounts(genreAffinity, pickEngagement, moviesById);
  }

  const tasteYear = currentUserId
    ? computeTasteYearProfile(
        acceptedMovies,
        pickEngagement,
        moviesById,
        calendarYear,
      )
    : { center: calendarYear - 4, spread: 14, classicEngaged: false };

  const hiddenMovieIds = new Set(
    currentUserId
      ? swipes
          .filter((swipe) => {
            if (swipe.userId !== currentUserId) {
              return false;
            }

            if (swipe.decision === "accepted") {
              return true;
            }

            if (swipe.decision !== "rejected") {
              return false;
            }

            const rejectedAt = new Date(swipe.createdAt).getTime();
            return (
              Number.isFinite(rejectedAt) &&
              discoverVisibilityTimestamp - rejectedAt < DISCOVER_REJECT_HIDE_WINDOW_MS
            );
          })
          .map((swipe) => swipe.movieId)
      : [],
  );

  const sortBySessionShuffle = (list: Movie[]) =>
    [...list].sort(
      (left, right) =>
        hashString(`${left.id}:${discoverShuffleSeed}`) -
        hashString(`${right.id}:${discoverShuffleSeed}`),
    );

  const sortDiscoverQueue = (list: Movie[]) =>
    [...list].sort((left, right) => {
      const getDiscoverPriorityScore = (movie: Movie) => {
        const acceptedGenreAffinity = movie.genre.reduce((score, entry) => {
          const key = normalizeGenreKey(entry);
          return key ? score + (genreAffinity.get(key) ?? 0) : score;
        }, 0);

        const preferenceMatchScore = computeMovieMatchPercent(movie, {
          acceptedGenres: genreAffinity.keys(),
          onboarding: onboardingPreferences,
        });

        const mediaPreferenceBonus =
          onboardingPreferences.mediaPreference === "both" ||
          onboardingPreferences.mediaPreference === movie.mediaType
            ? 5
            : -6;

        const pop = popularityBoost(movie);
        const yearScore = currentUserId
          ? yearPreferenceScore(movie.year, tasteYear, calendarYear)
          : Math.min(22, (movie.year - 1980) / Math.max(1, calendarYear - 1980) * 22);

        return (
          preferenceMatchScore +
          acceptedGenreAffinity * 3.15 +
          mediaPreferenceBonus +
          pop +
          yearScore
        );
      };

      const leftScore = getDiscoverPriorityScore(left);
      const rightScore = getDiscoverPriorityScore(right);

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return (
        hashString(`${left.id}:${discoverShuffleSeed}`) -
        hashString(`${right.id}:${discoverShuffleSeed}`)
      );
    });

  const rotateDiscoverQueue = (list: Movie[]) => {
    if (list.length <= 1) {
      return list;
    }

    const offset = discoverStartOffset % list.length;

    if (offset === 0) {
      return list;
    }

    return [...list.slice(offset), ...list.slice(0, offset)];
  };

  if (currentUserId) {
    return rotateDiscoverQueue(
      sortDiscoverQueue(
        movies.filter(
          (movie) =>
            passesDiscoverQualityThreshold(movie) && !hiddenMovieIds.has(movie.id),
        ),
      ),
    );
  }

  return rotateDiscoverQueue(
    sortBySessionShuffle(
      movies.filter((movie) => passesDiscoverQualityThreshold(movie)),
    ),
  );
}
