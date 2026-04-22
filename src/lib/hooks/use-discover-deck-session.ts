"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { CURRENT_USER_KEY } from "@/lib/app-state/constants";
import { nextDiscoverShuffleSeedForUser, nextDiscoverStartOffset } from "@/lib/discover-deck-rng";
import { readPersistedDiscoverDeck } from "@/lib/discover-session";

/**
 * Discover deck ordering inputs (shuffle seed, offset, visibility clock).
 * Hydrates from `discover-session` snapshot on cold start; resets on account switch via `refreshDiscoverShuffle`.
 */
export function useDiscoverDeckSession() {
  const [discoverShuffleSeed, setDiscoverShuffleSeed] = useState(() => Date.now().toString());
  const [discoverStartOffset, setDiscoverStartOffset] = useState(() => Math.floor(Math.random() * 1000));
  const [discoverVisibilityTimestamp, setDiscoverVisibilityTimestamp] = useState(() => Date.now());

  const refreshDiscoverShuffle = useCallback((userId: string | null) => {
    setDiscoverShuffleSeed(nextDiscoverShuffleSeedForUser(userId));
    setDiscoverStartOffset(nextDiscoverStartOffset());
    setDiscoverVisibilityTimestamp(Date.now());
  }, []);

  useLayoutEffect(() => {
    const storedUserId = window.localStorage.getItem(CURRENT_USER_KEY);
    const persisted = readPersistedDiscoverDeck(storedUserId);
    if (!persisted) {
      return;
    }

    // One-shot hydration from discover-session after client mount (localStorage unavailable during SSR).
    /* eslint-disable react-hooks/set-state-in-effect -- intentional hydration; avoids SSR/client snapshot skew */
    setDiscoverShuffleSeed(persisted.shuffleSeed);
    setDiscoverStartOffset(persisted.startOffset);
    setDiscoverVisibilityTimestamp(persisted.visibilityTimestamp);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  return {
    discoverShuffleSeed,
    discoverStartOffset,
    discoverVisibilityTimestamp,
    refreshDiscoverShuffle,
  };
}
