import { describe, expect, it } from "vitest";
import {
  getRuntimeMinutes,
  MIN_DISCOVER_RATING,
  MIN_DISCOVER_RUNTIME_MINUTES,
  DISCOVER_ERA_FLOOR_YEAR,
  passesDiscoverListEligibility,
  passesDiscoverQualityThreshold,
  passesDiscoverReleased,
} from "@/lib/discover-quality";
import type { Movie } from "@/lib/types";

function movie(over: Partial<Movie> & Pick<Movie, "id">): Movie {
  return {
    id: over.id,
    title: over.title ?? "T",
    mediaType: over.mediaType ?? "movie",
    year: over.year ?? 2020,
    runtime: over.runtime ?? "90 min",
    rating: over.rating ?? 7,
    genre: over.genre ?? ["Drama"],
    description: over.description ?? "",
    poster: over.poster ?? { eyebrow: "", accentFrom: "#000", accentTo: "#111" },
  };
}

describe("discover-quality", () => {
  it("getRuntimeMinutes parses h and m", () => {
    expect(getRuntimeMinutes("2h 15m")).toBe(135);
    expect(getRuntimeMinutes("45m")).toBe(45);
    expect(getRuntimeMinutes("N/A")).toBeNull();
    expect(getRuntimeMinutes("")).toBeNull();
  });

  it("passesDiscoverQualityThreshold rejects low rating", () => {
    const m = movie({ id: "a", rating: MIN_DISCOVER_RATING - 0.5 });
    expect(passesDiscoverQualityThreshold(m)).toBe(false);
  });

  it("passesDiscoverQualityThreshold rejects short runtime", () => {
    const m = movie({
      id: "b",
      rating: MIN_DISCOVER_RATING,
      runtime: `${MIN_DISCOVER_RUNTIME_MINUTES - 1}m`,
    });
    expect(passesDiscoverQualityThreshold(m)).toBe(false);
  });

  it("passesDiscoverQualityThreshold accepts solid movie", () => {
    const m = movie({
      id: "c",
      rating: MIN_DISCOVER_RATING,
      runtime: `${MIN_DISCOVER_RUNTIME_MINUTES} min`,
    });
    expect(passesDiscoverQualityThreshold(m)).toBe(true);
  });

  it("passesDiscoverReleased rejects future release years", () => {
    const cy = 2026;
    expect(passesDiscoverReleased(movie({ id: "f", year: 2027 }), cy)).toBe(false);
    expect(passesDiscoverReleased(movie({ id: "ok", year: 2026 }), cy)).toBe(true);
  });

  it("passesDiscoverReleased rejects years before the discover era floor", () => {
    const cy = 2026;
    expect(
      passesDiscoverReleased(movie({ id: "nineties", year: 1994 }), cy),
    ).toBe(false);
    expect(
      passesDiscoverReleased(
        movie({ id: "edge", year: DISCOVER_ERA_FLOOR_YEAR }),
        cy,
      ),
    ).toBe(true);
  });

  it("passesDiscoverReleased allows pre-floor when era floor is disabled", () => {
    const cy = 2026;
    expect(
      passesDiscoverReleased(
        movie({ id: "classic", year: 1994 }),
        cy,
        { eraFloorYear: null },
      ),
    ).toBe(true);
  });

  it("passesDiscoverListEligibility combines quality and release", () => {
    const cy = 2026;
    const good = movie({
      id: "g",
      rating: MIN_DISCOVER_RATING,
      runtime: `${MIN_DISCOVER_RUNTIME_MINUTES} min`,
      year: 2025,
    });
    expect(passesDiscoverListEligibility(good, cy)).toBe(true);
    expect(passesDiscoverListEligibility({ ...good, year: 2028 }, cy)).toBe(
      false,
    );
  });

  it("passesDiscoverListEligibility rejects pre-era-floor titles in default mode", () => {
    const cy = 2026;
    const legacy = movie({
      id: "legacy",
      year: 1990,
      rating: MIN_DISCOVER_RATING,
      runtime: `${MIN_DISCOVER_RUNTIME_MINUTES} min`,
    });
    expect(passesDiscoverListEligibility(legacy, cy)).toBe(false);
    expect(
      passesDiscoverListEligibility(legacy, cy, { eraFloorYear: null }),
    ).toBe(true);
  });
});
