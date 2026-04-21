import { DISCOVER_REJECT_HIDE_WINDOW_MS } from "@/lib/discover-constants";
import { passesDiscoverQualityThreshold } from "@/lib/discover-quality";
import {
  buildDiscoverGenreAffinity,
  buildRejectedGenreWeights,
  computeTasteYearProfile,
  normalizeDiscoverGenreKey,
} from "@/lib/discover-taste";
import type { DiscoverPickEngagement } from "@/lib/discover-taste";
import { computeMovieMatchPercent } from "@/lib/match-score";
import type { Movie, OnboardingPreferences, SwipeRecord } from "@/lib/types";

export type { DiscoverPickEngagement } from "@/lib/discover-taste";

export function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
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

  const acceptedMovies = movies.filter((movie) => acceptedIds.has(movie.id));

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
        const rejectOverlap = movie.genre.reduce((sum, entry) => {
          const key = normalizeDiscoverGenreKey(entry);
          return key ? sum + (rejectedGenreWeights.get(key) ?? 0) : sum;
        }, 0);

        const preferenceMatchScore = computeMovieMatchPercent(movie, {
          genreAffinityWeights: genreAffinity,
          rejectedGenreWeights,
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
          : Math.min(
              22,
              ((movie.year - 1980) / Math.max(1, calendarYear - 1980)) * 22,
            );

        return (
          preferenceMatchScore +
          mediaPreferenceBonus +
          pop +
          yearScore -
          Math.min(22, rejectOverlap * 3.6)
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
