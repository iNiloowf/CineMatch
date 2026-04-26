"use client";

import { useCallback, useState } from "react";
import type {
  Achievement,
  FriendLinkNotifyPayload,
  MutualMatchToastPayload,
} from "@/lib/types";

/** Achievement unlock banner + mutual-match toast (Discover swipe) + friend link toasts. */
export function useAppToasts() {
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [mutualMatchToast, setMutualMatchToast] = useState<MutualMatchToastPayload | null>(null);
  const [friendLinkNotifyToast, setFriendLinkNotifyToast] = useState<FriendLinkNotifyPayload | null>(null);

  const dismissUnlockedAchievement = useCallback(() => {
    setUnlockedAchievement(null);
  }, []);

  const dismissMutualMatchToast = useCallback(() => {
    setMutualMatchToast(null);
  }, []);

  const dismissFriendLinkNotifyToast = useCallback(() => {
    setFriendLinkNotifyToast(null);
  }, []);

  return {
    unlockedAchievement,
    mutualMatchToast,
    friendLinkNotifyToast,
    dismissUnlockedAchievement,
    dismissMutualMatchToast,
    dismissFriendLinkNotifyToast,
    setUnlockedAchievement,
    setMutualMatchToast,
    setFriendLinkNotifyToast,
  };
}
