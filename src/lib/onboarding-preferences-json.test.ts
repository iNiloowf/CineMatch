import { describe, expect, it } from "vitest";
import {
  parseOnboardingPreferencesFromJson,
  readOnboardingFromUserMetadata,
} from "@/lib/onboarding-preferences-json";

describe("onboarding preferences json", () => {
  it("ignores unfinished payloads", () => {
    expect(parseOnboardingPreferencesFromJson({ favoriteGenres: ["Drama"] })).toBeNull();
  });

  it("reads a completed copy from auth user metadata", () => {
    const parsed = readOnboardingFromUserMetadata({
      onboarding_preferences: {
        favoriteGenres: ["Drama"],
        dislikedGenres: ["Horror"],
        mediaPreference: "movie",
        tasteProfile: [],
        completedAt: "2026-01-02T00:00:00.000Z",
      },
    });
    expect(parsed?.completedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(parsed?.favoriteGenres).toEqual(["Drama"]);
    expect(parsed?.dislikedGenres).toEqual(["Horror"]);
  });
});
