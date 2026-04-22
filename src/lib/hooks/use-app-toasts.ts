"use client";

import { useCallback, useState } from "react";
import type { Achievement, MutualMatchToastPayload } from "@/lib/types";

/** Achievement unlock banner + mutual-match toast (Discover swipe). */
export function useAppToasts() {
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [mutualMatchToast, setMutualMatchToast] = useState<MutualMatchToastPayload | null>(null);

  const dismissUnlockedAchievement = useCallback(() => {
    setUnlockedAchievement(null);
  }, []);

  const dismissMutualMatchToast = useCallback(() => {
    setMutualMatchToast(null);
  }, []);

  return {
    unlockedAchievement,
    mutualMatchToast,
    dismissUnlockedAchievement,
    dismissMutualMatchToast,
    setUnlockedAchievement,
    setMutualMatchToast,
  };
}
