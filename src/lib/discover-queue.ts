import { DISCOVER_REJECT_HIDE_WINDOW_MS } from "@/lib/discover-constants";
import { passesDiscoverListEligibility } from "@/lib/discover-quality";
import {
  buildDiscoverGenreAffinity,
  buildRejectedGenreWeights,
  computeDiscoverPersonalizationWeight,
  computeTasteYearProfile,
} from "@/lib/discover-taste";
import type { DiscoverPickEngagement } from "@/lib/discover-taste";
import { computeDiscoverPreferenceBlend } from "@/lib/match-score";
import type { Movie, OnboardingPreferences, SwipeRecord } from "@/lib/types";

export type { DiscoverPickEngagement } from "@/lib/discover-taste";

export function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

/** Stable first occurrence wins — duplicate IDs in merged feeds were surfacing the same title twice. */
function dedupeMoviesById(movies: Movie[]): Movie[] {
  const seen = new Set<string>();
  const out: Movie[] = [];
  for (const m of movies) {
    if (seen.has(m.id)) {
      continue;
    }
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

function popularityBoost(movie: Movie): number {
  const p = movie.popularity;
  if (typeof p === "number" && Number.isFinite(p) && p > 0) {
    return Math.min(34, 7.4 * Math.log1p(p));
  }
  return Math.min(14, Math.max(0, (movie.rating - 5.2) * 2.5));
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

/** Extra deck priority: newer titles first unless the user clearly likes classics. */
function recencyDeckBoost(
  movieYear: number,
  calendarYear: number,
  taste: { classicEngaged: boolean },
): number {
  if (taste.classicEngaged) {
    return 0;
  }
  const age = calendarYear - movieYear;
  if (age <= 8) {
    return 12;
  }
  if (age <= 18) {
    return 8;
  }
  if (age <= 30) {
    return 3;
  }
  if (age >= 52) {
    return -14;
  }
  if (age >= 40) {
    return -7;
  }
  return 0;
}

/** First real genre tag (not Movie/Series) — used to mix the deck so it isn’t one-note. */
function primaryGenreKey(movie: Movie): string {
  for (const raw of movie.genre) {
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    if (trimmed && lower !== "movie" && lower !== "series") {
      return lower;
    }
  }
  return "_other";
}

/**
 * Reorders a score-sorted list so back-to-back cards rarely share the same primary genre.
 * Keeps higher-ranked titles earlier when possible; falls back to strict order if the pool is narrow.
 */
export function diversifyDiscoverQueue(sorted: Movie[]): Movie[] {
  if (sorted.length <= 2) {
    return sorted;
  }

  const remaining = [...sorted];
  const out: Movie[] = [];

  while (remaining.length > 0) {
    const avoid = new Set<string>();
    if (out.length >= 1) {
      avoid.add(primaryGenreKey(out[out.length - 1]!));
    }
    if (out.length >= 2) {
      avoid.add(primaryGenreKey(out[out.length - 2]!));
    }

    let pickIndex = -1;
    for (let i = 0; i < remaining.length; i++) {
      const p = primaryGenreKey(remaining[i]!);
      if (!avoid.has(p)) {
        pickIndex = i;
        break;
      }
    }

    if (pickIndex === -1) {
      pickIndex = 0;
    }

    const [next] = remaining.splice(pickIndex, 1);
    out.push(next!);
  }

  return out;
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

  const calendarYear = new Date().getFullYear();
  const pool = dedupeMoviesById(movies);
  const moviesById = new Map(pool.map((m) => [m.id, m]));
  const nowMs = discoverVisibilityTimestamp;

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

  const acceptedMovies = pool.filter((movie) => acceptedIds.has(movie.id));

  const genreAffinity = currentUserId
    ? buildDiscoverGenreAffinity(acceptedMovies, pickEngagement, moviesById)
    : new Map<string, number>();

  const rejectedGenreWeights = currentUserId
    ? buildRejectedGenreWeights(swipes, moviesById, currentUserId, nowMs)
    : new Map<string, number>();

  const tasteYear = currentUserId
    ? computeTasteYearProfile(
        acceptedMovies,
        pickEngagement,
        moviesById,
        calendarYear,
      )
    : { center: calendarYear - 4, spread: 14, classicEngaged: false };

  const userSwipeCount = currentUserId
    ? swipes.filter((s) => s.userId === currentUserId).length
    : 0;
  const personalizationW = currentUserId
    ? computeDiscoverPersonalizationWeight(userSwipeCount, pickEngagement.length)
    : 1;
  const cold = 1 - personalizationW;

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
        const preferenceMatchScore = computeDiscoverPreferenceBlend(
          movie,
          personalizationW,
          {
            genreAffinity,
            rejectedGenreWeights,
            onboarding: onboardingPreferences,
          },
        );

        const mediaPreferenceBonus =
          onboardingPreferences.mediaPreference === "both" ||
          onboardingPreferences.mediaPreference === movie.mediaType
            ? 5
            : -6;

        const pop =
          popularityBoost(movie) * (1 + 0.55 * cold);
        const yearGuest = Math.min(
          22,
          ((movie.year - 1980) / Math.max(1, calendarYear - 1980)) * 22,
        );
        const yearPersonal = yearPreferenceScore(
          movie.year,
          tasteYear,
          calendarYear,
        );
        const yearScore = currentUserId
          ? (1 - personalizationW) * yearGuest + personalizationW * yearPersonal
          : yearGuest;

        const recencyDeck = recencyDeckBoost(movie.year, calendarYear, tasteYear);

        return (
          preferenceMatchScore * 1.24 +
          mediaPreferenceBonus +
          pop * 1.28 +
          yearScore +
          recencyDeck
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
    const filtered = pool.filter(
      (movie) =>
        passesDiscoverListEligibility(movie, calendarYear) &&
        !hiddenMovieIds.has(movie.id),
    );
    return rotateDiscoverQueue(diversifyDiscoverQueue(sortDiscoverQueue(filtered)));
  }

  return rotateDiscoverQueue(
    diversifyDiscoverQueue(
      sortBySessionShuffle(
        pool.filter((movie) => passesDiscoverListEligibility(movie, calendarYear)),
      ),
    ),
  );
}
