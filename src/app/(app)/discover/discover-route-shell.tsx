"use client";

import { useAppState } from "@/lib/app-state";
import type { DiscoverPageContentProps } from "./discover-1-content";
import { DiscoverPage1Content } from "./discover-1-content";
import { DiscoverPage2Content } from "./discover-2-content";
import type { DiscoverAbVariant } from "@/lib/discover-ab";

export function useDiscoverPageContentProps(): DiscoverPageContentProps {
  const {
    currentUserId,
    currentUser,
    discoverQueue,
    discoverSessionKey,
    discoverStartOffset,
    discoverVisibilityTimestamp,
    registerMovies,
    swipeMovie,
    undoSwipe,
    isDarkMode,
    updateSettings,
    acceptInviteToken,
    createInviteLink,
    logout,
    onboardingPreferences,
    isOnboardingComplete,
    completeOnboarding,
    discoverGenreAffinity,
    discoverRejectedGenreWeights,
    discoverTasteYear,
    discoverPersonalizationWeight,
  } = useAppState();

  const toggleDarkMode = async () => {
    await updateSettings({ darkMode: !isDarkMode });
  };

  return {
    currentUserId,
    discoverQueue,
    discoverSessionKey,
    discoverStartOffset,
    discoverVisibilityTimestamp,
    registerMovies,
    swipeMovie,
    undoSwipe,
    isDarkMode,
    toggleDarkMode,
    createInviteLink,
    acceptInviteToken,
    logout,
    currentUserName: currentUser?.name ?? null,
    onboardingPreferences,
    isOnboardingComplete,
    completeOnboarding,
    discoverGenreAffinity,
    discoverRejectedGenreWeights,
    discoverTasteYear,
    discoverPersonalizationWeight,
  };
}

type DiscoverPageByVariantProps = {
  variant: DiscoverAbVariant;
};

export function DiscoverPageByVariant({ variant }: DiscoverPageByVariantProps) {
  const shellProps = useDiscoverPageContentProps();
  const routeKey = shellProps.currentUserId ?? "guest";
  if (variant === "discover2") {
    return <DiscoverPage2Content key={routeKey} {...shellProps} />;
  }
  return <DiscoverPage1Content key={routeKey} {...shellProps} />;
}
