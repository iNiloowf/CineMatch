export type WeeklyAcceptedSwipe = {
  movieId: string;
  userId: string;
};

export type WeeklyMovieLikeRank = {
  movieId: string;
  likeCount: number;
};

/** Monday 00:00 UTC through `now` (ISO week-style, Monday start). */
export function utcWeekRange(now = new Date()): { start: Date; end: Date } {
  const end = new Date(now.getTime());
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const weekday = start.getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  start.setUTCDate(start.getUTCDate() - daysFromMonday);
  start.setUTCHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Rank movies by how many distinct users accepted (liked) them.
 * Duplicate user+movie rows count once.
 */
export function rankMoviesByWeeklyLikes(
  swipes: WeeklyAcceptedSwipe[],
  limit = 25,
): WeeklyMovieLikeRank[] {
  const usersByMovie = new Map<string, Set<string>>();
  for (const swipe of swipes) {
    const movieId = swipe.movieId.trim();
    const userId = swipe.userId.trim();
    if (!movieId || !userId) {
      continue;
    }
    let users = usersByMovie.get(movieId);
    if (!users) {
      users = new Set();
      usersByMovie.set(movieId, users);
    }
    users.add(userId);
  }

  return Array.from(usersByMovie.entries())
    .map(([movieId, users]) => ({ movieId, likeCount: users.size }))
    .sort((a, b) => b.likeCount - a.likeCount || a.movieId.localeCompare(b.movieId))
    .slice(0, Math.max(0, limit));
}
