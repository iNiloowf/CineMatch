const FEATURE_INTRO_SEEN_KEY = "cinematch-feature-intro-seen";

/** True after the pre-signup intro has played once on this device. */
export function hasSeenFeatureIntro(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    return window.localStorage.getItem(FEATURE_INTRO_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markFeatureIntroSeen(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(FEATURE_INTRO_SEEN_KEY, "1");
  } catch {
    // Ignore storage failures.
  }
}
