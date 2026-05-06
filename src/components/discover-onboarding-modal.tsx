"use client";

import { useCallback, useEffect, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
import { FAVORITE_GENRE_LIMIT } from "@/lib/discover-constants";
import { onboardingIntroSessionStorageKey } from "@/lib/app-state/constants";

const ONBOARDING_STEP_COUNT = 3;

export type DiscoverOnboardingModalProps = {
  currentUserId: string | null;
  isReady: boolean;
  isSyncingAccountData: boolean;
  isOnboardingComplete: boolean;
  isDarkMode: boolean;
  onboardingPreferences: {
    favoriteGenres: string[];
    dislikedGenres: string[];
    mediaPreference: "movie" | "series" | "both";
    tasteProfile: string[];
    completedAt: string | null;
  };
  onboardingGenres: string[];
  completeOnboarding: (payload: {
    favoriteGenres: string[];
    dislikedGenres: string[];
    mediaPreference: "movie" | "series" | "both";
    tasteProfile: string[];
  }) => Promise<void>;
};

export function DiscoverOnboardingModal({
  currentUserId,
  isReady,
  isSyncingAccountData,
  isOnboardingComplete,
  isDarkMode,
  onboardingPreferences,
  onboardingGenres,
  completeOnboarding,
}: DiscoverOnboardingModalProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [isSavingOnboarding, setIsSavingOnboarding] = useState(false);
  const [onboardingFavorites, setOnboardingFavorites] = useState<string[]>(
    onboardingPreferences.favoriteGenres,
  );
  const [onboardingDisliked, setOnboardingDisliked] = useState<string[]>(
    onboardingPreferences.dislikedGenres,
  );
  const [onboardingMediaPreference, setOnboardingMediaPreference] = useState<
    "movie" | "series" | "both"
  >(onboardingPreferences.mediaPreference);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const open =
    Boolean(currentUserId) &&
    isReady &&
    !isSyncingAccountData &&
    !isOnboardingComplete;

  useEffect(() => {
    if (!currentUserId) {
      setShowIntro(true);
      return;
    }
    try {
      setShowIntro(
        !window.sessionStorage.getItem(onboardingIntroSessionStorageKey(currentUserId)),
      );
    } catch {
      setShowIntro(true);
    }
  }, [currentUserId]);

  useEffect(() => {
    setOnboardingFavorites(onboardingPreferences.favoriteGenres);
    setOnboardingDisliked(onboardingPreferences.dislikedGenres);
    setOnboardingMediaPreference(onboardingPreferences.mediaPreference);
  }, [onboardingPreferences]);

  useEffect(() => {
    if (!isOnboardingComplete) {
      setOnboardingStep(0);
    }
  }, [isOnboardingComplete]);

  const onboardingDislikeGenreOptions = onboardingGenres.filter(
    (genre) => !onboardingFavorites.includes(genre),
  );

  const toggleOnboardingFavoriteGenre = useCallback((genre: string) => {
    setOnboardingFavorites((current) => {
      if (current.includes(genre)) {
        return current.filter((entry) => entry !== genre);
      }
      if (current.length >= FAVORITE_GENRE_LIMIT) {
        return current;
      }
      setOnboardingDisliked((disliked) => disliked.filter((entry) => entry !== genre));
      return [...current, genre];
    });
  }, []);

  const dismissIntroAndContinue = useCallback(() => {
    if (currentUserId) {
      try {
        window.sessionStorage.setItem(
          onboardingIntroSessionStorageKey(currentUserId),
          "1",
        );
      } catch {
        // Ignore storage failures.
      }
    }
    setShowIntro(false);
  }, [currentUserId]);

  const persistOnboarding = async (skipSelection: boolean) => {
    setIsSavingOnboarding(true);
    const favoriteGenres = skipSelection
      ? []
      : Array.from(
          new Set(
            onboardingFavorites.filter(
              (genre) => !onboardingDisliked.includes(genre),
            ),
          ),
        );
    const dislikedGenres = skipSelection
      ? []
      : Array.from(
          new Set(
            onboardingDisliked.filter((genre) => !favoriteGenres.includes(genre)),
          ),
        );
    await completeOnboarding({
      favoriteGenres,
      dislikedGenres,
      mediaPreference: onboardingMediaPreference,
      tasteProfile: onboardingPreferences.tasteProfile,
    });
    setIsSavingOnboarding(false);
  };

  return (
    <ModalPortal open={open}>
      <div className="ui-overlay z-[var(--z-overlay)] bg-slate-950/55 backdrop-blur-md">
        <div
          className={`ui-shell ui-shell--dialog-md relative z-10 flex max-h-[min(90dvh,44rem)] flex-col overflow-hidden rounded-[28px] border ${
            isDarkMode
              ? "border-white/10 bg-slate-950 text-slate-100"
              : "border-slate-200/90 bg-white text-slate-900"
          }`}
        >
          <span className="ui-modal-accent-bar" aria-hidden />
          <div className="ui-shell-header shrink-0">
            <div className="min-w-0 flex-1">
              {showIntro ? (
                <>
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      isDarkMode ? "text-violet-300/90" : "text-violet-600/90"
                    }`}
                  >
                    Quick setup
                  </p>
                  <p className="mt-1 text-lg font-semibold">A few questions first</p>
                  <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    We’d like to ask a few short questions so Discover can run smoothly and match
                    titles better for you on this device.
                  </p>
                </>
              ) : (
                <>
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      isDarkMode ? "text-violet-300/90" : "text-violet-600/90"
                    }`}
                  >
                    Step {onboardingStep + 1} of {ONBOARDING_STEP_COUNT}
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    {["Movies or series?", "Favorite genres", "Genres to skip"][onboardingStep] ??
                      "Tune Discover"}
                  </p>
                  <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {[
                      "Pick what Discover should prioritize.",
                      `Select up to ${FAVORITE_GENRE_LIMIT} genres you want more of (A–Z).`,
                      "Tap genres you usually avoid. Favorites are hidden so they won’t clash.",
                    ][onboardingStep] ?? ""}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="ui-shell-body !min-h-0 !flex-1 !overflow-y-auto !pt-3">
            {showIntro ? (
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                This only takes a moment. You can skip if you prefer to jump in right away.
              </p>
            ) : null}
            {!showIntro && onboardingStep === 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { id: "movie" as const, label: "Movies" },
                  { id: "series" as const, label: "Series" },
                  { id: "both" as const, label: "Both" },
                ].map((option) => {
                  const selected = onboardingMediaPreference === option.id;
                  return (
                    <button
                      key={`ob-media-${option.id}`}
                      type="button"
                      onClick={() => setOnboardingMediaPreference(option.id)}
                      className={`min-h-[2.75rem] w-full rounded-[14px] px-3 py-2.5 text-center text-sm font-semibold transition ${
                        selected
                          ? isDarkMode
                            ? "bg-white/[0.06] text-white shadow-[inset_0_0_0_2px_rgba(167,139,250,0.95)] ring-0"
                            : "bg-slate-50 text-violet-900 shadow-[inset_0_0_0_2px_rgba(124,58,237,0.85)]"
                          : isDarkMode
                            ? "border border-white/12 bg-white/8 text-slate-200 hover:bg-white/10"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {!showIntro && onboardingStep === 1 ? (
              <div>
                <p
                  className={`mb-3 text-xs font-semibold ${
                    isDarkMode ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {onboardingFavorites.length}/{FAVORITE_GENRE_LIMIT} selected
                </p>
                <ul className="grid list-none grid-cols-2 gap-2">
                  {onboardingGenres.map((genre) => (
                    <li key={`ob-like-${genre}`}>
                      <button
                        type="button"
                        onClick={() => toggleOnboardingFavoriteGenre(genre)}
                        className={`flex min-h-[2.75rem] w-full items-center justify-center rounded-[14px] px-2 py-2 text-center text-sm font-semibold leading-tight ${
                          onboardingFavorites.includes(genre)
                            ? "bg-violet-600 text-white"
                            : isDarkMode
                              ? "border border-white/12 bg-white/8 text-slate-200"
                              : "border border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {genre}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {!showIntro && onboardingStep === 2 ? (
              <div>
                {onboardingDislikeGenreOptions.length === 0 ? (
                  <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    No other genres left to exclude — you already favor all available genres.
                  </p>
                ) : (
                  <ul className="grid list-none grid-cols-2 gap-2">
                    {onboardingDislikeGenreOptions.map((genre) => (
                      <li key={`ob-dislike-${genre}`}>
                        <button
                          type="button"
                          onClick={() =>
                            setOnboardingDisliked((current) =>
                              current.includes(genre)
                                ? current.filter((entry) => entry !== genre)
                                : [...current, genre],
                            )
                          }
                          className={`flex min-h-[2.75rem] w-full items-center justify-center rounded-[14px] px-2 py-2 text-center text-sm font-semibold leading-tight ${
                            onboardingDisliked.includes(genre)
                              ? "bg-rose-600 text-white"
                              : isDarkMode
                                ? "border border-white/12 bg-white/8 text-slate-200"
                                : "border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {genre}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </div>
          <div className="ui-shell-footer !flex !w-full !flex-col !gap-2 !pt-3">
            {showIntro ? (
              <>
                <button
                  type="button"
                  disabled={isSavingOnboarding}
                  onClick={() => {
                    void persistOnboarding(true);
                  }}
                  className="ui-btn ui-btn-secondary w-full justify-center"
                >
                  Skip setup
                </button>
                <button
                  type="button"
                  disabled={isSavingOnboarding}
                  onClick={dismissIntroAndContinue}
                  className="ui-btn ui-btn-primary w-full justify-center"
                >
                  Continue
                </button>
              </>
            ) : onboardingStep === 0 ? (
              <button
                type="button"
                disabled={isSavingOnboarding}
                onClick={() => {
                  void persistOnboarding(true);
                }}
                className="ui-btn ui-btn-secondary w-full justify-center"
              >
                Skip setup
              </button>
            ) : (
              <button
                type="button"
                disabled={isSavingOnboarding}
                onClick={() => setOnboardingStep((step) => Math.max(0, step - 1))}
                className="ui-btn ui-btn-secondary w-full justify-center"
              >
                Back
              </button>
            )}
            {!showIntro && onboardingStep < ONBOARDING_STEP_COUNT - 1 ? (
              <button
                type="button"
                disabled={isSavingOnboarding}
                onClick={() =>
                  setOnboardingStep((step) =>
                    Math.min(ONBOARDING_STEP_COUNT - 1, step + 1),
                  )
                }
                className="ui-btn ui-btn-primary w-full justify-center"
              >
                Continue
              </button>
            ) : null}
            {!showIntro && onboardingStep === ONBOARDING_STEP_COUNT - 1 ? (
              <button
                type="button"
                disabled={isSavingOnboarding}
                onClick={() => {
                  void persistOnboarding(false);
                }}
                className="ui-btn ui-btn-primary w-full justify-center"
              >
                {isSavingOnboarding ? "Saving..." : "Start Discovering"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
