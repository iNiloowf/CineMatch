import type { Movie } from "@/lib/types";

/** Aligned with `GET /api/movies` discover filtering. */
export const MIN_DISCOVER_RATING = 3;
export const MIN_DISCOVER_RUNTIME_MINUTES = 20;

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
