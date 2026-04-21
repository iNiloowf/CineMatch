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
});
