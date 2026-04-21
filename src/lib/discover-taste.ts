import type { Movie, SwipeRecord } from "@/lib/types";

export type DiscoverPickEngagement = {
  movieId: string;
  recommended: boolean;
};

export function normalizeDiscoverGenreKey(entry: string) {
  const normalized = entry.trim().toLowerCase();
  if (!normalized || normalized === "movie" || normalized === "series") {
    return null;
  }
  return normalized;
}

export function buildGenreCountsFromAcceptedMovies(acceptedMovies: Movie[]) {
  return acceptedMovies.reduce<Map<string, number>>((counts, movie) => {
    movie.genre.forEach((entry) => {
      const key = normalizeDiscoverGenreKey(entry);
      if (!key) {
        return;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return counts;
  }, new Map<string, number>());
}

export function mergePickEngagementIntoGenreCounts(
  base: Map<string, number>,
  pickEngagement: DiscoverPickEngagement[],
  moviesById: Map<string, Movie>,
) {
  for (const { movieId, recommended } of pickEngagement) {
    const movie = moviesById.get(movieId);
    if (!movie) {
      continue;
    }
    const weight = recommended ? 2.35 : 0.42;
    movie.genre.forEach((entry) => {
      const key = normalizeDiscoverGenreKey(entry);
      if (!key) {
        return;
      }
      base.set(key, (base.get(key) ?? 0) + weight);
    });
  }
}

/** Half-life ~24 days — recent passes weigh more; old fades so one-off rejects don’t dominate. */
const REJECT_GENRE_HALF_LIFE_DAYS = 24;
const REJECT_PER_GENRE_STRENGTH = 0.48;

export function buildRejectedGenreWeights(
  swipes: SwipeRecord[],
  moviesById: Map<string, Movie>,
  currentUserId: string,
  nowMs: number,
): Map<string, number> {
  const weights = new Map<string, number>();

  for (const swipe of swipes) {
    if (swipe.userId !== currentUserId || swipe.decision !== "rejected") {
      continue;
    }

    const movie = moviesById.get(swipe.movieId);
    if (!movie) {
      continue;
    }

    const rejectedAt = new Date(swipe.createdAt).getTime();
    if (!Number.isFinite(rejectedAt)) {
      continue;
    }

    const ageDays = Math.max(0, (nowMs - rejectedAt) / (86_400 * 1000));
    const decay = Math.pow(0.5, ageDays / REJECT_GENRE_HALF_LIFE_DAYS);
    const increment = REJECT_PER_GENRE_STRENGTH * decay;

    movie.genre.forEach((entry) => {
      const key = normalizeDiscoverGenreKey(entry);
      if (!key) {
        return;
      }
      weights.set(key, (weights.get(key) ?? 0) + increment);
    });
  }

  return weights;
}

export function buildDiscoverGenreAffinity(
  acceptedMovies: Movie[],
  pickEngagement: DiscoverPickEngagement[],
  moviesById: Map<string, Movie>,
): Map<string, number> {
  const map = buildGenreCountsFromAcceptedMovies(acceptedMovies);
  mergePickEngagementIntoGenreCounts(map, pickEngagement, moviesById);
  return map;
}

export function computeTasteYearProfile(
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

/** Small adjustment to 28–98 match display from release-year fit (Discover only). */
export function discoverYearMatchNudge(
  movieYear: number,
  taste: { center: number; spread: number; classicEngaged: boolean },
  calendarYear: number,
): number {
  const { center, spread, classicEngaged } = taste;
  const diff = Math.abs(movieYear - center);
  let nudge = (1 - Math.min(1, diff / (spread * 2.2))) * 5;

  if (!classicEngaged && center >= 2002 && movieYear < 1988) {
    nudge -= 4;
  }
  if (classicEngaged && movieYear < 1985) {
    nudge += 2;
  }

  const recency = (movieYear - 1975) / Math.max(1, calendarYear - 1975);
  nudge += (recency - 0.5) * 2.5;

  return Math.max(-7, Math.min(7, nudge));
}
