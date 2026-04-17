export type DiscoverSessionSnapshotV1 = {
  v: 1;
  searchQuery: string;
  selectedGenres: string[];
  browseIndex: number;
  focusedMovieId: string | null;
  isSearchSheetOpen: boolean;
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
