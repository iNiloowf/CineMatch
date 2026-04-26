"use client";

import {
  type AuthChangeEvent,
  type Session,
} from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { isAchievementComplete } from "@/lib/achievement-utils";
import { computeAchievements } from "@/lib/achievements";
import { defaultSettings, initialAppData } from "@/lib/mock-data";
import { verifyOfflineDemoPassword } from "@/lib/offline-demo-password";
import { useAccountSyncTriggers } from "@/lib/hooks/use-account-sync-triggers";
import { useSupabaseAccountRefreshChannels } from "@/lib/hooks/use-supabase-account-refresh-channels";
import { playWaterDropletChime } from "@/lib/ui-sounds";
import { buildDiscoverQueue } from "@/lib/discover-queue";
import {
  buildDiscoverGenreAffinity,
  buildRejectedGenreWeights,
  computeDiscoverPersonalizationWeight,
  computeTasteYearProfile,
} from "@/lib/discover-taste";
import type { DiscoverPickEngagement } from "@/lib/discover-taste";
import { CURRENT_USER_KEY } from "@/lib/app-state/constants";
import { toPartnerViewUser } from "@/lib/app-state/partner-user";
import { useAppToasts } from "@/lib/hooks/use-app-toasts";
import { useDiscoverDeckSession } from "@/lib/hooks/use-discover-deck-session";
import {
  clearStoredAuthSession,
  ensureAuthSessionMirrorLoaded,
  getStoredAuthSession,
  persistStoredAuthSession,
} from "@/lib/auth-session-storage";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import { fetchAccountSyncFromBrowser } from "@/lib/account-sync/fetch-from-browser";
import { isMissingOptionalSettingsColumnError } from "@/lib/account-sync/settings-fetch";
import {
  getStoredAccountSnapshot,
  persistAccountSnapshot,
} from "@/lib/account-sync/snapshot-storage";
import type {
  AccountSyncPayload,
  LinkRow,
  MovieRow,
  ProfileRow,
  SettingsRow,
  SwipeRow,
  WatchedPickReviewRow,
} from "@/lib/account-sync/types";
import {
  Achievement,
  AppData,
  AuthUser,
  FavoriteMovieSummary,
  FriendLinkNotifyPayload,
  MutualMatchToastPayload,
  Movie,
  OnboardingPreferences,
  ProfileSettings,
  ProProfileStyle,
  SharedMovieGroup,
  SharedMovieView,
  SwipeDecision,
  User,
  WatchedPickReview,
} from "@/lib/types";
import { getEffectiveSubscriptionTier, type SubscriptionTier } from "@/lib/subscription-tier";
import {
  describePublicHandleValidationError,
  normalizePublicHandleInput,
} from "@/lib/public-handle";

const STORAGE_KEY = "cinematch-demo-state-v5";
const ACHIEVEMENT_STORAGE_PREFIX = "cinematch-achievements";
const THEME_STORAGE_KEY = "cinematch-theme-mode";
const USER_THEME_STORAGE_PREFIX = "cinematch-user-theme";
/** Per-device preference; survives account sync overwriting stale server rows (same pattern as theme). */
const USER_AUTOPLAY_TRAILERS_PREFIX = "cinematch-user-autoplay-trailers";
const ONBOARDING_STORAGE_PREFIX = "cinematch-onboarding";
const PROFILE_PHOTOS_BUCKET = "profile-photos";

const DEFAULT_ONBOARDING_PREFERENCES: OnboardingPreferences = {
  favoriteGenres: [],
  dislikedGenres: [],
  mediaPreference: "both",
  tasteProfile: [],
  completedAt: null,
};

type AuthResult =
  | { ok: true; message?: string; shouldRedirect?: boolean }
  | {
      ok: false;
      message: string;
    };

type SupabaseErrorLike = {
  message?: string;
  code?: string;
} | null;

type AppStateContextValue = {
  data: AppData;
  currentUserId: string | null;
  currentUser: User | null;
  onboardingPreferences: OnboardingPreferences;
  isOnboardingComplete: boolean;
  isDarkMode: boolean;
  isReady: boolean;
  isSyncingAccountData: boolean;
  accountSyncError: string | null;
  retryAccountSync: () => void;
  /** Clears the sync error banner; data may still be stale until the next successful sync. */
  dismissAccountSyncError: () => void;
  /** Soft refresh (e.g. tab focus); does not clear sync error state */
  refreshAccountData: () => void;
  achievements: Achievement[];
  unlockedAchievement: Achievement | null;
  dismissUnlockedAchievement: () => void;
  mutualMatchToast: MutualMatchToastPayload | null;
  dismissMutualMatchToast: () => void;
  friendLinkNotifyToast: FriendLinkNotifyPayload | null;
  dismissFriendLinkNotifyToast: () => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (payload: {
    name: string;
    email: string;
    password: string;
    publicHandle: string;
  }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  completeOnboarding: (
    payload: Omit<OnboardingPreferences, "completedAt">,
  ) => Promise<void>;
  resetOnboarding: () => Promise<void>;
  registerMovies: (movies: Movie[]) => void;
  swipeMovie: (movieId: string, decision: SwipeDecision) => Promise<void>;
  undoSwipe: (movieId: string) => Promise<void>;
  removePick: (movieId: string) => Promise<void>;
  markPickWatched: (movieId: string, recommended: boolean) => Promise<void>;
  /** Clears watched status for a pick (movie stays in your picks). */
  unmarkPickWatched: (movieId: string) => Promise<void>;
  toggleSharedMovie: (
    partnerId: string,
    movieId: string,
    shared: boolean,
  ) => Promise<void>;
  unlinkUser: (targetUserId: string) => Promise<{ ok: boolean; message: string }>;
  toggleWatched: (
    partnerId: string,
    movieId: string,
    watched: boolean,
  ) => Promise<void>;
  updateProgress: (partnerId: string, movieId: string, progress: number) => Promise<void>;
  updateProfile: (payload: {
    name: string;
    bio: string;
    city: string;
    /** If set, updates the unique public User ID (validated server-side). */
    publicHandle?: string;
    avatarImageUrl?: string | null;
    avatarFile?: File | null;
    favoriteMovie?: FavoriteMovieSummary | null;
    profileHeaderMovie?: FavoriteMovieSummary | null;
    profileStyle?: ProProfileStyle;
    /** When true, clears stored profile photo (ignored if `avatarFile` is set). */
    clearAvatar?: boolean;
  }) => Promise<{ ok: boolean; message?: string }>;
  updateSettings: (payload: Partial<ProfileSettings>) => Promise<void>;
  subscriptionTier: SubscriptionTier;
  effectiveSubscriptionTier: SubscriptionTier;
  hasProAccess: boolean;
  adminSubscriptionPreviewModeEnabled: boolean;
  setAdminSubscriptionPreviewMode: (enabled: boolean) => Promise<void>;
  acceptedMovies: Movie[];
  watchedPickReviews: {
    movie: Movie;
    recommended: boolean;
    watchedAt: string;
  }[];
  discoverQueue: Movie[];
  /** Used with swipes to decide if a recent reject still hides a title from Discover. */
  discoverVisibilityTimestamp: number;
  /** Rotation offset passed into `buildDiscoverQueue` (persisted with Discover session). */
  discoverStartOffset: number;
  discoverSessionKey: string;
  /** Genre weights (accepts + Picks) for Discover match % — aligned with queue. */
  discoverGenreAffinity: Map<string, number>;
  /** Decayed reject signals per genre — aligned with queue. */
  discoverRejectedGenreWeights: Map<string, number>;
  /** Release-year taste — used for Discover match % nudge. */
  discoverTasteYear: {
    center: number;
    spread: number;
    classicEngaged: boolean;
  };
  /** 0 = cold start (onboarding + popularity); 1 = full personalized Discover signals. */
  discoverPersonalizationWeight: number;
  linkedUsers: {
    user: User;
    linkId: string;
    requesterId: string;
    status: "accepted" | "pending";
    sharedCount: number;
  }[];
  sharedMovies: SharedMovieView[];
  sharedMovieGroups: SharedMovieGroup[];
  ongoingMovies: SharedMovieView[];
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

const MISSING_PROFILE_HEADER_DB_HINT =
  "Profile background wasn’t saved: run supabase/migrations/20260424240000_profile_header_movie.sql in the Supabase SQL editor, then set it again.";

function isMissingProfileHeaderColumnError(
  message: string | undefined | null,
): boolean {
  if (!message) {
    return false;
  }
  const m = message.toLowerCase();
  return (
    m.includes("profile_header") ||
    (m.includes("schema cache") && (m.includes("column") || m.includes("field"))) ||
    (m.includes("could not find") && m.includes("column"))
  );
}

function withoutProfileHeaderFields(
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...patch };
  for (const key of Object.keys(next)) {
    if (key.startsWith("profile_header_")) {
      delete next[key];
    }
  }
  return next;
}

function mergeProfileSettings(
  partial: Partial<ProfileSettings> | undefined,
): ProfileSettings {
  return { ...defaultSettings, ...partial };
}

function normalizeAppDataFromStorage(parsed: AppData): AppData {
  const settings: AppData["settings"] = {};
  for (const [userId, row] of Object.entries(parsed.settings ?? {})) {
    settings[userId] = mergeProfileSettings(row as Partial<ProfileSettings>);
  }
  const users: AuthUser[] = (parsed.users ?? []).map((user) => {
    const row = user as AuthUser;
    const handle = row.publicHandle?.trim();
    return {
      ...row,
      publicHandle: handle && handle.length > 0 ? handle : placeholderPublicHandle(row.id),
    };
  });
  const links = (parsed.links ?? []).map((l) => ({
    ...l,
    requesterId: l.requesterId ?? l.users[0],
  }));
  return {
    ...parsed,
    users,
    links,
    settings,
    watchedPickReviews: parsed.watchedPickReviews ?? [],
  };
}

function cloneInitialData(): AppData {
  return JSON.parse(JSON.stringify(initialAppData)) as AppData;
}

function getPairKey(userA: string, userB: string) {
  return [userA, userB].sort().join("::");
}

function getAvatarText(name: string, email: string) {
  const initials = name
    .split(" ")
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  if (initials) {
    return initials;
  }

  return email.slice(0, 2).toUpperCase() || "CM";
}

function placeholderPublicHandle(userId: string): string {
  const compact =
    userId
      .replace(/^user-/, "")
      .replace(/-/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "member";
  const suffix = compact.slice(0, 22);
  return `cm_${suffix}`.slice(0, 28);
}

function uniquePublicHandleFromEmail(users: AuthUser[], email: string): string {
  const rawLocal = (email.split("@")[0] ?? "user")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "user";
  const base = rawLocal.slice(0, 22);
  let handle = base;
  let n = 0;
  while (users.some((entry) => entry.publicHandle.toLowerCase() === handle.toLowerCase())) {
    n += 1;
    handle = `${base.slice(0, 16)}_${n}`;
  }
  return handle.toLowerCase();
}

function ensureLocalUser(
  current: AppData,
  payload: {
    id: string;
    publicHandle?: string;
    name: string;
    email: string;
    avatar?: string;
    avatarImageUrl?: string;
    bio?: string;
    city?: string;
    favoriteMovie?: FavoriteMovieSummary | null;
    profileHeaderMovie?: FavoriteMovieSummary | null;
    profileStyle?: ProProfileStyle;
  },
) {
  const existingUser = current.users.find((user) => user.id === payload.id);
  const incomingHandle = payload.publicHandle?.trim();

  if (existingUser) {
    const nextHandle =
      incomingHandle && incomingHandle.length > 0
        ? incomingHandle
        : existingUser.publicHandle;
    return {
      ...current,
      users: current.users.map((user) =>
        user.id === payload.id
          ? {
              ...user,
              publicHandle: nextHandle,
              name: payload.name,
              email: payload.email,
              avatar: payload.avatar ?? user.avatar,
              avatarImageUrl: payload.avatarImageUrl ?? user.avatarImageUrl,
              bio: payload.bio ?? user.bio,
              city: payload.city ?? user.city,
              favoriteMovie:
                payload.favoriteMovie === undefined
                  ? user.favoriteMovie
                  : (payload.favoriteMovie ?? undefined),
              profileHeaderMovie:
                payload.profileHeaderMovie === undefined
                  ? user.profileHeaderMovie
                  : (payload.profileHeaderMovie ?? undefined),
              profileStyle: payload.profileStyle ?? user.profileStyle,
            }
          : user,
      ),
    };
  }

  const nextUser: AuthUser = {
    id: payload.id,
    publicHandle:
      incomingHandle && incomingHandle.length > 0
        ? incomingHandle
        : placeholderPublicHandle(payload.id),
    name: payload.name,
    email: payload.email,
    password: "",
    avatar: payload.avatar ?? getAvatarText(payload.name, payload.email),
    avatarImageUrl: payload.avatarImageUrl,
    bio:
      payload.bio ?? "New to CineMatch and building the perfect watchlist.",
    city: payload.city ?? "Set your city",
    favoriteMovie: payload.favoriteMovie ?? undefined,
    profileHeaderMovie: payload.profileHeaderMovie ?? undefined,
    profileStyle: payload.profileStyle ?? "classic",
  };

  return {
    ...current,
    users: [...current.users, nextUser],
    settings: {
      ...current.settings,
      [payload.id]: current.settings[payload.id] ?? { ...defaultSettings },
    },
  };
}

function mapSettingsRow(settings: SettingsRow): ProfileSettings {
  return {
    darkMode: settings.dark_mode,
    notifications: settings.notifications,
    autoplayTrailers: settings.autoplay_trailers ?? false,
    hideSpoilers: settings.hide_spoilers,
    cellularSync: settings.cellular_sync,
    reduceMotion: settings.reduce_motion ?? false,
    subscriptionTier: settings.subscription_tier === "pro" ? "pro" : "free",
    adminModeSimulatePro: settings.admin_mode_simulate_pro ?? false,
  };
}

/**
 * JWT app_metadata (and fresh logins) can carry Pro before/without settings sync; merge so new devices show the right tier.
 */
function mergeAppMetadataSubscriptionIntoData(
  current: AppData,
  userId: string,
  appMetadata: Record<string, unknown> | undefined,
): AppData {
  if (!appMetadata) {
    return current;
  }
  const prev = current.settings[userId] ?? { ...defaultSettings };
  const isProInMetadata =
    appMetadata.subscription_tier === "pro" || appMetadata.subscriptionTier === "pro";
  const adminInMetadata =
    appMetadata.admin_mode_simulate_pro === true ||
    appMetadata.adminModeSimulatePro === true;
  if (!isProInMetadata && !adminInMetadata) {
    return current;
  }
  const nextTier = isProInMetadata ? "pro" : prev.subscriptionTier;
  const nextAdmin = adminInMetadata ? true : prev.adminModeSimulatePro;
  if (nextTier === prev.subscriptionTier && nextAdmin === prev.adminModeSimulatePro) {
    return current;
  }
  return {
    ...current,
    settings: {
      ...current.settings,
      [userId]: {
        ...prev,
        subscriptionTier: nextTier,
        adminModeSimulatePro: nextAdmin,
      },
    },
  };
}

/**
 * New devices have an empty "seen" list; after server hydrate, mark all already-earned achievements as seen so toasts do not replay.
 */
function seedSeenAchievementsFromHydratedData(userId: string, data: AppData) {
  if (typeof window === "undefined") {
    return;
  }
  const list = computeAchievements(data, userId);
  const key = `${ACHIEVEMENT_STORAGE_PREFIX}-${userId}`;
  const seen = new Set<string>(
    JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[],
  );
  let changed = false;
  for (const achievement of list) {
    if (isAchievementComplete(achievement) && !seen.has(achievement.id)) {
      seen.add(achievement.id);
      changed = true;
    }
  }
  if (changed) {
    window.localStorage.setItem(key, JSON.stringify(Array.from(seen)));
  }
}

function mapSwipeRow(swipe: SwipeRow) {
  return {
    userId: swipe.user_id,
    movieId: swipe.movie_id,
    decision: swipe.decision,
    createdAt: swipe.created_at,
  };
}

function mapWatchedPickReviewRow(row: WatchedPickReviewRow): WatchedPickReview {
  return {
    id: row.id,
    userId: row.user_id,
    movieId: row.movie_id,
    recommended: row.recommended,
    watchedAt: row.watched_at,
  };
}

function mapLinkRow(link: LinkRow) {
  return {
    id: link.id,
    users: [link.requester_id, link.target_id] as [string, string],
    requesterId: link.requester_id,
    status: link.status,
    createdAt: link.created_at,
  };
}

function mapMovieRow(movie: MovieRow): Movie {
  return {
    id: movie.id,
    title: movie.title,
    mediaType: movie.genres?.includes("Series") ? "series" : "movie",
    year: movie.release_year,
    runtime: movie.runtime,
    rating: Number(movie.rating),
    genre: movie.genres ?? [],
    description: movie.description,
    trailerUrl: movie.trailer_url ?? undefined,
    poster: {
      eyebrow: movie.poster_eyebrow,
      imageUrl: movie.poster_image_url ?? undefined,
      accentFrom: movie.accent_from,
      accentTo: movie.accent_to,
    },
  };
}

function mapProfileFavoriteMovie(
  profile: ProfileRow,
): FavoriteMovieSummary | undefined {
  if (
    !profile.favorite_movie_id ||
    !profile.favorite_movie_title ||
    !Number.isFinite(profile.favorite_movie_year)
  ) {
    return undefined;
  }

  return {
    id: profile.favorite_movie_id,
    title: profile.favorite_movie_title,
    year: Number(profile.favorite_movie_year),
    posterImageUrl: profile.favorite_movie_poster_url ?? undefined,
    mediaType:
      profile.favorite_movie_media_type === "series" ? "series" : "movie",
  };
}

function mapProfileHeaderMovie(
  profile: ProfileRow,
): FavoriteMovieSummary | undefined {
  if (
    !profile.profile_header_movie_id ||
    !profile.profile_header_movie_title ||
    !Number.isFinite(profile.profile_header_movie_year)
  ) {
    return undefined;
  }

  return {
    id: profile.profile_header_movie_id,
    title: profile.profile_header_movie_title,
    year: Number(profile.profile_header_movie_year),
    posterImageUrl: profile.profile_header_poster_url ?? undefined,
    mediaType:
      profile.profile_header_media_type === "series" ? "series" : "movie",
  };
}

function getStoredUserTheme(userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(
    `${USER_THEME_STORAGE_PREFIX}-${userId}`,
  );

  if (value === "dark") {
    return true;
  }

  if (value === "light") {
    return false;
  }

  return null;
}

function persistUserTheme(userId: string, isDark: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${USER_THEME_STORAGE_PREFIX}-${userId}`,
    isDark ? "dark" : "light",
  );
}

function getStoredUserAutoplayTrailers(userId: string): boolean | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(
    `${USER_AUTOPLAY_TRAILERS_PREFIX}-${userId}`,
  );

  if (value === "1") {
    return true;
  }

  if (value === "0") {
    return false;
  }

  return null;
}

function persistUserAutoplayTrailers(userId: string, enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${USER_AUTOPLAY_TRAILERS_PREFIX}-${userId}`,
    enabled ? "1" : "0",
  );
}

function getOnboardingStorageKey(userId: string) {
  return `${ONBOARDING_STORAGE_PREFIX}-${userId}`;
}

function getStoredOnboardingPreferences(userId: string): OnboardingPreferences {
  if (typeof window === "undefined") {
    return { ...DEFAULT_ONBOARDING_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(getOnboardingStorageKey(userId));

    if (!raw) {
      return { ...DEFAULT_ONBOARDING_PREFERENCES };
    }

    const parsed = JSON.parse(raw) as Partial<OnboardingPreferences>;

    return {
      favoriteGenres: Array.isArray(parsed.favoriteGenres)
        ? parsed.favoriteGenres.filter((entry): entry is string => typeof entry === "string")
        : [],
      dislikedGenres: Array.isArray(parsed.dislikedGenres)
        ? parsed.dislikedGenres.filter((entry): entry is string => typeof entry === "string")
        : [],
      mediaPreference:
        parsed.mediaPreference === "movie" ||
        parsed.mediaPreference === "series" ||
        parsed.mediaPreference === "both"
          ? parsed.mediaPreference
          : "both",
      tasteProfile: Array.isArray(parsed.tasteProfile)
        ? parsed.tasteProfile.filter((entry): entry is string => typeof entry === "string")
        : [],
      completedAt: typeof parsed.completedAt === "string" ? parsed.completedAt : null,
    };
  } catch {
    return { ...DEFAULT_ONBOARDING_PREFERENCES };
  }
}

function persistOnboardingPreferences(
  userId: string,
  preferences: OnboardingPreferences,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      getOnboardingStorageKey(userId),
      JSON.stringify(preferences),
    );
  } catch {
    // Ignore storage failures.
  }
}

function getGlobalStoredTheme() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
}

function mergeMoviesIntoData(current: AppData, movies: Movie[]) {
  if (movies.length === 0) {
    return current;
  }

  const knownIds = new Set(current.movies.map((movie) => movie.id));
  const newMovies = movies.filter((movie) => !knownIds.has(movie.id));

  if (newMovies.length === 0) {
    return current;
  }

  return {
    ...current,
    movies: [...current.movies, ...newMovies],
  };
}

async function getCurrentAccessToken() {
  await ensureAuthSessionMirrorLoaded();
  const storedSession = getStoredAuthSession();

  if (storedSession?.accessToken) {
    return storedSession.accessToken;
  }

  const supabase = getSupabaseBrowserClient();

  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  const sessionResult = await supabase.auth.getSession();
  return sessionResult.data.session?.access_token ?? null;
}

async function persistMovieToSupabase(movie: Movie) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase || !isSupabaseConfigured()) {
    return;
  }

  const moviePayload = {
    id: movie.id,
    title: movie.title,
    release_year: movie.year,
    runtime: movie.runtime,
    rating: movie.rating,
    genres: Array.from(
      new Set([
        ...movie.genre,
        movie.mediaType === "series" ? "Series" : "Movie",
      ]),
    ),
    description: movie.description,
    poster_eyebrow: movie.poster.eyebrow,
    poster_image_url: movie.poster.imageUrl ?? null,
    accent_from: movie.poster.accentFrom,
    accent_to: movie.poster.accentTo,
    trailer_url: movie.trailerUrl ?? null,
  };

  await supabase.from("movies").upsert(moviePayload as never, {
    onConflict: "id",
  });
}

async function uploadProfilePhoto(
  userId: string,
  file: File,
): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();

  if (!supabase || !isSupabaseConfigured()) {
    return null;
  }

  const normalizeImageFileForUpload = async (
    input: File,
    options?: { targetMaxBytes?: number; forceJpeg?: boolean },
  ): Promise<File> => {
    if (typeof window === "undefined" || !input.type.startsWith("image/")) {
      return input;
    }

    const MAX_UPLOAD_BYTES = options?.targetMaxBytes ?? 700 * 1024;
    const MAX_DIMENSION_STEPS = [1600, 1280, 1080, 900, 768];
    const forceJpeg =
      options?.forceJpeg === true ||
      !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        input.type.toLowerCase(),
      );

    if (!forceJpeg && input.size <= MAX_UPLOAD_BYTES) {
      return input;
    }

    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(input);
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Unable to decode image"));
        img.src = objectUrl as string;
      });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        return input;
      }

      let bestBlob: Blob | null = null;

      for (const maxDimension of MAX_DIMENSION_STEPS) {
        const largestSide = Math.max(image.width, image.height);
        const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
        const targetWidth = Math.max(1, Math.round(image.width * scale));
        const targetHeight = Math.max(1, Math.round(image.height * scale));

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        context.clearRect(0, 0, targetWidth, targetHeight);
        context.drawImage(image, 0, 0, targetWidth, targetHeight);

        let quality = 0.86;
        while (quality >= 0.32) {
          const encodedBlob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, "image/jpeg", quality);
          });

          if (!encodedBlob) {
            break;
          }

          if (!bestBlob || encodedBlob.size < bestBlob.size) {
            bestBlob = encodedBlob;
          }

          if (encodedBlob.size <= MAX_UPLOAD_BYTES) {
            const baseName = input.name.replace(/\.[^.]+$/, "") || "profile-photo";
            return new File([encodedBlob], `${baseName}.jpg`, {
              type: "image/jpeg",
            });
          }

          quality -= 0.08;
        }
      }

      if (!bestBlob) {
        return input;
      }

      const baseName = input.name.replace(/\.[^.]+$/, "") || "profile-photo";
      return new File([bestBlob], `${baseName}.jpg`, {
        type: "image/jpeg",
      });
    } catch {
      return input;
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  };

  const fileToUpload = await normalizeImageFileForUpload(file);
  const accessToken = await getCurrentAccessToken();

  if (accessToken) {
    try {
      const formData = new FormData();
      formData.append("file", fileToUpload);
      const response = await fetch("/api/profile-photo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const payload = (await response.json()) as {
        imageUrl?: string;
        publicUrl?: string;
      };

      if (response.ok && (payload.imageUrl || payload.publicUrl)) {
        return payload.imageUrl ?? payload.publicUrl ?? null;
      }
    } catch {
      // Fall back to direct browser upload for local/demo environments.
    }
  }

  const extension = fileToUpload.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const filePath = `${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;

  const uploadResult = await supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .upload(filePath, fileToUpload, {
      cacheControl: "3600",
      upsert: false,
      contentType: fileToUpload.type || undefined,
    });

  if (uploadResult.error) {
    const fallbackFile = await normalizeImageFileForUpload(file, {
      targetMaxBytes: 450 * 1024,
      forceJpeg: true,
    });
    const fallbackPath = `${userId}/${Date.now()}-${crypto.randomUUID()}.jpg`;
    const fallbackUploadResult = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(fallbackPath, fallbackFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });

    if (fallbackUploadResult.error) {
      return null;
    }

    const fallbackPublicUrl = supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(fallbackPath).data.publicUrl;
    return fallbackPublicUrl || null;
  }

  const { data } = supabase.storage
    .from(PROFILE_PHOTOS_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl || null;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => {
    if (typeof window === "undefined") {
      return cloneInitialData();
    }

    const storedData = window.localStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      return cloneInitialData();
    }
    try {
      return normalizeAppDataFromStorage(JSON.parse(storedData) as AppData);
    } catch {
      return cloneInitialData();
    }
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(CURRENT_USER_KEY);
  });
  const [preferredDarkMode, setPreferredDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    const storedCurrentUserId = window.localStorage.getItem(CURRENT_USER_KEY);
    const storedUserTheme = storedCurrentUserId
      ? window.localStorage.getItem(
          `${USER_THEME_STORAGE_PREFIX}-${storedCurrentUserId}`,
        )
      : null;

    if (storedUserTheme === "dark") {
      return true;
    }

    if (storedUserTheme === "light") {
      return false;
    }

    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
  });
  const [onboardingPreferences, setOnboardingPreferences] =
    useState<OnboardingPreferences>(() => {
      if (typeof window === "undefined") {
        return { ...DEFAULT_ONBOARDING_PREFERENCES };
      }

      const storedCurrentUserId = window.localStorage.getItem(CURRENT_USER_KEY);

      return storedCurrentUserId
        ? getStoredOnboardingPreferences(storedCurrentUserId)
        : { ...DEFAULT_ONBOARDING_PREFERENCES };
    });
  const [isReady, setIsReady] = useState(() => !isSupabaseConfigured());
  const [isSyncingAccountData, setIsSyncingAccountData] = useState(false);
  const [accountSyncError, setAccountSyncError] = useState<string | null>(null);
  const [accountRefreshKey, setAccountRefreshKey] = useState(0);
  const {
    discoverShuffleSeed,
    discoverStartOffset,
    discoverVisibilityTimestamp,
    refreshDiscoverShuffle,
  } = useDiscoverDeckSession();
  /** Used in `onAuthStateChange` to avoid reshuffling when `SIGNED_IN` replays (e.g. app resume). */
  const currentUserIdForAuthRef = useRef<string | null>(null);
  useEffect(() => {
    currentUserIdForAuthRef.current = currentUserId;
  }, [currentUserId]);
  const {
    unlockedAchievement,
    mutualMatchToast,
    friendLinkNotifyToast,
    dismissUnlockedAchievement,
    dismissMutualMatchToast,
    dismissFriendLinkNotifyToast,
    setUnlockedAchievement,
    setMutualMatchToast,
    setFriendLinkNotifyToast,
  } = useAppToasts();
  const syncRetryCountRef = useRef(0);
  const friendLinksSnapshotRef = useRef(new Map<string, "pending" | "accepted">());
  const friendLinksBaselineRef = useRef(false);
  const isDarkMode = preferredDarkMode;
  const isOnboardingComplete = Boolean(onboardingPreferences.completedAt);
  const currentSettings = currentUserId ? data.settings[currentUserId] : null;
  const subscriptionTier: SubscriptionTier = currentSettings?.subscriptionTier ?? "free";
  const effectiveSubscriptionTier: SubscriptionTier =
    getEffectiveSubscriptionTier(currentSettings ?? undefined);
  const hasProAccess = effectiveSubscriptionTier === "pro";
  const adminSubscriptionPreviewModeEnabled =
    currentSettings?.adminModeSimulatePro ?? false;

  const requestAccountDataRefresh = useCallback(() => {
    setAccountRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      queueMicrotask(() => {
        setOnboardingPreferences({ ...DEFAULT_ONBOARDING_PREFERENCES });
      });
      return;
    }

    queueMicrotask(() => {
      setOnboardingPreferences(getStoredOnboardingPreferences(currentUserId));
    });
  }, [currentUserId]);

  const applyHydratedAccountPayload = (
    activeUserId: string,
    payload: AccountSyncPayload,
  ) => {
    persistAccountSnapshot(activeUserId, payload);

    const linkRows = payload.links ?? [];
    const acceptedLinks = linkRows.filter((link) => link.status === "accepted");
    const acceptedPartnerIds = Array.from(
      new Set(
        acceptedLinks.map((link) =>
          link.requester_id === activeUserId ? link.target_id : link.requester_id,
        ),
      ),
    );
    const hydratedSwipeUserIds = Array.from(
      new Set([activeUserId, ...acceptedPartnerIds]),
    );
    const sharedLinkIds = acceptedLinks.map((link) => link.id);
    const swipeRows = payload.swipes ?? [];

    setData((current) => {
      let next = current;

      const ownProfile = payload.profile ?? null;
      const allProfiles = [
        ...(ownProfile ? [ownProfile] : []),
        ...(payload.partnerProfiles ?? []),
      ];

      for (const profile of allProfiles) {
        next = ensureLocalUser(next, {
          id: profile.id,
          publicHandle: profile.public_handle,
          name: profile.full_name,
          email: profile.email,
          avatar: profile.avatar_text,
          avatarImageUrl: profile.avatar_image_url ?? undefined,
          bio: profile.bio,
          city: profile.city,
          favoriteMovie: mapProfileFavoriteMovie(profile),
          profileHeaderMovie: mapProfileHeaderMovie(profile),
          profileStyle: profile.profile_style ?? "classic",
        });
      }

      const ownSettings = payload.settings ?? null;
      next = mergeMoviesIntoData(next, (payload.movies ?? []).map(mapMovieRow));

      const currentSwipes = [
        ...next.swipes.filter(
          (swipe) => !hydratedSwipeUserIds.includes(swipe.userId),
        ),
        ...swipeRows.map(mapSwipeRow),
      ];
      const currentLinks = [
        ...next.links.filter((link) => !link.users.includes(activeUserId)),
        ...linkRows.map(mapLinkRow),
      ];
      const currentInvites: AppData["invites"] = [];
      const currentSharedWatch = [
        ...next.sharedWatch.filter(
          (item) => !sharedLinkIds.includes(item.pairKey),
        ),
        ...(payload.sharedWatch ?? []).map((item) => ({
          id: item.id,
          pairKey: item.linked_user_id,
          movieId: item.movie_id,
          watched: item.watched,
          progress: item.watched ? 100 : 0,
          updatedAt: item.updated_at,
        })),
      ];

      const serverWatchedPicks = (payload.watchedPickReviews ?? []).map(
        mapWatchedPickReviewRow,
      );
      const reviewKey = (e: WatchedPickReview) => `${e.userId}:${e.movieId}`;
      const serverReviewKeys = new Set(serverWatchedPicks.map(reviewKey));
      const localForHydratedUsers = next.watchedPickReviews.filter((entry) =>
        hydratedSwipeUserIds.includes(entry.userId),
      );
      /** If the DB was empty, keep legacy client-only rows instead of dropping them. */
      const localOnlyWatchedPicks = localForHydratedUsers.filter(
        (entry) => !serverReviewKeys.has(reviewKey(entry)),
      );
      const mergedWatchedPickReviews: WatchedPickReview[] = [
        ...next.watchedPickReviews.filter(
          (entry) => !hydratedSwipeUserIds.includes(entry.userId),
        ),
        ...serverWatchedPicks,
        ...localOnlyWatchedPicks,
      ];

      if (ownSettings) {
        const mapped = mapSettingsRow(ownSettings);
        if (getStoredUserAutoplayTrailers(activeUserId) === null) {
          const previous = next.settings[activeUserId];
          if (
            previous !== undefined &&
            mergeProfileSettings(previous).autoplayTrailers
          ) {
            persistUserAutoplayTrailers(activeUserId, true);
          }
        }
        const autoplayTrailersResolved =
          getStoredUserAutoplayTrailers(activeUserId) ?? mapped.autoplayTrailers;

        const merged: AppData = {
          ...next,
          swipes: currentSwipes,
          links: currentLinks,
          invites: currentInvites,
          sharedWatch: currentSharedWatch,
          watchedPickReviews: mergedWatchedPickReviews,
          settings: {
            ...next.settings,
            [activeUserId]: {
              ...mapped,
              autoplayTrailers: autoplayTrailersResolved,
            },
          },
        };
        seedSeenAchievementsFromHydratedData(activeUserId, merged);
        return merged;
      }

      const mergedNoSettings: AppData = {
        ...next,
        swipes: currentSwipes,
        links: currentLinks,
        invites: currentInvites,
        sharedWatch: currentSharedWatch,
        watchedPickReviews: mergedWatchedPickReviews,
        settings: next.settings,
      };
      seedSeenAchievementsFromHydratedData(activeUserId, mergedNoSettings);
      return mergedNoSettings;
    });

    if (payload.settings) {
      const dbDarkMode = mapSettingsRow(payload.settings).darkMode;
      const nextDarkMode = getStoredUserTheme(activeUserId) ?? dbDarkMode;
      setPreferredDarkMode(nextDarkMode);
      persistUserTheme(activeUserId, nextDarkMode);
    }

    setAccountSyncError(null);
  };

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    if (currentUserId) {
      window.localStorage.setItem(CURRENT_USER_KEY, currentUserId);
    } else {
      window.localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, [currentUserId, data, isReady]);

  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
    if (typeof document.body !== "undefined") {
      document.body.style.background = isDarkMode ? "#0d0a14" : "#f6f7fb";
      document.body.style.color = isDarkMode ? "#f8fafc" : "#0f172a";
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduceMotion = () => {
      const fromUser =
        currentUserId != null &&
        data.settings[currentUserId]?.reduceMotion === true;
      const shouldReduce = Boolean(fromUser || media.matches);
      // CSS uses `html[data-reduce-motion="true"]` — toggleAttribute() does not set ="true".
      if (shouldReduce) {
        document.documentElement.setAttribute("data-reduce-motion", "true");
      } else {
        document.documentElement.removeAttribute("data-reduce-motion");
      }
    };

    syncReduceMotion();
    media.addEventListener("change", syncReduceMotion);
    return () => {
      media.removeEventListener("change", syncReduceMotion);
    };
  }, [currentUserId, data.settings]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      isDarkMode ? "dark" : "light",
    );
  }, [isDarkMode]);

  useEffect(() => {
    const handleRefreshSignal = () => {
      setAccountRefreshKey((current) => current + 1);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleRefreshSignal();
      }
    };

    window.addEventListener("focus", handleRefreshSignal);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleRefreshSignal);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    let authSubscription: { unsubscribe: () => void } | null = null;

    void (async () => {
      await ensureAuthSessionMirrorLoaded();
      if (!active) {
        return;
      }

      const sessionResponse = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      const sessionUser = sessionResponse.data.session?.user;
      const storedSession = getStoredAuthSession();

      if (!sessionUser && !storedSession?.userId) {
        setCurrentUserId(null);
        refreshDiscoverShuffle(null);
        setAccountRefreshKey((current) => current + 1);
        setIsReady(true);
      } else if (!sessionUser && storedSession?.userId) {
        setCurrentUserId(storedSession.userId);
        setAccountRefreshKey((current) => current + 1);
        setPreferredDarkMode(
          getStoredUserTheme(storedSession.userId) ?? getGlobalStoredTheme(),
        );
        setIsReady(true);
      } else if (!sessionUser) {
        setIsReady(true);
      } else {
        if (
          sessionResponse.data.session?.access_token &&
          sessionResponse.data.session?.refresh_token
        ) {
          persistStoredAuthSession({
            userId: sessionUser.id,
            email: sessionUser.email ?? null,
            accessToken: sessionResponse.data.session.access_token,
            refreshToken: sessionResponse.data.session.refresh_token,
          });
        }

        const fullName =
          (sessionUser.user_metadata.full_name as string | undefined) ??
          sessionUser.email?.split("@")[0] ??
          "CineMatch User";

        setData((current) =>
          mergeAppMetadataSubscriptionIntoData(
            ensureLocalUser(current, {
              id: sessionUser.id,
              name: fullName,
              email: sessionUser.email ?? "",
              avatarImageUrl:
                (sessionUser.user_metadata.avatar_image_url as string | undefined) ??
                undefined,
            }),
            sessionUser.id,
            sessionUser.app_metadata as Record<string, unknown> | undefined,
          ),
        );
        setCurrentUserId(sessionUser.id);
        setAccountRefreshKey((current) => current + 1);
        setPreferredDarkMode(
          getStoredUserTheme(sessionUser.id) ?? getGlobalStoredTheme(),
        );
        setIsReady(true);
      }

      if (!active) {
        return;
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
        const sessionUser = session?.user;

        if (!sessionUser) {
          const storedSession = getStoredAuthSession();

          if (storedSession?.userId) {
            setCurrentUserId(storedSession.userId);
            setAccountRefreshKey((current) => current + 1);
            setPreferredDarkMode(
              getStoredUserTheme(storedSession.userId) ?? getGlobalStoredTheme(),
            );
            setIsReady(true);
            return;
          }

          setCurrentUserId(null);
          refreshDiscoverShuffle(null);
          setAccountRefreshKey((current) => current + 1);
          setIsReady(true);
          return;
        }

        if (session.access_token && session.refresh_token) {
          persistStoredAuthSession({
            userId: sessionUser.id,
            email: sessionUser.email ?? null,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          });
        }

        if (event === "TOKEN_REFRESHED") {
          return;
        }

        const activeSessionUser = sessionUser;

        const fullName =
          (activeSessionUser.user_metadata.full_name as string | undefined) ??
          activeSessionUser.email?.split("@")[0] ??
          "CineMatch User";

        if (event === "USER_UPDATED") {
          setData((current) =>
            mergeAppMetadataSubscriptionIntoData(
              ensureLocalUser(current, {
                id: activeSessionUser.id,
                name: fullName,
                email: activeSessionUser.email ?? "",
                avatarImageUrl:
                  (activeSessionUser.user_metadata.avatar_image_url as string | undefined) ??
                  undefined,
              }),
              activeSessionUser.id,
              activeSessionUser.app_metadata as Record<string, unknown> | undefined,
            ),
          );
          setCurrentUserId(activeSessionUser.id);
          setPreferredDarkMode(
            getStoredUserTheme(activeSessionUser.id) ?? getGlobalStoredTheme(),
          );
          setAccountRefreshKey((current) => current + 1);
          return;
        }

        const skipDiscoverReshuffle =
          event === "INITIAL_SESSION" ||
          (event === "SIGNED_IN" &&
            currentUserIdForAuthRef.current === activeSessionUser.id);

        setData((current) =>
          mergeAppMetadataSubscriptionIntoData(
            ensureLocalUser(current, {
              id: activeSessionUser.id,
              name: fullName,
              email: activeSessionUser.email ?? "",
              avatarImageUrl:
                (activeSessionUser.user_metadata.avatar_image_url as string | undefined) ??
                undefined,
            }),
            activeSessionUser.id,
            activeSessionUser.app_metadata as Record<string, unknown> | undefined,
          ),
        );
        setCurrentUserId(activeSessionUser.id);
        if (!skipDiscoverReshuffle) {
          refreshDiscoverShuffle(activeSessionUser.id);
        }
        setAccountRefreshKey((current) => current + 1);
        setPreferredDarkMode(
          getStoredUserTheme(activeSessionUser.id) ?? getGlobalStoredTheme(),
        );
        setIsReady(true);
        },
      );

      authSubscription = subscription;
      if (!active) {
        subscription.unsubscribe();
      }
    })();

    return () => {
      active = false;
      authSubscription?.unsubscribe();
    };
  }, [refreshDiscoverShuffle]);

  useSupabaseAccountRefreshChannels(currentUserId, requestAccountDataRefresh);

  useAccountSyncTriggers({
    enabled: Boolean(currentUserId),
    onRequestSync: requestAccountDataRefresh,
  });

  const watchedReviewMovieIdsMissingFromCatalogKey = useMemo(() => {
    const catalog = new Set(data.movies.map((m) => m.id));
    return JSON.stringify(
      [
        ...new Set(
          data.watchedPickReviews
            .map((e) => e.movieId)
            .filter((id) => !catalog.has(id)),
        ),
      ].sort(),
    );
  }, [data.movies, data.watchedPickReviews]);

  const watchedPickBackfillFingerprint = useMemo(() => {
    if (!currentUserId) {
      return "";
    }
    return JSON.stringify(
      data.watchedPickReviews
        .filter((e) => e.userId === currentUserId)
        .map((e) => [e.movieId, e.recommended, e.watchedAt] as const)
        .sort((a, b) => a[0].localeCompare(b[0])),
    );
  }, [data.watchedPickReviews, currentUserId]);

  const backfilledWatchedPicksKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUserId || !watchedPickBackfillFingerprint) {
      return;
    }
    if (watchedPickBackfillFingerprint.length <= 2) {
      return;
    }
    if (backfilledWatchedPicksKeyRef.current === watchedPickBackfillFingerprint) {
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !isSupabaseConfigured()) {
      return;
    }
    const mine = data.watchedPickReviews.filter((e) => e.userId === currentUserId);
    if (mine.length === 0) {
      return;
    }
    const fp = watchedPickBackfillFingerprint;
    let active = true;
    const t = window.setTimeout(() => {
      if (!active) {
        return;
      }
      if (backfilledWatchedPicksKeyRef.current === fp) {
        return;
      }
      void (async () => {
        if (!active) {
          return;
        }
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = supabase as any;
          let anyUpsertError = false;
          for (const e of mine) {
            if (!active) {
              return;
            }
            const { error } = await client.from("watched_pick_reviews").upsert(
              {
                user_id: e.userId,
                movie_id: e.movieId,
                recommended: e.recommended,
                watched_at: e.watchedAt,
              },
              { onConflict: "user_id,movie_id" },
            );
            if (error) {
              anyUpsertError = true;
            }
          }
          if (active && !anyUpsertError) {
            backfilledWatchedPicksKeyRef.current = fp;
            requestAccountDataRefresh();
          }
        } catch {
          // table missing or network — merge fix still keeps local rows; retry on next key change
        }
      })();
    }, 1600);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [watchedPickBackfillFingerprint, currentUserId, data.watchedPickReviews, requestAccountDataRefresh]);

  /** Fetches full movie records for any watched-pick / friend-review id not yet in the local catalog. */
  useEffect(() => {
    if (typeof window === "undefined" || !currentUserId) {
      return;
    }
    if (watchedReviewMovieIdsMissingFromCatalogKey === "[]") {
      return;
    }
    const missing: string[] = JSON.parse(
      watchedReviewMovieIdsMissingFromCatalogKey,
    ) as string[];
    if (missing.length === 0) {
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        const found: Movie[] = [];
        for (const movieId of missing) {
          if (cancelled) {
            return;
          }
          try {
            const res = await fetch(
              `/api/movies?movieId=${encodeURIComponent(movieId)}`,
              { cache: "no-store" },
            );
            if (!res.ok) {
              continue;
            }
            const payload = (await res.json()) as { movie?: Movie | null };
            if (payload.movie) {
              found.push(payload.movie);
            }
          } catch {
            // ignore: offline or unparsable id
          }
        }
        if (!cancelled && found.length > 0) {
          setData((current) => mergeMoviesIntoData(current, found));
        }
      })();
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [currentUserId, watchedReviewMovieIdsMissingFromCatalogKey, setData]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateMovieCatalog() {
      try {
        const response = await fetch("/api/movies?source=tmdb", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { movies?: Movie[] };

        if (!isMounted || !payload.movies?.length) {
          return;
        }

        setData((current) => {
          return mergeMoviesIntoData(current, payload.movies ?? []);
        });
      } catch {
        // Keep the mock-first experience if TMDB isn't configured yet.
      }
    }

    hydrateMovieCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUserId) {
      return;
    }

    const supabaseClient = supabase;
    const activeUserId = currentUserId;

    async function loadSupabaseAppData() {
      await ensureAuthSessionMirrorLoaded();
      setIsSyncingAccountData(true);
      setAccountSyncError(null);
      const sessionResult = await supabaseClient.auth.getSession();
      const storedAuthSession = getStoredAuthSession();
      const accessToken =
        sessionResult.data.session?.access_token ??
        (storedAuthSession?.userId === activeUserId
          ? storedAuthSession.accessToken
          : null);

      if (
        !sessionResult.data.session &&
        storedAuthSession?.userId === activeUserId &&
        storedAuthSession.refreshToken
      ) {
        try {
          await supabaseClient.auth.setSession({
            access_token: storedAuthSession.accessToken,
            refresh_token: storedAuthSession.refreshToken,
          });
        } catch {
          // Keep going with the stored access token for server sync.
        }
      }

      if (!accessToken) {
        const storedSnapshot = getStoredAccountSnapshot(activeUserId);

        if (storedSnapshot) {
          applyHydratedAccountPayload(activeUserId, storedSnapshot);
          syncRetryCountRef.current = 0;
          setIsSyncingAccountData(false);
          return;
        }

        const browserFallbackPayload = await fetchAccountSyncFromBrowser(
          supabaseClient,
          activeUserId,
        );

        if (browserFallbackPayload) {
          applyHydratedAccountPayload(activeUserId, browserFallbackPayload);
          syncRetryCountRef.current = 0;
          setIsSyncingAccountData(false);
          return;
        }

        setIsSyncingAccountData(false);
        if (syncRetryCountRef.current < 5) {
          syncRetryCountRef.current += 1;
          window.setTimeout(() => {
            setAccountRefreshKey((current) => current + 1);
          }, 900 + syncRetryCountRef.current * 250);
          return;
        }

        setAccountSyncError(
          "No response from the server after several tries. Check your connection, then tap Retry.",
        );
        return;
      }

      const cachedPayload = getStoredAccountSnapshot(activeUserId);
      if (cachedPayload) {
        // Hydrate quickly from cache, then continue to fetch fresh account data.
        applyHydratedAccountPayload(activeUserId, cachedPayload);
      }

      /**
       * Load account data from the server API first (service role, full rows).
       * The browser Supabase client goes second: RLS on `watched_pick_reviews` can
       * return an empty set or partial data for linked friends, while the profile
       * owner still sees full reviews from local storage — that mismatch breaks
       * "Recommends" on a friend’s profile.
       */
      let payload: AccountSyncPayload | null = null;
      try {
        const response = await fetch("/api/account-sync", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        });

        if (response.ok) {
          payload = (await response.json()) as AccountSyncPayload;
        }
      } catch {
        payload = null;
      }

      if (!payload) {
        payload = await fetchAccountSyncFromBrowser(supabaseClient, activeUserId);
      }

      if (!payload) {
        payload = cachedPayload;
      }

      if (!payload) {
        setIsSyncingAccountData(false);
        if (syncRetryCountRef.current < 5) {
          syncRetryCountRef.current += 1;
          window.setTimeout(() => {
            setAccountRefreshKey((current) => current + 1);
          }, 1200 + syncRetryCountRef.current * 300);
          return;
        }

        setAccountSyncError(
          "Couldn’t load your profile and picks from the server. Check Wi-Fi or mobile data, then Retry.",
        );
        return;
      }

      if (!active) {
        return;
      }

      applyHydratedAccountPayload(activeUserId, payload);
      syncRetryCountRef.current = 0;
      setIsSyncingAccountData(false);

      void (async () => {
        if (!active) {
          return;
        }
        try {
          const res = await fetch("/api/profiles/ensure-public-handle", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok || !active) {
            return;
          }
          const body = (await res.json()) as { publicHandle?: string };
          if (!body.publicHandle) {
            return;
          }
          setData((current) => {
            const u = current.users.find((x) => x.id === activeUserId);
            if (!u) {
              return current;
            }
            if (u.publicHandle === body.publicHandle) {
              return current;
            }
            return ensureLocalUser(current, {
              id: activeUserId,
              publicHandle: body.publicHandle,
              name: u.name,
              email: u.email,
              avatar: u.avatar,
              avatarImageUrl: u.avatarImageUrl,
              bio: u.bio,
              city: u.city,
              favoriteMovie: u.favoriteMovie,
              profileHeaderMovie: u.profileHeaderMovie,
              profileStyle: u.profileStyle,
            });
          });
        } catch {
          // Legacy handle backfill is best-effort.
        }
      })();
    }

    void loadSupabaseAppData().catch(() => {
      if (active) {
        setIsSyncingAccountData(false);
        setAccountSyncError("Sync stopped unexpectedly—often a weak signal. Check your connection, then Retry.");
      }
    });

    return () => {
      active = false;
    };
  }, [accountRefreshKey, currentUserId]);

  const currentUser = useMemo(
    () =>
      currentUserId
        ? data.users.find((user) => user.id === currentUserId) ?? null
        : null,
    [currentUserId, data.users],
  );

  const acceptedMovies = useMemo(() => {
    const acceptedIds = new Set(
      data.swipes
        .filter(
          (swipe) =>
            swipe.userId === currentUserId && swipe.decision === "accepted",
        )
        .map((swipe) => swipe.movieId),
    );
    return data.movies.filter((movie) => acceptedIds.has(movie.id));
  }, [data.movies, data.swipes, currentUserId]);

  const watchedPickReviews = useMemo(
    () =>
      currentUserId
        ? data.watchedPickReviews
            .filter((entry) => entry.userId === currentUserId)
            .map((entry) => ({
              movie: data.movies.find((movie) => movie.id === entry.movieId),
              recommended: entry.recommended,
              watchedAt: entry.watchedAt,
            }))
            .filter(
              (
                entry,
              ): entry is {
                movie: Movie;
                recommended: boolean;
                watchedAt: string;
              } => Boolean(entry.movie),
            )
            .sort(
              (left, right) =>
                new Date(right.watchedAt).getTime() - new Date(left.watchedAt).getTime(),
            )
        : [],
    [currentUserId, data.watchedPickReviews, data.movies],
  );

  const moviesByIdForTaste = useMemo(
    () => new Map(data.movies.map((m) => [m.id, m])),
    [data.movies],
  );

  const discoverPickEngagement: DiscoverPickEngagement[] = useMemo(
    () =>
      currentUserId
        ? data.watchedPickReviews
            .filter((entry) => entry.userId === currentUserId)
            .map((entry) => ({
              movieId: entry.movieId,
              recommended: entry.recommended,
            }))
        : [],
    [currentUserId, data.watchedPickReviews],
  );

  const discoverGenreAffinity = useMemo(() => {
    if (!currentUserId) {
      return new Map<string, number>();
    }
    return buildDiscoverGenreAffinity(
      acceptedMovies,
      discoverPickEngagement,
      moviesByIdForTaste,
    );
  }, [
    currentUserId,
    acceptedMovies,
    discoverPickEngagement,
    moviesByIdForTaste,
  ]);

  const discoverRejectedGenreWeights = useMemo(() => {
    if (!currentUserId) {
      return new Map<string, number>();
    }
    return buildRejectedGenreWeights(
      data.swipes,
      moviesByIdForTaste,
      currentUserId,
      discoverVisibilityTimestamp,
    );
  }, [
    currentUserId,
    data.swipes,
    moviesByIdForTaste,
    discoverVisibilityTimestamp,
  ]);

  const discoverTasteYear = useMemo(() => {
    const y = new Date().getFullYear();
    if (!currentUserId) {
      return { center: y - 4, spread: 14, classicEngaged: false };
    }
    return computeTasteYearProfile(
      acceptedMovies,
      discoverPickEngagement,
      moviesByIdForTaste,
      y,
    );
  }, [
    currentUserId,
    acceptedMovies,
    discoverPickEngagement,
    moviesByIdForTaste,
  ]);

  const discoverPersonalizationWeight = useMemo(() => {
    if (!currentUserId) {
      return 0;
    }
    const swipeCount = data.swipes.filter((s) => s.userId === currentUserId)
      .length;
    return computeDiscoverPersonalizationWeight(
      swipeCount,
      discoverPickEngagement.length,
    );
  }, [currentUserId, data.swipes, discoverPickEngagement.length]);

  const discoverQueue = useMemo(
    () =>
      buildDiscoverQueue({
        movies: data.movies,
        swipes: data.swipes,
        currentUserId,
        discoverShuffleSeed,
        discoverStartOffset,
        discoverVisibilityTimestamp,
        onboardingPreferences,
        pickEngagement: discoverPickEngagement,
      }),
    [
      data.movies,
      data.swipes,
      currentUserId,
      discoverShuffleSeed,
      discoverStartOffset,
      discoverVisibilityTimestamp,
      onboardingPreferences,
      discoverPickEngagement,
    ],
  );

  const sharedMovies: SharedMovieView[] = useMemo(
    () =>
      currentUserId
        ? data.links
            .filter(
              (link) =>
                link.status === "accepted" && link.users.includes(currentUserId),
            )
            .flatMap((link) => {
              const partnerId = link.users.find((id) => id !== currentUserId);
              const partner = data.users.find((user) => user.id === partnerId);

              if (!partnerId || !partner) {
                return [];
              }

              const partnerInfo = toPartnerViewUser(partner);

              const partnerAccepted = new Set(
                data.swipes
                  .filter(
                    (swipe) =>
                      swipe.userId === partnerId && swipe.decision === "accepted",
                  )
                  .map((swipe) => swipe.movieId),
              );

              return acceptedMovies
                .filter((movie) => partnerAccepted.has(movie.id))
                .map((movie) => {
                  const isHidden = data.sharedHiddenMovies.some(
                    (hidden) => hidden.pairKey === link.id && hidden.movieId === movie.id,
                  );
                  const savedState = data.sharedWatch.find(
                    (item) =>
                      item.pairKey === link.id &&
                      item.movieId === movie.id,
                  );

                  return {
                    linkId: link.id,
                    partner: partnerInfo,
                    movie,
                    shared: !isHidden,
                    watched: savedState?.watched ?? false,
                    progress: savedState?.progress ?? 0,
                  };
                });
            })
        : [],
    [
      currentUserId,
      data.links,
      data.swipes,
      data.sharedHiddenMovies,
      data.sharedWatch,
      data.users,
      acceptedMovies,
    ],
  );

  const linkedUsers = useMemo(
    () =>
      currentUserId
        ? data.links
            .filter((link) => link.users.includes(currentUserId))
            .map((link) => {
              const partnerId = link.users.find((id) => id !== currentUserId);
              const partner = data.users.find((user) => user.id === partnerId);

              if (!partner) {
                return null;
              }

              const partnerInfo = toPartnerViewUser(partner);

              return {
                user: partnerInfo,
                linkId: link.id,
                requesterId: link.requesterId ?? link.users[0],
                status: link.status,
                sharedCount: sharedMovies.filter(
                  (movie) => movie.partner.id === partnerInfo.id,
                ).length,
              };
            })
            .filter(
              (
                item,
              ): item is {
                user: User;
                linkId: string;
                requesterId: string;
                status: "accepted" | "pending";
                sharedCount: number;
              } => Boolean(item),
            )
        : [],
    [currentUserId, data.links, data.users, sharedMovies],
  );

  const friendLinksForNotify = useMemo(
    () =>
      currentUserId
        ? data.links.filter((link) => link.users.includes(currentUserId))
        : [],
    [data.links, currentUserId],
  );
  const friendLinksFingerprint = useMemo(
    () => friendLinksForNotify.map((l) => `${l.id}:${l.status}`).join("|"),
    [friendLinksForNotify],
  );

  useEffect(() => {
    if (!currentUserId) {
      friendLinksBaselineRef.current = false;
      friendLinksSnapshotRef.current = new Map();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!isReady || !currentUserId) {
      return;
    }
    const myLinks = friendLinksForNotify;
    const prev = friendLinksSnapshotRef.current;
    const allowNotify = (data.settings[currentUserId]?.notifications ?? true) !== false;

    if (!friendLinksBaselineRef.current) {
      const next = new Map<string, "pending" | "accepted">();
      for (const l of myLinks) {
        next.set(l.id, l.status);
      }
      friendLinksSnapshotRef.current = next;
      friendLinksBaselineRef.current = true;
      return;
    }

    const resolvePartner = (link: (typeof data.links)[number]) => {
      const partnerId = link.users.find((id) => id !== currentUserId);
      if (!partnerId) {
        return null;
      }
      return data.users.find((u) => u.id === partnerId) ?? null;
    };

    const candidates: FriendLinkNotifyPayload[] = [];
    for (const link of myLinks) {
      const o = prev.get(link.id);
      const req = link.requesterId ?? link.users[0];
      if (o === undefined) {
        if (link.status === "pending" && req !== currentUserId) {
          const p = resolvePartner(link);
          candidates.push({
            key: `${link.id}-incoming`,
            kind: "incoming_request",
            publicHandle: p?.publicHandle?.trim() || "unknown",
            displayName: (p?.name ?? p?.publicHandle ?? "Someone") as string,
          });
        }
      } else if (o === "pending" && link.status === "accepted" && req === currentUserId) {
        const p = resolvePartner(link);
        candidates.push({
          key: `${link.id}-accepted`,
          kind: "request_accepted",
          publicHandle: p?.publicHandle?.trim() || "unknown",
          displayName: (p?.name ?? p?.publicHandle ?? "Someone") as string,
        });
      }
    }

    const next = new Map<string, "pending" | "accepted">();
    for (const l of myLinks) {
      next.set(l.id, l.status);
    }
    friendLinksSnapshotRef.current = next;

    if (allowNotify && candidates.length) {
      const firstIncoming = candidates.find((c) => c.kind === "incoming_request");
      setFriendLinkNotifyToast(firstIncoming ?? candidates[0]!);
    }
    // `data` is not listed: `friendLinksForNotify` already tracks `data.links`; listing full `data` would notify on every swipe/movie change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isReady,
    currentUserId,
    friendLinksFingerprint,
    friendLinksForNotify,
    data.settings,
    data.users,
    setFriendLinkNotifyToast,
  ]);

  const sharedMovieGroups: SharedMovieGroup[] = useMemo(
    () =>
      linkedUsers
        .filter((linked) => linked.status === "accepted")
        .map((linked) => {
          const sharedEntries = sharedMovies.filter(
            (entry) => entry.partner.id === linked.user.id,
          );

          return {
            linkId: sharedEntries[0]?.linkId ?? `link-${linked.user.id}`,
            partner: linked.user,
            movies: sharedEntries,
          };
        }),
    [linkedUsers, sharedMovies],
  );

  const ongoingMovies: SharedMovieView[] = [];
  const achievements: Achievement[] = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    return computeAchievements(data, currentUserId);
  }, [data, currentUserId]);

  useEffect(() => {
    if (typeof window === "undefined" || !currentUserId) {
      return;
    }

    const storageKey = `${ACHIEVEMENT_STORAGE_PREFIX}-${currentUserId}`;
    const seenAchievementIds = new Set<string>(
      JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as string[],
    );
    const newlyUnlocked = achievements.find(
      (achievement) =>
        !achievement.isLocked &&
        achievement.progress >= achievement.target &&
        !seenAchievementIds.has(achievement.id),
    );

    if (!newlyUnlocked) {
      return;
    }

    seenAchievementIds.add(newlyUnlocked.id);
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(Array.from(seenAchievementIds)),
    );
    const timer = window.setTimeout(() => {
      setUnlockedAchievement(newlyUnlocked);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [achievements, currentUserId, setUnlockedAchievement]);

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      try {
        let authUser:
          | {
              id: string;
              email?: string | null;
              user_metadata?: Record<string, unknown>;
            }
          | undefined;

        try {
          const loginResponse = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          });

          const loginPayload = (await loginResponse.json()) as {
            error?: string;
            user?: {
              id: string;
              email?: string | null;
              user_metadata?: Record<string, unknown>;
            };
            session?: {
              access_token: string;
              refresh_token: string;
            };
          };

        if (loginResponse.ok && loginPayload.user && loginPayload.session) {
            persistStoredAuthSession({
              userId: loginPayload.user.id,
              email: loginPayload.user.email ?? email,
              accessToken: loginPayload.session.access_token,
              refreshToken: loginPayload.session.refresh_token,
            });

            await supabase.auth.setSession({
              access_token: loginPayload.session.access_token,
              refresh_token: loginPayload.session.refresh_token,
            });

            authUser = loginPayload.user;
          } else if (loginResponse.ok) {
            return {
              ok: false,
              message:
                loginPayload.error ??
                "We couldn’t sign you in. Double-check your email and password.",
            };
          }
        } catch {
          authUser = undefined;
        }

        if (!authUser) {
          const directLoginResult = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (directLoginResult.error || !directLoginResult.data.user) {
            return {
              ok: false,
              message:
                directLoginResult.error?.message ??
                "We couldn’t sign you in. Double-check your email and password.",
            };
          }

          authUser = {
            id: directLoginResult.data.user.id,
            email: directLoginResult.data.user.email,
            user_metadata: directLoginResult.data.user.user_metadata,
          };

          if (directLoginResult.data.session) {
            persistStoredAuthSession({
              userId: directLoginResult.data.user.id,
              email: directLoginResult.data.user.email ?? email,
              accessToken: directLoginResult.data.session.access_token,
              refreshToken: directLoginResult.data.session.refresh_token,
            });
          }
        }

        const fullName =
          (authUser.user_metadata?.full_name as string | undefined) ??
          authUser.email?.split("@")[0] ??
          "CineMatch User";

        const { data: postLoginUser } = await supabase.auth.getUser();
        const appMetadata =
          (postLoginUser.user?.app_metadata as Record<string, unknown> | undefined) ??
          undefined;

        setData((current) =>
          mergeAppMetadataSubscriptionIntoData(
            ensureLocalUser(current, {
              id: authUser.id,
              name: fullName,
              email: authUser.email ?? email,
              avatarImageUrl:
                (authUser.user_metadata?.avatar_image_url as string | undefined) ??
                undefined,
            }),
            authUser.id,
            appMetadata,
          ),
        );
        setCurrentUserId(authUser.id);
        refreshDiscoverShuffle(authUser.id);
        setAccountRefreshKey((current) => current + 1);

        const storedUserTheme = getStoredUserTheme(authUser.id);
        setPreferredDarkMode(storedUserTheme ?? getGlobalStoredTheme());

        void (async () => {
          try {
            const settingsResult = await supabase
              .from("settings")
              .select("dark_mode")
              .eq("user_id", authUser.id)
              .maybeSingle();
            const nextDarkMode =
              getStoredUserTheme(authUser.id) ??
              (settingsResult.data as { dark_mode?: boolean } | null)?.dark_mode ??
              getGlobalStoredTheme();
            setPreferredDarkMode(nextDarkMode);
            persistUserTheme(authUser.id, nextDarkMode);
          } catch {
            // Keep the restored local theme if this background fetch fails.
          }
        })();

        return { ok: true, shouldRedirect: true };
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof Error &&
            error.message.toLowerCase().includes("failed to fetch")
              ? "The app couldn’t reach the sign-in service right now. Please try again in a moment."
              : "We couldn’t sign you in right now. Please try again.",
        };
      }
    }

    const match = data.users.find(
      (user) =>
        user.email.toLowerCase() === email.toLowerCase() &&
        verifyOfflineDemoPassword(user, password),
    );

    if (!match) {
      return {
        ok: false,
        message: "Invalid email or password.",
      };
    }

    setCurrentUserId(match.id);
    refreshDiscoverShuffle(match.id);
    setAccountRefreshKey((current) => current + 1);
    const storedUserTheme = getStoredUserTheme(match.id);
    const nextDarkMode =
      storedUserTheme ??
      data.settings[match.id]?.darkMode ??
      getGlobalStoredTheme();
    setPreferredDarkMode(nextDarkMode);
    persistUserTheme(match.id, nextDarkMode);
    return { ok: true, shouldRedirect: true };
  };

  const signup = async ({
    email,
    name,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> => {
    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        return {
          ok: false,
          message: error.message,
        };
      }

      if (!authData.user) {
        return {
          ok: false,
          message: "We couldn’t create your account. Please try again.",
        };
      }

      const authUser = authData.user;

      setData((current) =>
        mergeAppMetadataSubscriptionIntoData(
          ensureLocalUser(current, {
            id: authUser.id,
            name,
            email: authUser.email ?? email,
          }),
          authUser.id,
          authUser.app_metadata as Record<string, unknown> | undefined,
        ),
      );

      if (authData.session) {
        persistStoredAuthSession({
          userId: authUser.id,
          email: authUser.email ?? email,
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
        });
        setCurrentUserId(authUser.id);
        refreshDiscoverShuffle(authUser.id);
        setAccountRefreshKey((current) => current + 1);
        setPreferredDarkMode(getStoredUserTheme(authUser.id) ?? false);
        return { ok: true, shouldRedirect: true };
      }

      return {
        ok: true,
        shouldRedirect: false,
        message:
          "Your account was created. Check your email to confirm it, then sign in.",
      };
    }

    const exists = data.users.some(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );

    if (exists) {
      return {
        ok: false,
        message: "That email is already in use. Try logging in instead.",
      };
    }

    const initials = name
      .split(" ")
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2);

    const nextUser: AuthUser = {
      id: `user-${crypto.randomUUID()}`,
      publicHandle: uniquePublicHandleFromEmail(data.users, email),
      name,
      email,
      password,
      avatar: initials || "CM",
      bio: "New to CineMatch and building the perfect watchlist.",
      city: "Set your city",
    };

    setData((current) => ({
      ...current,
      users: [...current.users, nextUser],
      settings: {
        ...current.settings,
        [nextUser.id]: { ...defaultSettings },
      },
    }));
    setCurrentUserId(nextUser.id);
    refreshDiscoverShuffle(nextUser.id);
    setAccountRefreshKey((current) => current + 1);
    setPreferredDarkMode(false);
    persistUserTheme(nextUser.id, false);

    return { ok: true, shouldRedirect: true };
  };

  const logout = async () => {
    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }

    clearStoredAuthSession();
    setCurrentUserId(null);
    refreshDiscoverShuffle(null);
    setAccountRefreshKey((current) => current + 1);
  };

  const registerMovies = useCallback((movies: Movie[]) => {
    setData((current) => mergeMoviesIntoData(current, movies));
  }, []);

  const collectMutualPartnerNamesBeforeUserAccepts = (
    prevData: AppData,
    activeUserId: string,
    targetMovieId: string,
  ): string[] => {
    const hadUserAccept = prevData.swipes.some(
      (swipe) =>
        swipe.userId === activeUserId &&
        swipe.movieId === targetMovieId &&
        swipe.decision === "accepted",
    );

    if (hadUserAccept) {
      return [];
    }

    const names: string[] = [];

    for (const link of prevData.links) {
      if (link.status !== "accepted" || !link.users.includes(activeUserId)) {
        continue;
      }

      const partnerId = link.users.find((id) => id !== activeUserId);

      if (!partnerId) {
        continue;
      }

      const partnerAccepted = prevData.swipes.some(
        (swipe) =>
          swipe.userId === partnerId &&
          swipe.movieId === targetMovieId &&
          swipe.decision === "accepted",
      );

      if (!partnerAccepted) {
        continue;
      }

      const partner = prevData.users.find((user) => user.id === partnerId);

      if (partner) {
        names.push(partner.name);
      }
    }

    return names;
  };

  const swipeMovie = async (movieId: string, decision: SwipeDecision) => {
    if (!currentUserId) {
      return;
    }

    const movie = data.movies.find((entry) => entry.id === movieId);
    const matchPartners =
      decision === "accepted"
        ? collectMutualPartnerNamesBeforeUserAccepts(data, currentUserId, movieId)
        : [];

    const announceMutualIfNeeded = () => {
      if (matchPartners.length > 0 && movie) {
        setMutualMatchToast({ movieTitle: movie.title, partners: matchPartners });
        queueMicrotask(() => {
          playWaterDropletChime();
        });
      }
    };

    /** Apply swipe locally first so Discover can advance without waiting on the network. */
    setData((current) => {
      const existingWithoutCurrentChoice = current.swipes.filter(
        (swipe) =>
          !(swipe.userId === currentUserId && swipe.movieId === movieId),
      );

      return {
        ...mergeMoviesIntoData(current, movie ? [movie] : []),
        swipes: [
          ...existingWithoutCurrentChoice,
          {
            userId: currentUserId,
            movieId,
            decision,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });
    announceMutualIfNeeded();

    const accessToken = await getCurrentAccessToken();

    if (movie && accessToken) {
      try {
        const response = await fetch("/api/swipes", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            movie,
            decision,
          }),
        });

        const payload = (await response.json()) as {
          swipe?: SwipeRow;
          error?: string;
        };

        if (response.ok && payload.swipe) {
          const createdAt = payload.swipe.created_at;
          setData((current) => ({
            ...mergeMoviesIntoData(current, [movie]),
            swipes: [
              ...current.swipes.filter(
                (swipe) =>
                  !(swipe.userId === currentUserId && swipe.movieId === movieId),
              ),
              {
                userId: currentUserId,
                movieId,
                decision,
                createdAt,
              },
            ],
          }));
          // Do not bump account refresh here: a full sync reapplies cached snapshots
          // and can briefly wipe this swipe, so Discover shows the same card again.
          return;
        }
      } catch {
        // Swipe is already stored locally; network can fail silently here.
      }
    }
  };

  const undoSwipe = async (movieId: string) => {
    if (!currentUserId) {
      return;
    }

    const accessToken = await getCurrentAccessToken();

    if (accessToken) {
      try {
        await fetch("/api/swipes", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ movieId }),
        });
      } catch {
        // Keep local undo even if the network request fails.
      }
    }

    setData((current) => ({
      ...current,
      swipes: current.swipes.filter(
        (swipe) =>
          !(swipe.userId === currentUserId && swipe.movieId === movieId),
      ),
    }));
  };

  const unlinkUser = async (
    targetUserId: string,
  ): Promise<{ ok: boolean; message: string }> => {
    if (!currentUserId || currentUserId === targetUserId) {
      return { ok: false, message: "We couldn’t remove this connection." };
    }

    const existingLink = data.links.find(
      (link) =>
        link.users.includes(currentUserId) && link.users.includes(targetUserId),
    );

    if (!existingLink) {
      return { ok: false, message: "This connection no longer exists." };
    }

    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      const { error } = await supabase
        .from("linked_users")
        .delete()
        .eq("id", existingLink.id);

      if (error) {
        return {
          ok: false,
          message: "We couldn’t remove this connection yet.",
        };
      }
    }

    setData((current) => ({
      ...current,
      links: current.links.filter((link) => link.id !== existingLink.id),
      sharedWatch: current.sharedWatch.filter(
        (entry) => entry.pairKey !== existingLink.id,
      ),
    }));
    setAccountRefreshKey((current) => current + 1);

    return { ok: true, message: "Connection removed." };
  };

  const removePick = async (movieId: string) => {
    if (!currentUserId) {
      return;
    }

    const accessToken = await getCurrentAccessToken();

    if (accessToken) {
      try {
        await fetch("/api/swipes", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ movieId }),
        });
      } catch {
        // Keep local removal even if the network fails.
      }
    }

    setData((current) => ({
      ...current,
      swipes: current.swipes.filter(
        (swipe) =>
          !(
            swipe.userId === currentUserId &&
            swipe.movieId === movieId &&
            swipe.decision === "accepted"
          ),
      ),
      watchedPickReviews: current.watchedPickReviews.filter(
        (entry) =>
          !(entry.userId === currentUserId && entry.movieId === movieId),
      ),
    }));

    const supabase = getSupabaseBrowserClient();
    if (supabase && isSupabaseConfigured()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("watched_pick_reviews")
        .delete()
        .eq("user_id", currentUserId)
        .eq("movie_id", movieId);
      if (error) {
        requestAccountDataRefresh();
      }
    }
  };

  const markPickWatched = async (movieId: string, recommended: boolean) => {
    if (!currentUserId) {
      return;
    }

    const movieForSupabase = data.movies.find((entry) => entry.id === movieId);
    const watchedAt = new Date().toISOString();

    setData((current) => {
      const existing = current.watchedPickReviews.find(
        (entry) => entry.userId === currentUserId && entry.movieId === movieId,
      );

      if (existing) {
        return {
          ...current,
          watchedPickReviews: current.watchedPickReviews.map((entry) =>
            entry.id === existing.id
              ? {
                  ...entry,
                  recommended,
                  watchedAt,
                }
              : entry,
          ),
        };
      }

      return {
        ...current,
        watchedPickReviews: [
          ...current.watchedPickReviews,
          {
            id: `watched-pick-${crypto.randomUUID()}`,
            userId: currentUserId,
            movieId,
            recommended,
            watchedAt,
          },
        ],
      };
    });

    const supabase = getSupabaseBrowserClient();
    if (supabase && isSupabaseConfigured()) {
      if (movieForSupabase) {
        await persistMovieToSupabase(movieForSupabase);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("watched_pick_reviews").upsert(
        {
          user_id: currentUserId,
          movie_id: movieId,
          recommended,
          watched_at: watchedAt,
        },
        { onConflict: "user_id,movie_id" },
      );
      if (error) {
        requestAccountDataRefresh();
      }
    }
  };

  const unmarkPickWatched = async (movieId: string) => {
    if (!currentUserId) {
      return;
    }

    setData((current) => ({
      ...current,
      watchedPickReviews: current.watchedPickReviews.filter(
        (entry) => !(entry.userId === currentUserId && entry.movieId === movieId),
      ),
    }));

    const supabase = getSupabaseBrowserClient();
    if (supabase && isSupabaseConfigured()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("watched_pick_reviews")
        .delete()
        .eq("user_id", currentUserId)
        .eq("movie_id", movieId);
      if (error) {
        requestAccountDataRefresh();
      }
    }
  };

  const toggleSharedMovie = async (
    partnerId: string,
    movieId: string,
    shared: boolean,
  ) => {
    if (!currentUserId) {
      return;
    }

    const linkId =
      data.links.find(
        (link) =>
          link.status === "accepted" &&
          link.users.includes(currentUserId) &&
          link.users.includes(partnerId),
      )?.id ?? getPairKey(currentUserId, partnerId);

    setData((current) => {
      const alreadyHidden = current.sharedHiddenMovies.some(
        (entry) => entry.pairKey === linkId && entry.movieId === movieId,
      );

      if (shared && !alreadyHidden) {
        return current;
      }

      if (shared) {
        return {
          ...current,
          sharedHiddenMovies: current.sharedHiddenMovies.filter(
            (entry) => !(entry.pairKey === linkId && entry.movieId === movieId),
          ),
        };
      }

      if (alreadyHidden) {
        return current;
      }

      return {
        ...current,
        sharedHiddenMovies: [
          ...current.sharedHiddenMovies,
          {
            id: `shared-hidden-${crypto.randomUUID()}`,
            pairKey: linkId,
            movieId,
            hiddenAt: new Date().toISOString(),
          },
        ],
      };
    });
  };

  const toggleWatched = async (
    partnerId: string,
    movieId: string,
    watched: boolean,
  ) => {
    if (!currentUserId) {
      return;
    }

    const pairKey =
      data.links.find(
        (link) => link.users.includes(currentUserId) && link.users.includes(partnerId),
      )?.id ?? getPairKey(currentUserId, partnerId);
    const supabase = getSupabaseBrowserClient();
    const movie = data.movies.find((entry) => entry.id === movieId);

    if (supabase && isSupabaseConfigured() && movie) {
      await persistMovieToSupabase(movie);
      const sharedWatchPayload = {
        linked_user_id: pairKey,
        movie_id: movieId,
        watched,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("shared_watchlist").upsert(
        sharedWatchPayload as never,
        { onConflict: "linked_user_id,movie_id" },
      );
    }

    setData((current) => {
      const existing = current.sharedWatch.find(
        (item) => item.pairKey === pairKey && item.movieId === movieId,
      );

      if (existing) {
        return {
          ...current,
          sharedWatch: current.sharedWatch.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  watched,
                  progress: watched ? 100 : 0,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        };
      }

      return {
        ...current,
        sharedWatch: [
          ...current.sharedWatch,
          {
            id: `shared-${crypto.randomUUID()}`,
            pairKey,
            movieId,
            watched,
            progress: watched ? 100 : 0,
            updatedAt: new Date().toISOString(),
          },
        ],
      };
    });
  };

  const updateProgress = async (
    partnerId: string,
    movieId: string,
    progress: number,
  ) => {
    if (!currentUserId) {
      return;
    }

    const normalizedProgress = Math.max(0, Math.min(Math.round(progress), 100));
    const pairKey =
      data.links.find(
        (link) => link.users.includes(currentUserId) && link.users.includes(partnerId),
      )?.id ?? getPairKey(currentUserId, partnerId);

    setData((current) => {
      const existing = current.sharedWatch.find(
        (item) => item.pairKey === pairKey && item.movieId === movieId,
      );

      if (existing) {
        return {
          ...current,
          sharedWatch: current.sharedWatch.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  progress: normalizedProgress,
                  watched: normalizedProgress >= 100,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        };
      }

      return {
        ...current,
        sharedWatch: [
          ...current.sharedWatch,
          {
            id: `shared-${crypto.randomUUID()}`,
            pairKey,
            movieId,
            watched: normalizedProgress >= 100,
            progress: normalizedProgress,
            updatedAt: new Date().toISOString(),
          },
        ],
      };
    });

    await toggleWatched(partnerId, movieId, normalizedProgress >= 100);
  };

  const updateProfile = async ({
    name,
    bio,
    city,
    publicHandle: publicHandleInput,
    avatarImageUrl,
    avatarFile,
    favoriteMovie,
    profileHeaderMovie,
    profileStyle,
    clearAvatar,
  }: {
    name: string;
    bio: string;
    city: string;
    publicHandle?: string;
    avatarImageUrl?: string | null;
    avatarFile?: File | null;
    favoriteMovie?: FavoriteMovieSummary | null;
    profileHeaderMovie?: FavoriteMovieSummary | null;
    profileStyle?: ProProfileStyle;
    clearAvatar?: boolean;
  }): Promise<{ ok: boolean; message?: string }> => {
    if (!currentUserId) {
      return { ok: false, message: "You need to be signed in to update your profile." };
    }

    let resolvedPublicHandle: string | undefined;
    if (publicHandleInput !== undefined) {
      const normalized = normalizePublicHandleInput(publicHandleInput);
      const formatError = describePublicHandleValidationError(normalized);
      if (formatError) {
        return { ok: false, message: formatError };
      }
      if (
        normalized !== currentUser?.publicHandle &&
        !isSupabaseConfigured() &&
        data.users.some(
          (u) => u.id !== currentUserId && u.publicHandle === normalized,
        )
      ) {
        return {
          ok: false,
          message: "That User ID is already taken. Try another one.",
        };
      }
      resolvedPublicHandle = normalized;
    }

    let retriedProfileWithoutHeader = false;

    const supabase = getSupabaseBrowserClient();
    const passedAvatar =
      typeof avatarImageUrl === "string" && avatarImageUrl.trim().length > 0
        ? avatarImageUrl.trim()
        : undefined;

    let nextAvatarImageUrl: string | undefined;
    if (clearAvatar) {
      nextAvatarImageUrl = undefined;
    } else if (!avatarFile) {
      nextAvatarImageUrl = passedAvatar ?? currentUser?.avatarImageUrl;
    }

    if (supabase && isSupabaseConfigured()) {
      if (clearAvatar) {
        nextAvatarImageUrl = undefined;
      } else if (avatarFile) {
        const uploadedUrl = await uploadProfilePhoto(currentUserId, avatarFile);

        if (!uploadedUrl) {
          return {
            ok: false,
            message:
              "Couldn’t upload your photo. Try a smaller JPG or PNG, or check storage permissions.",
          };
        }

        nextAvatarImageUrl = uploadedUrl;
      }

      const authMetadata: Record<string, string | null> = {
        full_name: name,
      };
      if (clearAvatar) {
        authMetadata.avatar_image_url = null;
      } else if (nextAvatarImageUrl) {
        authMetadata.avatar_image_url = nextAvatarImageUrl;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: authMetadata,
      });

      if (authError) {
        return {
          ok: false,
          message: authError.message || "Couldn’t update your sign-in profile.",
        };
      }

      const profilePatch: Record<string, unknown> = {
        full_name: name,
        avatar_text: getAvatarText(name, currentUser?.email ?? ""),
        bio,
        city,
        profile_style: profileStyle ?? currentUser?.profileStyle ?? "classic",
        updated_at: new Date().toISOString(),
      };
      if (favoriteMovie !== undefined) {
        profilePatch.favorite_movie_id = favoriteMovie?.id ?? null;
        profilePatch.favorite_movie_title = favoriteMovie?.title ?? null;
        profilePatch.favorite_movie_year = favoriteMovie?.year ?? null;
        profilePatch.favorite_movie_poster_url = favoriteMovie?.posterImageUrl ?? null;
        profilePatch.favorite_movie_media_type = favoriteMovie?.mediaType ?? null;
      }
      if (profileHeaderMovie !== undefined) {
        profilePatch.profile_header_movie_id = profileHeaderMovie?.id ?? null;
        profilePatch.profile_header_movie_title = profileHeaderMovie?.title ?? null;
        profilePatch.profile_header_movie_year = profileHeaderMovie?.year ?? null;
        profilePatch.profile_header_poster_url = profileHeaderMovie?.posterImageUrl ?? null;
        profilePatch.profile_header_media_type = profileHeaderMovie?.mediaType ?? null;
      }
      if (clearAvatar) {
        profilePatch.avatar_image_url = null;
      } else if (typeof nextAvatarImageUrl === "string" && nextAvatarImageUrl.length > 0) {
        profilePatch.avatar_image_url = nextAvatarImageUrl;
      }
      if (resolvedPublicHandle !== undefined) {
        profilePatch.public_handle = resolvedPublicHandle;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profilePatch as never)
        .eq("id", currentUserId);

      if (profileError) {
        const canRetry =
          profileHeaderMovie !== undefined &&
          isMissingProfileHeaderColumnError(profileError.message);
        if (canRetry) {
          const { error: retryError } = await supabase
            .from("profiles")
            .update(withoutProfileHeaderFields(profilePatch) as never)
            .eq("id", currentUserId);
          if (retryError) {
            return {
              ok: false,
              message: retryError.message ?? "Couldn’t save your profile to the server.",
            };
          }
          retriedProfileWithoutHeader = true;
        } else {
          const code = (profileError as { code?: string })?.code;
          const msg = profileError.message ?? "";
          const looksLikeHandleConflict =
            publicHandleInput !== undefined &&
            (code === "23505" ||
              msg.toLowerCase().includes("public_handle") ||
              (msg.toLowerCase().includes("unique") && msg.toLowerCase().includes("public")));
          if (looksLikeHandleConflict) {
            return {
              ok: false,
              message: "That User ID is already taken. Try another one.",
            };
          }
          return {
            ok: false,
            message: msg || "Couldn’t save your profile to the server.",
          };
        }
      }
    }

    setData((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === currentUserId
          ? {
              ...user,
              publicHandle:
                publicHandleInput !== undefined
                  ? (resolvedPublicHandle as string)
                  : user.publicHandle,
              name,
              avatar: getAvatarText(name, user.email),
              bio,
              city,
              avatarImageUrl: clearAvatar
                ? undefined
                : (nextAvatarImageUrl ?? user.avatarImageUrl),
              favoriteMovie:
                favoriteMovie === undefined
                  ? user.favoriteMovie
                  : (favoriteMovie ?? undefined),
              profileHeaderMovie: retriedProfileWithoutHeader
                ? user.profileHeaderMovie
                : profileHeaderMovie === undefined
                  ? user.profileHeaderMovie
                  : (profileHeaderMovie ?? undefined),
              profileStyle: profileStyle ?? user.profileStyle ?? "classic",
            }
          : user,
      ),
    }));
    // Avoid full account sync here — it delays the UI and reapplies cached snapshots.
    return {
      ok: true,
      message: retriedProfileWithoutHeader
        ? MISSING_PROFILE_HEADER_DB_HINT
        : undefined,
    };
  };

  const updateSettings = async (payload: Partial<ProfileSettings>) => {
    if (!currentUserId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const baseSettings = {
      ...(data.settings[currentUserId] ?? defaultSettings),
      darkMode: preferredDarkMode,
    };
    const nextSettings = {
      ...baseSettings,
      ...payload,
    };

    // Apply settings immediately so theme and toggles feel instant.
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        nextSettings.darkMode ? "dark" : "light",
      );
    }
    persistUserTheme(currentUserId, nextSettings.darkMode);
    persistUserAutoplayTrailers(currentUserId, nextSettings.autoplayTrailers);
    setPreferredDarkMode(nextSettings.darkMode);

    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [currentUserId]: {
          ...nextSettings,
        },
      },
    }));

    if (supabase && isSupabaseConfigured()) {
      const settingsPayload = {
        user_id: currentUserId,
        dark_mode: nextSettings.darkMode,
        notifications: nextSettings.notifications,
        autoplay_trailers: nextSettings.autoplayTrailers,
        hide_spoilers: nextSettings.hideSpoilers,
        cellular_sync: nextSettings.cellularSync,
        reduce_motion: nextSettings.reduceMotion,
        subscription_tier: nextSettings.subscriptionTier,
        admin_mode_simulate_pro: nextSettings.adminModeSimulatePro,
        updated_at: new Date().toISOString(),
      };
      void (async () => {
        const upsertResult = await supabase.from("settings").upsert(
          settingsPayload as never,
          { onConflict: "user_id" },
        );

        const upsertError = upsertResult.error as SupabaseErrorLike;
        if (
          upsertError &&
          (isMissingOptionalSettingsColumnError(upsertError, "subscription_tier") ||
            isMissingOptionalSettingsColumnError(upsertError, "admin_mode_simulate_pro"))
        ) {
          await supabase.from("settings").upsert(
            {
              user_id: currentUserId,
              dark_mode: nextSettings.darkMode,
              notifications: nextSettings.notifications,
              autoplay_trailers: nextSettings.autoplayTrailers,
              hide_spoilers: nextSettings.hideSpoilers,
              cellular_sync: nextSettings.cellularSync,
              reduce_motion: nextSettings.reduceMotion,
              updated_at: new Date().toISOString(),
            } as never,
            { onConflict: "user_id" },
          );
        }
      })();
    }
  };

  const setAdminSubscriptionPreviewMode = async (enabled: boolean) => {
    await updateSettings({ adminModeSimulatePro: enabled });
  };

  const completeOnboarding = async (
    payload: Omit<OnboardingPreferences, "completedAt">,
  ) => {
    if (!currentUserId) {
      return;
    }

    const completedPreferences: OnboardingPreferences = {
      favoriteGenres: payload.favoriteGenres,
      dislikedGenres: payload.dislikedGenres,
      mediaPreference: payload.mediaPreference,
      tasteProfile: payload.tasteProfile,
      completedAt: new Date().toISOString(),
    };

    setOnboardingPreferences(completedPreferences);
    persistOnboardingPreferences(currentUserId, completedPreferences);
  };

  const resetOnboarding = async () => {
    if (!currentUserId) {
      return;
    }

    const clearedPreferences = { ...DEFAULT_ONBOARDING_PREFERENCES };
    setOnboardingPreferences(clearedPreferences);
    persistOnboardingPreferences(currentUserId, clearedPreferences);
  };

  const retryAccountSync = useCallback(() => {
    syncRetryCountRef.current = 0;
    setAccountSyncError(null);
    setAccountRefreshKey((current) => current + 1);
  }, []);

  const dismissAccountSyncError = useCallback(() => {
    setAccountSyncError(null);
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      queueMicrotask(() => {
        setAccountSyncError(null);
      });
    }
  }, [currentUserId]);

  return (
    <AppStateContext.Provider
      value={{
        data,
        currentUserId,
        currentUser,
        onboardingPreferences,
        isOnboardingComplete,
        isDarkMode,
        isReady,
        isSyncingAccountData,
        accountSyncError,
        retryAccountSync,
        dismissAccountSyncError,
        refreshAccountData: requestAccountDataRefresh,
        achievements,
        unlockedAchievement,
        dismissUnlockedAchievement,
        mutualMatchToast,
        dismissMutualMatchToast,
        friendLinkNotifyToast,
        dismissFriendLinkNotifyToast,
        login,
        signup,
        logout,
        completeOnboarding,
        resetOnboarding,
        registerMovies,
        swipeMovie,
        undoSwipe,
        removePick,
        markPickWatched,
        unmarkPickWatched,
        toggleSharedMovie,
        unlinkUser,
        toggleWatched,
        updateProgress,
        updateProfile,
        updateSettings,
        subscriptionTier,
        effectiveSubscriptionTier,
        hasProAccess,
        adminSubscriptionPreviewModeEnabled,
        setAdminSubscriptionPreviewMode,
        acceptedMovies,
        watchedPickReviews,
        discoverQueue,
        discoverVisibilityTimestamp,
        discoverStartOffset,
        discoverSessionKey: discoverShuffleSeed,
        discoverGenreAffinity,
        discoverRejectedGenreWeights,
        discoverTasteYear,
        discoverPersonalizationWeight,
        linkedUsers,
        sharedMovies,
        sharedMovieGroups,
        ongoingMovies,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const value = useContext(AppStateContext);

  if (!value) {
    throw new Error("useAppState must be used within AppStateProvider");
  }

  return value;
}
