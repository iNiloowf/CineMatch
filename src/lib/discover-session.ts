export type DiscoverSessionSnapshotV1 = {
  v: 1;
  searchQuery: string;
  selectedGenres: string[];
  browseIndex: number;
  focusedMovieId: string | null;
  isSearchSheetOpen: boolean;
  /**
   * When present together, restores the same Discover deck ordering after reload
   * or tab restore (must match `buildDiscoverQueue` inputs).
   */
  deckShuffleSeed?: string;
  deckStartOffset?: number;
  deckVisibilityTimestamp?: number;
};

const STORAGE_PREFIX = "cinematch-discover-session-v1";

export function discoverSessionStorageKey(userId: string | null): string {
  return `${STORAGE_PREFIX}-${userId ?? "guest"}`;
}

export function loadDiscoverSession(
  userId: string | null,
): DiscoverSessionSnapshotV1 | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(discoverSessionStorageKey(userId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<DiscoverSessionSnapshotV1>;
    if (parsed.v !== 1) {
      return null;
    }

    const deckShuffleSeed =
      typeof parsed.deckShuffleSeed === "string" && parsed.deckShuffleSeed.trim()
        ? parsed.deckShuffleSeed
        : undefined;
    const deckStartOffset =
      typeof parsed.deckStartOffset === "number" && Number.isFinite(parsed.deckStartOffset)
        ? Math.floor(parsed.deckStartOffset)
        : undefined;
    const deckVisibilityTimestamp =
      typeof parsed.deckVisibilityTimestamp === "number" &&
      Number.isFinite(parsed.deckVisibilityTimestamp)
        ? parsed.deckVisibilityTimestamp
        : undefined;

    return {
      v: 1,
      searchQuery: typeof parsed.searchQuery === "string" ? parsed.searchQuery : "",
      selectedGenres: Array.isArray(parsed.selectedGenres)
        ? parsed.selectedGenres.filter((g): g is string => typeof g === "string")
        : [],
      browseIndex:
        typeof parsed.browseIndex === "number" && Number.isFinite(parsed.browseIndex)
          ? Math.max(0, Math.floor(parsed.browseIndex))
          : 0,
      focusedMovieId:
        typeof parsed.focusedMovieId === "string" || parsed.focusedMovieId === null
          ? parsed.focusedMovieId
          : null,
      isSearchSheetOpen: Boolean(parsed.isSearchSheetOpen),
      deckShuffleSeed,
      deckStartOffset,
      deckVisibilityTimestamp,
    };
  } catch {
    return null;
  }
}

export function saveDiscoverSession(
  userId: string | null,
  snapshot: DiscoverSessionSnapshotV1,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      discoverSessionStorageKey(userId),
      JSON.stringify(snapshot),
    );
  } catch {
    // Quota or private mode — ignore.
  }
}

/** Used on cold start so Discover order matches the last saved session snapshot. */
export function readPersistedDiscoverDeck(
  userId: string | null,
): {
  shuffleSeed: string;
  startOffset: number;
  visibilityTimestamp: number;
} | null {
  const snapshot = loadDiscoverSession(userId);
  if (!snapshot?.deckShuffleSeed?.trim()) {
    return null;
  }

  if (
    typeof snapshot.deckStartOffset !== "number" ||
    !Number.isFinite(snapshot.deckStartOffset)
  ) {
    return null;
  }

  if (
    typeof snapshot.deckVisibilityTimestamp !== "number" ||
    !Number.isFinite(snapshot.deckVisibilityTimestamp)
  ) {
    return null;
  }

  return {
    shuffleSeed: snapshot.deckShuffleSeed.trim(),
    startOffset: Math.floor(snapshot.deckStartOffset),
    visibilityTimestamp: snapshot.deckVisibilityTimestamp,
  };
}
