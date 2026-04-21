import { describe, expect, it } from "vitest";
import { computeMovieMatchPercent } from "@/lib/match-score";
import type { Movie } from "@/lib/types";

const baseMovie: Movie = {
  id: "m1",
  title: "Test",
  mediaType: "movie",
  year: 2020,
  runtime: "100 min",
  rating: 7.5,
  genre: ["Comedy"],
  description: "",
  poster: {
    eyebrow: "",
    accentFrom: "",
    accentTo: "",
  },
};

describe("computeMovieMatchPercent", () => {
  it("returns a score in the clamped match range", () => {
    const score = computeMovieMatchPercent(baseMovie);
    expect(score).toBeGreaterThanOrEqual(28);
    expect(score).toBeLessThanOrEqual(98);
  });

  it("does not use IMDb — high rating alone cannot max the dial", () => {
    const popular = computeMovieMatchPercent({ ...baseMovie, rating: 9.4 });
    const mid = computeMovieMatchPercent({ ...baseMovie, rating: 5.0 });
    expect(popular).toBe(mid);
  });

  it("penalizes a disliked genre more than a favorite lifts (same title)", () => {
    const mixed = computeMovieMatchPercent(
      { ...baseMovie, genre: ["Comedy", "Drama"] },
      {
        onboarding: {
          favoriteGenres: ["Drama"],
          dislikedGenres: ["Comedy"],
          mediaPreference: "both",
        },
      },
    );
    const dramaOnly = computeMovieMatchPercent(
      { ...baseMovie, genre: ["Drama"] },
      {
        onboarding: {
          favoriteGenres: ["Drama"],
          dislikedGenres: ["Comedy"],
          mediaPreference: "both",
        },
      },
    );
    expect(mixed).toBeLessThan(dramaOnly);
  });
});
