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

function buildAcceptedGenreCounts(acceptedMovies: Movie[]) {
  return acceptedMovies.reduce<Map<string, number>>((counts, movie) => {
    movie.genre.forEach((entry) => {
      const normalized = entry.trim().toLowerCase();

      if (!normalized || normalized === "movie" || normalized === "series") {
        return;
      }

      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    });

    return counts;
  }, new Map<string, number>());
}

/**
 * Computes the ordered Discover deck: quality filter, swipe visibility, match scoring, shuffle, rotation.
 * Shared logic for `app-state` (was inlined in `app-state.tsx`).
 */
export function buildDiscoverQueue(options: {
  movies: Movie[];
  swipes: SwipeRecord[];
  currentUserId: string | null;
  discoverShuffleSeed: string;
  discoverStartOffset: number;
  discoverVisibilityTimestamp: number;
  onboardingPreferences: OnboardingPreferences;
}): Movie[] {
  const {
    movies,
    swipes,
    currentUserId,
    discoverShuffleSeed,
    discoverStartOffset,
    discoverVisibilityTimestamp,
    onboardingPreferences,
  } = options;

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
  const acceptedGenreCounts = buildAcceptedGenreCounts(acceptedMovies);

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
        const acceptedGenreAffinity = movie.genre.reduce(
          (score, entry) => score + (acceptedGenreCounts.get(entry.trim().toLowerCase()) ?? 0),
          0,
        );
        const preferenceMatchScore = computeMovieMatchPercent(movie, {
          acceptedGenres: acceptedGenreCounts.keys(),
          onboarding: onboardingPreferences,
        });
        const mediaPreferenceBonus =
          onboardingPreferences.mediaPreference === "both" ||
          onboardingPreferences.mediaPreference === movie.mediaType
            ? 5
            : -6;

        return preferenceMatchScore + acceptedGenreAffinity * 3 + mediaPreferenceBonus;
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
