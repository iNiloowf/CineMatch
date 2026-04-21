import { describe, expect, it } from "vitest";
import { buildDiscoverQueue, diversifyDiscoverQueue, hashString } from "@/lib/discover-queue";
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

  it("diversifyDiscoverQueue interleaves primary genres when alternatives exist", () => {
    const sorted = [
      { ...mkMovie("d1"), genre: ["Drama", "Movie"] },
      { ...mkMovie("d2"), genre: ["Drama"] },
      { ...mkMovie("c1"), genre: ["Comedy"] },
      { ...mkMovie("d3"), genre: ["Drama"] },
    ];
    const d = diversifyDiscoverQueue(sorted);
    expect(d.map((m) => m.id)).toEqual(["d1", "c1", "d2", "d3"]);
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

  it("buildDiscoverQueue dedupes duplicate movie ids", () => {
    const a = mkMovie("dup");
    const q = buildDiscoverQueue({
      movies: [a, { ...a, title: "Dup again" }],
      swipes: [],
      currentUserId: "u1",
      discoverShuffleSeed: "s",
      discoverStartOffset: 0,
      discoverVisibilityTimestamp: Date.now(),
      onboardingPreferences: onboarding,
    });
    expect(q.filter((m) => m.id === "dup")).toHaveLength(1);
  });

  it("buildDiscoverQueue excludes unreleased (future year) titles", () => {
    const future = { ...mkMovie("fut"), year: 2099 };
    const ok = mkMovie("ok");
    const q = buildDiscoverQueue({
      movies: [future, ok],
      swipes: [],
      currentUserId: null,
      discoverShuffleSeed: "s",
      discoverStartOffset: 0,
      discoverVisibilityTimestamp: Date.now(),
      onboardingPreferences: onboarding,
    });
    expect(q.map((m) => m.id)).not.toContain("fut");
    expect(q.map((m) => m.id)).toContain("ok");
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

  it("ranks 2023+ releases before 2022-and-older when taste is similar", () => {
    const y2022 = { ...mkMovie("y2022"), year: 2022 };
    const y2025 = { ...mkMovie("y2025"), year: 2025 };
    const q = buildDiscoverQueue({
      movies: [y2022, y2025],
      swipes: [],
      currentUserId: "u1",
      discoverShuffleSeed: "seed",
      discoverStartOffset: 0,
      discoverVisibilityTimestamp: Date.now(),
      onboardingPreferences: onboarding,
    });
    expect(q[0]?.id).toBe("y2025");
  });

  it("prefers recent titles over very old ones when taste is modern", () => {
    const old = { ...mkMovie("old-1972"), year: 1972 };
    const recent = { ...mkMovie("recent-2023"), year: 2023 };
    const prior = { ...mkMovie("recent-2022"), year: 2022 };
    const q = buildDiscoverQueue({
      movies: [old, recent, prior],
      swipes: [
        {
          userId: "u1",
          movieId: "recent-2022",
          decision: "accepted",
          createdAt: new Date().toISOString(),
        },
      ],
      currentUserId: "u1",
      discoverShuffleSeed: "seed",
      discoverStartOffset: 0,
      discoverVisibilityTimestamp: Date.now(),
      onboardingPreferences: onboarding,
      pickEngagement: [{ movieId: "recent-2022", recommended: true }],
    });
    expect(q[0]?.id).toBe("recent-2023");
  });
});
