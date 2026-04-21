import type { Movie } from "@/lib/types";

/** Aligned with `GET /api/movies` discover filtering. */
export const MIN_DISCOVER_RATING = 3;
export const MIN_DISCOVER_RUNTIME_MINUTES = 20;
const MIN_DISCOVER_YEAR = 1880;

export function getRuntimeMinutes(runtimeLabel: string) {
  if (!runtimeLabel || runtimeLabel === "N/A") {
    return null;
  }

  const hoursMatch = runtimeLabel.match(/(\d+)h/);
  const minutesMatch = runtimeLabel.match(/(\d+)m/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  const totalMinutes = hours * 60 + minutes;

  return totalMinutes > 0 ? totalMinutes : null;
}

export function passesDiscoverQualityThreshold(movie: Movie) {
  if (movie.rating < MIN_DISCOVER_RATING) {
    return false;
  }

  const runtimeMinutes = getRuntimeMinutes(movie.runtime);

  if (runtimeMinutes !== null && runtimeMinutes < MIN_DISCOVER_RUNTIME_MINUTES) {
    return false;
  }

  return true;
}

/** Discover list only — hide titles whose release year is still in the future (best we can with `year` only). */
export function passesDiscoverReleased(movie: Movie, calendarYear: number): boolean {
  if (!Number.isFinite(movie.year)) {
    return false;
  }
  if (movie.year < MIN_DISCOVER_YEAR) {
    return false;
  }
  return movie.year <= calendarYear;
}

/** Full Discover eligibility: quality + released (used by API list + `buildDiscoverQueue`). */
export function passesDiscoverListEligibility(movie: Movie, calendarYear: number): boolean {
  return passesDiscoverQualityThreshold(movie) && passesDiscoverReleased(movie, calendarYear);
}
