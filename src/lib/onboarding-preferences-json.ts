import type { OnboardingPreferences } from "@/lib/types";

/**
 * Parses `settings.onboarding_preferences` from Supabase (jsonb).
 * Returns a full preference object only when `completedAt` is set (finished flow).
 */
export function parseOnboardingPreferencesFromJson(
  raw: unknown,
): OnboardingPreferences | null {
  if (raw == null) {
    return null;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const completedAt =
    typeof o.completedAt === "string" && o.completedAt.length > 0
      ? o.completedAt
      : null;
  if (!completedAt) {
    return null;
  }

  const favoriteGenres = Array.isArray(o.favoriteGenres)
    ? o.favoriteGenres.filter((entry): entry is string => typeof entry === "string")
    : [];
  const dislikedGenres = Array.isArray(o.dislikedGenres)
    ? o.dislikedGenres.filter((entry): entry is string => typeof entry === "string")
    : [];
  const mediaPreference =
    o.mediaPreference === "movie" ||
    o.mediaPreference === "series" ||
    o.mediaPreference === "both"
      ? o.mediaPreference
      : "both";
  const tasteProfile = Array.isArray(o.tasteProfile)
    ? o.tasteProfile.filter((entry): entry is string => typeof entry === "string")
    : [];

  return {
    favoriteGenres,
    dislikedGenres,
    mediaPreference,
    tasteProfile,
    completedAt,
  };
}
