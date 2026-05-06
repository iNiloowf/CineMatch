/** localStorage pointer to the active account (demo or Supabase user id). */
export const CURRENT_USER_KEY = "cinematch-current-user-v5";

/** sessionStorage: user dismissed the Discover onboarding intro this tab session. */
export function onboardingIntroSessionStorageKey(userId: string) {
  return `cinematch-onboarding-intro-${userId}`;
}
