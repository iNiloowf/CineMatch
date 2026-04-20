import { describe, expect, it } from "vitest";
import { buildDiscoverQueue, hashString } from "@/lib/discover-queue";
import type { Movie, OnboardingPreferences, SwipeRecord } from "@/lib/types";

const onboarding: OnboardingPreferences = {
  favoriteGenres: [],
  dislikedGenres: [],
  mediaPreference: "both",
  tasteProfile: [],
  completedAt: null,
};

function mkMovie(id: string, rating = 7): Movie {
  return {
    id,
    title: id,
    mediaType: "movie",
    year: 2020,
    runtime: "90 min",
    rating,
    genre: ["Action"],
    description: "",
    poster: { eyebrow: "", accentFrom: "#000", accentTo: "#111" },
  };
}

describe("discover-queue", () => {
  it("hashString is deterministic", () => {
    expect(hashString("a")).toBe(hashString("a"));
    expect(hashString("a")).not.toBe(hashString("b"));
  });

  it("buildDiscoverQueue returns only quality-passing titles when no user", () => {
    const low = mkMovie("low", 2);
    const ok = mkMovie("ok", 7);
    const q = buildDiscoverQueue({
      movies: [low, ok],
      swipes: [],
      currentUserId: null,
      discoverShuffleSeed: "seed",
      discoverStartOffset: 0,
      discoverVisibilityTimestamp: Date.now(),
      onboardingPreferences: onboarding,
    });
    expect(q.map((m) => m.id)).toContain("ok");
    expect(q.map((m) => m.id)).not.toContain("low");
  });

  it("buildDiscoverQueue hides accepted swipes for current user", () => {
    const a = mkMovie("a");
    const b = mkMovie("b");
    const swipes: SwipeRecord[] = [
      {
        userId: "u1",
        movieId: "a",
        decision: "accepted",
        createdAt: new Date().toISOString(),
      },
    ];
    const q = buildDiscoverQueue({
      movies: [a, b],
      swipes,
      currentUserId: "u1",
      discoverShuffleSeed: "x",
      discoverStartOffset: 0,
      discoverVisibilityTimestamp: Date.now(),
      onboardingPreferences: onboarding,
    });
    expect(q.map((m) => m.id)).not.toContain("a");
    expect(q.map((m) => m.id)).toContain("b");
  });
});
