"use client";

import {
  createClient,
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
import { defaultSettings, initialAppData } from "@/lib/mock-data";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  Achievement,
  AppData,
  AuthUser,
  Movie,
  ProfileSettings,
  SharedMovieGroup,
  SharedMovieView,
  SwipeDecision,
  User,
} from "@/lib/types";

const STORAGE_KEY = "cinematch-demo-state-v5";
const CURRENT_USER_KEY = "cinematch-current-user-v5";
const ACHIEVEMENT_STORAGE_PREFIX = "cinematch-achievements";
const THEME_STORAGE_KEY = "cinematch-theme-mode";
const USER_THEME_STORAGE_PREFIX = "cinematch-user-theme";
const ACCOUNT_CACHE_STORAGE_PREFIX = "cinematch-account-cache";
const AUTH_SESSION_STORAGE_KEY = "cinematch-auth-session";
const REJECT_HIDE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type AuthResult =
  | { ok: true; message?: string; shouldRedirect?: boolean }
  | {
      ok: false;
      message: string;
    };

type InviteLinkResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_text: string;
  avatar_image_url?: string | null;
  bio: string;
  city: string;
};

type SettingsRow = {
  user_id: string;
  dark_mode: boolean;
  notifications: boolean;
  autoplay_trailers: boolean;
  hide_spoilers: boolean;
  cellular_sync: boolean;
};

type SwipeRow = {
  user_id: string;
  movie_id: string;
  decision: SwipeDecision;
  created_at: string;
};

type LinkRow = {
  id: string;
  requester_id: string;
  target_id: string;
  status: "accepted" | "pending";
  created_at: string;
};

type InviteRow = {
  id: string;
  inviter_id: string;
  token: string;
  created_at: string;
  used_at: string | null;
};

type SharedWatchRow = {
  id: string;
  linked_user_id: string;
  movie_id: string;
  watched: boolean;
  updated_at: string;
};

type MovieRow = {
  id: string;
  title: string;
  release_year: number;
  runtime: string;
  rating: number;
  genres: string[];
  description: string;
  poster_eyebrow: string;
  poster_image_url?: string | null;
  accent_from: string;
  accent_to: string;
  trailer_url?: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type StoredAuthSession = {
  userId: string;
  email?: string | null;
  accessToken: string;
  refreshToken: string;
};

type AccountSyncPayload = {
  profile: ProfileRow | null;
  settings: SettingsRow | null;
  links: LinkRow[];
  invites: InviteRow[];
  partnerProfiles: ProfileRow[];
  swipes: SwipeRow[];
  sharedWatch: SharedWatchRow[];
  movies: MovieRow[];
};

type AppStateContextValue = {
  data: AppData;
  currentUserId: string | null;
  currentUser: User | null;
  isDarkMode: boolean;
  isReady: boolean;
  isSyncingAccountData: boolean;
  achievements: Achievement[];
  unlockedAchievement: Achievement | null;
  dismissUnlockedAchievement: () => void;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (payload: {
    name: string;
    email: string;
    password: string;
  }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  registerMovies: (movies: Movie[]) => void;
  swipeMovie: (movieId: string, decision: SwipeDecision) => Promise<void>;
  removePick: (movieId: string) => Promise<void>;
  removeSharedMovie: (partnerId: string, movieId: string) => Promise<void>;
  linkUser: (targetUserId: string) => Promise<void>;
  unlinkUser: (targetUserId: string) => Promise<{ ok: boolean; message: string }>;
  createInviteLink: () => Promise<InviteLinkResult>;
  acceptInviteToken: (
    token: string,
  ) => Promise<{ ok: boolean; message: string; partnerName?: string }>;
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
    avatarImageUrl?: string;
  }) => Promise<void>;
  updateSettings: (payload: Partial<ProfileSettings>) => Promise<void>;
  acceptedMovies: Movie[];
  discoverQueue: Movie[];
  discoverSessionKey: string;
  linkedUsers: {
    user: User;
    status: "accepted" | "pending";
    sharedCount: number;
  }[];
  sharedMovies: SharedMovieView[];
  sharedMovieGroups: SharedMovieGroup[];
  ongoingMovies: SharedMovieView[];
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

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

function ensureLocalUser(
  current: AppData,
  payload: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    avatarImageUrl?: string;
    bio?: string;
    city?: string;
  },
) {
  const existingUser = current.users.find((user) => user.id === payload.id);

  if (existingUser) {
    return {
      ...current,
      users: current.users.map((user) =>
        user.id === payload.id
          ? {
              ...user,
              name: payload.name,
              email: payload.email,
              avatar: payload.avatar ?? user.avatar,
              avatarImageUrl: payload.avatarImageUrl ?? user.avatarImageUrl,
              bio: payload.bio ?? user.bio,
              city: payload.city ?? user.city,
            }
          : user,
      ),
    };
  }

  const nextUser: AuthUser = {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    password: "",
    avatar: payload.avatar ?? getAvatarText(payload.name, payload.email),
    avatarImageUrl: payload.avatarImageUrl,
    bio:
      payload.bio ?? "New to CineMatch and building the perfect watchlist.",
    city: payload.city ?? "Set your city",
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
    autoplayTrailers: settings.autoplay_trailers,
    hideSpoilers: settings.hide_spoilers,
    cellularSync: settings.cellular_sync,
  };
}

function mapSwipeRow(swipe: SwipeRow) {
  return {
    userId: swipe.user_id,
    movieId: swipe.movie_id,
    decision: swipe.decision,
    createdAt: swipe.created_at,
  };
}

function mapLinkRow(link: LinkRow) {
  return {
    id: link.id,
    users: [link.requester_id, link.target_id] as [string, string],
    status: link.status,
    createdAt: link.created_at,
  };
}

function mapInviteRow(invite: InviteRow) {
  return {
    id: invite.id,
    inviterId: invite.inviter_id,
    token: invite.token,
    createdAt: invite.created_at,
    usedAt: invite.used_at,
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
    poster: {
      eyebrow: movie.poster_eyebrow,
      imageUrl: movie.poster_image_url ?? undefined,
      accentFrom: movie.accent_from,
      accentTo: movie.accent_to,
    },
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

function getStoredAuthSession() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuthSession) : null;
  } catch {
    return null;
  }
}

function persistStoredAuthSession(session: StoredAuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage failures.
  }
}

function clearStoredAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

function getAccountCacheKey(userId: string) {
  return `${ACCOUNT_CACHE_STORAGE_PREFIX}-${userId}`;
}

function getStoredAccountSnapshot(userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getAccountCacheKey(userId));
    return raw ? (JSON.parse(raw) as AccountSyncPayload) : null;
  } catch {
    return null;
  }
}

function persistAccountSnapshot(userId: string, payload: AccountSyncPayload) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getAccountCacheKey(userId), JSON.stringify(payload));
  } catch {
    // Ignore snapshot cache failures.
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

function getRuntimeMinutes(runtimeLabel: string) {
  if (!runtimeLabel || runtimeLabel === "Runtime unavailable") {
    return null;
  }

  const hoursMatch = runtimeLabel.match(/(\d+)h/);
  const minutesMatch = runtimeLabel.match(/(\d+)m/);
  const hours = hoursMatch ? Number(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
  const totalMinutes = hours * 60 + minutes;

  return totalMinutes > 0 ? totalMinutes : null;
}

function passesDiscoverQualityThreshold(movie: Movie) {
  if (movie.rating < 3) {
    return false;
  }

  const runtimeMinutes = getRuntimeMinutes(movie.runtime);

  if (runtimeMinutes !== null && runtimeMinutes < 20) {
    return false;
  }

  return true;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function createTokenBoundSupabaseClient(accessToken: string) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function getCurrentAccessToken() {
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
    trailer_url: null,
  };

  await supabase.from("movies").upsert(moviePayload as never, {
    onConflict: "id",
  });
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() => {
    if (typeof window === "undefined") {
      return cloneInitialData();
    }

    const storedData = window.localStorage.getItem(STORAGE_KEY);
    return storedData ? (JSON.parse(storedData) as AppData) : cloneInitialData();
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

    return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
  });
  const [isReady, setIsReady] = useState(() => !isSupabaseConfigured());
  const [isSyncingAccountData, setIsSyncingAccountData] = useState(false);
  const [accountRefreshKey, setAccountRefreshKey] = useState(0);
  const [discoverShuffleSeed, setDiscoverShuffleSeed] = useState(() =>
    Date.now().toString(),
  );
  const [discoverStartOffset, setDiscoverStartOffset] = useState(() =>
    Math.floor(Math.random() * 1000),
  );
  const [discoverVisibilityTimestamp, setDiscoverVisibilityTimestamp] = useState(
    () => Date.now(),
  );
  const [unlockedAchievement, setUnlockedAchievement] =
    useState<Achievement | null>(null);
  const syncRetryCountRef = useRef(0);
  const isDarkMode = preferredDarkMode;
  const refreshDiscoverShuffle = (userId: string | null) => {
    const nextShuffleSeed =
      userId && typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `${userId}-${crypto.randomUUID()}`
        : userId
          ? `${userId}-${Date.now()}-${Math.random()}`
          : `${Date.now()}-${Math.random()}`;
    const nextOffset =
      typeof crypto !== "undefined" && "getRandomValues" in crypto
        ? crypto.getRandomValues(new Uint32Array(1))[0]
        : Math.floor(Math.random() * 100000);

    setDiscoverShuffleSeed(
      nextShuffleSeed,
    );
    setDiscoverStartOffset(nextOffset);
    setDiscoverVisibilityTimestamp(Date.now());
  };

  const applyHydratedAccountPayload = (
    activeUserId: string,
    payload: AccountSyncPayload,
  ) => {
    persistAccountSnapshot(activeUserId, payload);

    const linkRows = payload.links ?? [];
    const partnerIds = Array.from(
      new Set(
        linkRows.map((link) =>
          link.requester_id === activeUserId ? link.target_id : link.requester_id,
        ),
      ),
    );
    const hydratedSwipeUserIds = Array.from(
      new Set([activeUserId, ...partnerIds]),
    );
    const sharedLinkIds = linkRows.map((link) => link.id);
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
          name: profile.full_name,
          email: profile.email,
          avatar: profile.avatar_text,
          avatarImageUrl: profile.avatar_image_url ?? undefined,
          bio: profile.bio,
          city: profile.city,
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
      const currentInvites = [
        ...next.invites.filter((invite) => invite.inviterId !== activeUserId),
        ...(payload.invites ?? []).map(mapInviteRow),
      ];
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

      return {
        ...next,
        swipes: currentSwipes,
        links: currentLinks,
        invites: currentInvites,
        sharedWatch: currentSharedWatch,
        settings: ownSettings
          ? {
              ...next.settings,
              [activeUserId]: mapSettingsRow(ownSettings),
            }
          : next.settings,
      };
    });

    if (payload.settings) {
      const dbDarkMode = mapSettingsRow(payload.settings).darkMode;
      const nextDarkMode = getStoredUserTheme(activeUserId) ?? dbDarkMode;
      setPreferredDarkMode(nextDarkMode);
      persistUserTheme(activeUserId, nextDarkMode);
    }
  };

  const fetchAccountSyncFromBrowser = useCallback(async (
    supabaseClient: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
    activeUserId: string,
  ): Promise<AccountSyncPayload | null> => {
    const profileResult = await supabaseClient
      .from("profiles")
      .select("id, email, full_name, avatar_text, avatar_image_url, bio, city")
      .eq("id", activeUserId)
      .maybeSingle();

    if (profileResult.error) {
      return null;
    }

    const [settingsResult, linksResult, invitesResult] = await Promise.all([
      supabaseClient
        .from("settings")
        .select(
          "user_id, dark_mode, notifications, autoplay_trailers, hide_spoilers, cellular_sync",
        )
        .eq("user_id", activeUserId)
        .maybeSingle(),
      supabaseClient
        .from("linked_users")
        .select("id, requester_id, target_id, status, created_at")
        .or(`requester_id.eq.${activeUserId},target_id.eq.${activeUserId}`),
      supabaseClient
        .from("invite_links")
        .select("id, inviter_id, token, created_at, used_at")
        .eq("inviter_id", activeUserId)
        .order("created_at", { ascending: false }),
    ]);

    if (settingsResult.error || linksResult.error || invitesResult.error) {
      return null;
    }

    const linkRows = ((linksResult.data ?? []) as LinkRow[]) ?? [];
    const partnerIds = Array.from(
      new Set(
        linkRows.map((link) =>
          link.requester_id === activeUserId ? link.target_id : link.requester_id,
        ),
      ),
    );
    const sharedLinkIds = linkRows.map((link) => link.id);

    const partnerProfilesPromise =
      partnerIds.length > 0
        ? supabaseClient
            .from("profiles")
            .select("id, email, full_name, avatar_text, avatar_image_url, bio, city")
            .in("id", partnerIds)
        : Promise.resolve({
            data: [] as ProfileRow[],
            error: null,
          });

    const ownSwipesPromise = supabaseClient
      .from("swipes")
      .select("user_id, movie_id, decision, created_at")
      .eq("user_id", activeUserId);

    const partnerAcceptedSwipesPromise =
      partnerIds.length > 0
        ? supabaseClient
            .from("swipes")
            .select("user_id, movie_id, decision, created_at")
            .in("user_id", partnerIds)
            .eq("decision", "accepted")
        : Promise.resolve({
            data: [] as SwipeRow[],
            error: null,
          });

    const sharedWatchPromise =
      sharedLinkIds.length > 0
        ? supabaseClient
            .from("shared_watchlist")
            .select("id, linked_user_id, movie_id, watched, updated_at")
            .in("linked_user_id", sharedLinkIds)
        : Promise.resolve({
            data: [] as SharedWatchRow[],
            error: null,
          });

    const [
      partnerProfilesResult,
      ownSwipesResult,
      partnerAcceptedSwipesResult,
      sharedWatchResult,
    ] =
      await Promise.all([
        partnerProfilesPromise,
        ownSwipesPromise,
        partnerAcceptedSwipesPromise,
        sharedWatchPromise,
      ]);

    if (
      partnerProfilesResult.error ||
      ownSwipesResult.error ||
      partnerAcceptedSwipesResult.error ||
      sharedWatchResult.error
    ) {
      return null;
    }

    const swipeRows = [
      ...((((ownSwipesResult.data ?? []) as SwipeRow[]) ?? [])),
      ...((((partnerAcceptedSwipesResult.data ?? []) as SwipeRow[]) ?? [])),
    ];
    const movieIds = Array.from(new Set(swipeRows.map((swipe) => swipe.movie_id)));
    const movieChunks = chunkItems(movieIds, 75);
    const movieResults = await Promise.all(
      movieChunks.map((ids) =>
        ids.length > 0
          ? supabaseClient
              .from("movies")
              .select(
                "id, title, release_year, runtime, rating, genres, description, poster_eyebrow, poster_image_url, accent_from, accent_to, trailer_url",
              )
              .in("id", ids)
          : Promise.resolve({
              data: [] as MovieRow[],
              error: null,
            }),
      ),
    );

    if (movieResults.some((result) => result.error)) {
      return null;
    }

    return {
      profile: (profileResult.data ?? null) as ProfileRow | null,
      settings: (settingsResult.data ?? null) as SettingsRow | null,
      links: linkRows,
      invites: ((invitesResult.data ?? []) as InviteRow[]) ?? [],
      partnerProfiles:
        ((partnerProfilesResult.data ?? []) as ProfileRow[]) ?? [],
      swipes: swipeRows,
      sharedWatch:
        ((sharedWatchResult.data ?? []) as SharedWatchRow[]) ?? [],
      movies: movieResults.flatMap(
        (result) => ((result.data ?? []) as MovieRow[]) ?? [],
      ),
    };
  }, []);

  const fetchAccountSyncFromToken = useCallback(async (
    accessToken: string,
    activeUserId: string,
  ): Promise<AccountSyncPayload | null> => {
    const tokenClient = createTokenBoundSupabaseClient(accessToken);

    if (!tokenClient) {
      return null;
    }

    return fetchAccountSyncFromBrowser(tokenClient, activeUserId);
  }, [fetchAccountSyncFromBrowser]);

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
  }, [isDarkMode]);

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

    void (async () => {
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
        return;
      }

      if (!sessionUser && storedSession?.userId) {
        setCurrentUserId(storedSession.userId);
        refreshDiscoverShuffle(storedSession.userId);
        setAccountRefreshKey((current) => current + 1);
        setPreferredDarkMode(
          getStoredUserTheme(storedSession.userId) ?? getGlobalStoredTheme(),
        );
        setIsReady(true);
        return;
      }

      if (!sessionUser) {
        setIsReady(true);
        return;
      }

      const fullName =
        (sessionUser.user_metadata.full_name as string | undefined) ??
        sessionUser.email?.split("@")[0] ??
        "CineMatch User";

      setData((current) =>
        ensureLocalUser(current, {
          id: sessionUser.id,
          name: fullName,
          email: sessionUser.email ?? "",
          avatarImageUrl:
            (sessionUser.user_metadata.avatar_image_url as string | undefined) ??
            undefined,
        }),
      );
      setCurrentUserId(sessionUser.id);
      refreshDiscoverShuffle(sessionUser.id);
      setAccountRefreshKey((current) => current + 1);
      setPreferredDarkMode(
        getStoredUserTheme(sessionUser.id) ??
          getGlobalStoredTheme(),
      );
      setIsReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const sessionUser = session?.user;

        if (!sessionUser) {
          const storedSession = getStoredAuthSession();

          if (storedSession?.userId) {
            setCurrentUserId(storedSession.userId);
            refreshDiscoverShuffle(storedSession.userId);
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

        const activeSessionUser = sessionUser;

        const fullName =
          (activeSessionUser.user_metadata.full_name as string | undefined) ??
          activeSessionUser.email?.split("@")[0] ??
          "CineMatch User";

        setData((current) =>
          ensureLocalUser(current, {
            id: activeSessionUser.id,
            name: fullName,
            email: activeSessionUser.email ?? "",
            avatarImageUrl:
              (activeSessionUser.user_metadata.avatar_image_url as string | undefined) ??
              undefined,
          }),
        );
        setCurrentUserId(activeSessionUser.id);
        refreshDiscoverShuffle(activeSessionUser.id);
        setAccountRefreshKey((current) => current + 1);
        setPreferredDarkMode(
          getStoredUserTheme(activeSessionUser.id) ??
            getGlobalStoredTheme(),
        );
        setIsReady(true);
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUserId) {
      return;
    }

    const channel = supabase
      .channel(`linked-users-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "linked_users",
        },
        (payload) => {
          const nextRow = payload.new as Partial<LinkRow> | null;
          const previousRow = payload.old as Partial<LinkRow> | null;
          const touchesCurrentUser =
            nextRow?.requester_id === currentUserId ||
            nextRow?.target_id === currentUserId ||
            previousRow?.requester_id === currentUserId ||
            previousRow?.target_id === currentUserId;

          if (touchesCurrentUser) {
            setAccountRefreshKey((current) => current + 1);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setAccountRefreshKey((current) => current + 1);
      }
    }, 7000);

    return () => {
      window.clearInterval(interval);
    };
  }, [currentUserId]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !currentUserId) {
      return;
    }

    const channel = supabase
      .channel(`invite-links-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invite_links",
        },
        (payload) => {
          const nextRow = payload.new as Partial<InviteRow> | null;
          const previousRow = payload.old as Partial<InviteRow> | null;
          const touchesCurrentUser =
            nextRow?.inviter_id === currentUserId ||
            previousRow?.inviter_id === currentUserId;

          if (touchesCurrentUser) {
            setAccountRefreshKey((current) => current + 1);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

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
      setIsSyncingAccountData(true);
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
        }
        return;
      }

      let payload = await fetchAccountSyncFromToken(accessToken, activeUserId);

      if (!payload) {
        payload = getStoredAccountSnapshot(activeUserId);
      }

      if (!payload) {
        payload = await fetchAccountSyncFromBrowser(supabaseClient, activeUserId);
      }

      if (!payload) {
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
      }

      if (!payload) {
        setIsSyncingAccountData(false);
        if (syncRetryCountRef.current < 5) {
          syncRetryCountRef.current += 1;
          window.setTimeout(() => {
            setAccountRefreshKey((current) => current + 1);
          }, 1200 + syncRetryCountRef.current * 300);
        }
        return;
      }

      if (!active) {
        return;
      }

      applyHydratedAccountPayload(activeUserId, payload);
      syncRetryCountRef.current = 0;
      setIsSyncingAccountData(false);
    }

    void loadSupabaseAppData().catch(() => {
      if (active) {
        setIsSyncingAccountData(false);
      }
    });

    return () => {
      active = false;
    };
  }, [
    accountRefreshKey,
    currentUserId,
    fetchAccountSyncFromBrowser,
    fetchAccountSyncFromToken,
  ]);

  const currentUser =
    currentUserId
      ? data.users.find((user) => user.id === currentUserId) ?? null
      : null;

  const acceptedIds = new Set(
    data.swipes
      .filter(
        (swipe) =>
          swipe.userId === currentUserId && swipe.decision === "accepted",
      )
      .map((swipe) => swipe.movieId),
  );

  const acceptedMovies = data.movies.filter((movie) => acceptedIds.has(movie.id));
  const acceptedGenreCounts = acceptedMovies.reduce<Map<string, number>>(
    (counts, movie) => {
      movie.genre.forEach((entry) => {
        const normalized = entry.trim();

        if (
          !normalized ||
          normalized === "Movie" ||
          normalized === "Series"
        ) {
          return;
        }

        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });

      return counts;
    },
    new Map<string, number>(),
  );

  const hiddenMovieIds = new Set(
    data.swipes
      .filter((swipe) => {
        if (swipe.userId !== currentUserId) {
          return false;
        }

        if (swipe.decision === "accepted") {
          return true;
        }

        if (swipe.decision !== "rejected") {
          return false;
        }

        const rejectedAt = new Date(swipe.createdAt).getTime();
        return (
          Number.isFinite(rejectedAt) &&
          discoverVisibilityTimestamp - rejectedAt < REJECT_HIDE_WINDOW_MS
        );
      })
      .map((swipe) => swipe.movieId),
  );

  const sortBySessionShuffle = (movies: Movie[]) =>
    [...movies].sort(
      (left, right) =>
        hashString(`${left.id}:${discoverShuffleSeed}`) -
        hashString(`${right.id}:${discoverShuffleSeed}`),
    );

  const sortDiscoverQueue = (movies: Movie[]) =>
    [...movies].sort((left, right) => {
      const leftGenreScore = left.genre.reduce(
        (score, entry) => score + (acceptedGenreCounts.get(entry) ?? 0),
        0,
      );
      const rightGenreScore = right.genre.reduce(
        (score, entry) => score + (acceptedGenreCounts.get(entry) ?? 0),
        0,
      );

      if (leftGenreScore !== rightGenreScore) {
        return rightGenreScore - leftGenreScore;
      }

      return (
        hashString(`${left.id}:${discoverShuffleSeed}`) -
        hashString(`${right.id}:${discoverShuffleSeed}`)
      );
    });

  const rotateDiscoverQueue = (movies: Movie[]) => {
    if (movies.length <= 1) {
      return movies;
    }

    const offset = discoverStartOffset % movies.length;

    if (offset === 0) {
      return movies;
    }

    return [...movies.slice(offset), ...movies.slice(0, offset)];
  };

  const discoverQueue = currentUserId
    ? rotateDiscoverQueue(
        sortDiscoverQueue(
          data.movies.filter(
            (movie) =>
              passesDiscoverQualityThreshold(movie) &&
              !hiddenMovieIds.has(movie.id),
          ),
        ),
      )
    : rotateDiscoverQueue(
        sortBySessionShuffle(
          data.movies.filter((movie) => passesDiscoverQualityThreshold(movie)),
        ),
      );

  const sharedMovies: SharedMovieView[] = currentUserId
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

          const partnerInfo: User = {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            avatar: partner.avatar,
            avatarImageUrl: partner.avatarImageUrl,
            bio: partner.bio,
            city: partner.city,
          };

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
            .filter(
              (movie) =>
                !data.sharedHiddenMovies.some(
                  (hidden) =>
                    hidden.pairKey === link.id && hidden.movieId === movie.id,
                ),
            )
            .map((movie) => {
              const savedState = data.sharedWatch.find(
                (item) =>
                  item.pairKey === link.id &&
                  item.movieId === movie.id,
              );

              return {
                linkId: link.id,
                partner: partnerInfo,
                movie,
                watched: savedState?.watched ?? false,
                progress: savedState?.progress ?? 0,
              };
            });
        })
    : [];

  const linkedUsers =
    currentUserId
      ? data.links
          .filter((link) => link.users.includes(currentUserId))
          .map((link) => {
            const partnerId = link.users.find((id) => id !== currentUserId);
            const partner = data.users.find((user) => user.id === partnerId);

            if (!partner) {
              return null;
            }

            const partnerInfo: User = {
              id: partner.id,
              name: partner.name,
              email: partner.email,
              avatar: partner.avatar,
              avatarImageUrl: partner.avatarImageUrl,
              bio: partner.bio,
              city: partner.city,
            };

            return {
              user: partnerInfo,
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
              status: "accepted" | "pending";
              sharedCount: number;
            } => Boolean(item),
          )
      : [];

  const sharedMovieGroups: SharedMovieGroup[] = linkedUsers
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
    });

  const ongoingMovies: SharedMovieView[] = [];
  const totalSwipes = currentUserId
    ? data.swipes.filter((swipe) => swipe.userId === currentUserId).length
    : 0;
  const watchedTogether = sharedMovies.filter((movie) => movie.watched).length;
  const activeLinks = linkedUsers.filter((user) => user.status === "accepted").length;
  const achievements: Achievement[] = useMemo(
    () => [
      {
        id: "first-pick",
        title: "First Pick",
        description: "Accept your first movie.",
        progress: Math.min(acceptedMovies.length, 1),
        target: 1,
      },
      {
        id: "movie-collector",
        title: "Movie Collector",
        description: "Save 10 movies to your picks.",
        progress: Math.min(acceptedMovies.length, 10),
        target: 10,
      },
      {
        id: "watch-party",
        title: "Watch Party",
        description: "Watch 5 shared movies together.",
        progress: Math.min(watchedTogether, 5),
        target: 5,
      },
      {
        id: "connected",
        title: "Connected Circle",
        description: "Link with 3 people.",
        progress: Math.min(activeLinks, 3),
        target: 3,
      },
      {
        id: "explorer",
        title: "Movie Explorer",
        description: "Swipe through 20 movies.",
        progress: Math.min(totalSwipes, 20),
        target: 20,
      },
    ],
    [acceptedMovies.length, watchedTogether, activeLinks, totalSwipes],
  );

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
  }, [achievements, currentUserId]);

  useEffect(() => {
    if (!unlockedAchievement) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setUnlockedAchievement(null);
    }, 4200);

    return () => window.clearTimeout(timeout);
  }, [unlockedAchievement]);

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

        setData((current) =>
          ensureLocalUser(current, {
            id: authUser.id,
            name: fullName,
            email: authUser.email ?? email,
            avatarImageUrl:
              (authUser.user_metadata?.avatar_image_url as string | undefined) ??
              undefined,
          }),
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
        user.password === password,
    );

    if (!match) {
      return {
        ok: false,
        message: "We couldn’t find a matching account. Try the demo login below.",
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
        ensureLocalUser(current, {
          id: authUser.id,
          name,
          email: authUser.email ?? email,
        }),
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

  const registerMovies = (movies: Movie[]) => {
    setData((current) => mergeMoviesIntoData(current, movies));
  };

  const swipeMovie = async (movieId: string, decision: SwipeDecision) => {
    if (!currentUserId) {
      return;
    }

    const movie = data.movies.find((entry) => entry.id === movieId);
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
          setAccountRefreshKey((current) => current + 1);
          return;
        }
      } catch {
        // Fall through to local optimistic storage so the app stays usable.
      }
    }

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
  };

  const linkUser = async (targetUserId: string) => {
    if (!currentUserId || currentUserId === targetUserId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      const existing = data.links.some(
        (link) =>
          link.users.includes(currentUserId) && link.users.includes(targetUserId),
      );

      if (existing) {
        return;
      }

      const createdAt = new Date().toISOString();
      const linkPayload = {
        requester_id: currentUserId,
        target_id: targetUserId,
        status: "accepted",
        created_at: createdAt,
        accepted_at: createdAt,
      };
      const { data: insertedLink, error } = await supabase
        .from("linked_users")
        .insert(linkPayload as never)
        .select("id, requester_id, target_id, status, created_at")
        .single();

      if (!error && insertedLink) {
        setData((current) => ({
          ...current,
          links: [...current.links, mapLinkRow(insertedLink as LinkRow)],
        }));
        setAccountRefreshKey((current) => current + 1);
        return;
      }
    }

    setData((current) => {
      const exists = current.links.some(
        (link) =>
          link.users.includes(currentUserId) && link.users.includes(targetUserId),
      );

      if (exists) {
        return current;
      }

      return {
        ...current,
        links: [
          ...current.links,
          {
            id: `link-${crypto.randomUUID()}`,
            users: [currentUserId, targetUserId],
            status: "accepted",
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });
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
    }));
  };

  const removeSharedMovie = async (partnerId: string, movieId: string) => {
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

  const createInviteLink = async (): Promise<InviteLinkResult> => {
    if (!currentUserId || typeof window === "undefined") {
      return { ok: false, message: "Log in first to create a connect link." };
    }

    const token = `invite-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      try {
        const sessionResult = await supabase.auth.getSession();
        const accessToken = sessionResult.data.session?.access_token;

        if (!accessToken) {
          return {
            ok: false,
            message: "Your login session is missing. Please sign in again.",
          };
        }

        const response = await fetch("/api/invite-links", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const payload = (await response.json()) as {
          error?: string;
          url?: string;
          invite?: InviteRow;
        };

        const insertedInvite = payload.invite;
        const inviteUrl = payload.url;

        if (response.ok && insertedInvite && inviteUrl) {
          setData((current) => ({
            ...current,
            invites: [
              ...current.invites.filter(
                (invite) => invite.inviterId !== currentUserId,
              ),
              mapInviteRow(insertedInvite),
            ],
          }));

          return {
            ok: true,
            url: inviteUrl,
          };
        }

        return {
          ok: false,
          message:
            payload.error ??
            "We couldn’t save this invite in the database yet.",
        };
      } catch (error) {
        return {
          ok: false,
          message:
            error instanceof Error &&
            error.message.toLowerCase().includes("failed to fetch")
              ? "The app couldn’t reach Supabase right now. Check your internet, Supabase project status, and browser/network blockers, then try again."
              : "We couldn’t reach the invite service right now.",
        };
      }
    }

    setData((current) => ({
      ...current,
      invites: [
        ...current.invites.filter(
          (invite) => !(invite.inviterId === currentUserId && invite.usedAt === null),
        ),
        {
          id: `invite-${crypto.randomUUID()}`,
          inviterId: currentUserId,
          token,
          createdAt,
          usedAt: null,
        },
      ],
    }));

    return {
      ok: true,
      url: `${window.location.origin}/linked?invite=${token}`,
    };
  };

  const acceptInviteToken = async (token: string) => {
    if (!currentUserId) {
      return { ok: false, message: "Log in first to use an invite link." };
    }

    const accessToken = await getCurrentAccessToken();

    if (accessToken) {
      try {
        const response = await fetch("/api/invite-links/accept", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const payload = (await response.json()) as {
          error?: string;
          link?: LinkRow;
          partnerProfile?: ProfileRow | null;
          invite?: InviteRow;
        };

        if (!response.ok || !payload.link) {
          return {
            ok: false,
            message: payload.error ?? "We couldn’t connect these accounts yet.",
          };
        }

        const acceptedLink = payload.link;
        const partnerProfile = payload.partnerProfile ?? null;
        const partnerName =
          partnerProfile?.full_name ??
          data.users.find((user) => user.id === acceptedLink.target_id)?.name ??
          "your match";

        setData((current) => ({
          ...ensureLocalUser(current, {
            id: partnerProfile?.id ?? acceptedLink.target_id,
            name: partnerName,
            email: partnerProfile?.email ?? "",
            avatar: partnerProfile?.avatar_text ?? getAvatarText(partnerName, ""),
            avatarImageUrl: partnerProfile?.avatar_image_url ?? undefined,
            bio: partnerProfile?.bio ?? "Connected on CineMatch.",
            city: partnerProfile?.city ?? "",
          }),
          links: [
            ...current.links.filter((link) => link.id !== acceptedLink.id),
            mapLinkRow(acceptedLink),
          ],
          invites: payload.invite
            ? current.invites.map((entry) =>
                entry.id === payload.invite?.id
                  ? mapInviteRow(payload.invite)
                  : entry,
              )
            : current.invites,
        }));
        setAccountRefreshKey((current) => current + 1);

        return {
          ok: true,
          message: "You’re connected now.",
          partnerName,
        };
      } catch {
        return {
          ok: false,
          message: "We couldn’t reach the connection service right now.",
        };
      }
    }

    const invite = data.invites.find((entry) => entry.token === token);

    if (!invite) {
      return { ok: false, message: "This invite link is invalid." };
    }

    if (invite.inviterId === currentUserId) {
      return { ok: false, message: "You can’t use your own invite link." };
    }

    const alreadyLinked = data.links.some(
      (link) =>
        link.users.includes(currentUserId) &&
        link.users.includes(invite.inviterId),
    );

    if (alreadyLinked) {
      return { ok: false, message: "You’re already connected with this person." };
    }

    setData((current) => ({
      ...current,
      links: [
        ...current.links,
        {
          id: `link-${crypto.randomUUID()}`,
          users: [currentUserId, invite.inviterId],
          status: "accepted",
          createdAt: new Date().toISOString(),
        },
      ],
      invites: current.invites.map((entry) =>
        entry.token === token
          ? {
              ...entry,
              usedAt: new Date().toISOString(),
            }
          : entry,
      ),
    }));

    return { ok: true, message: "You’re connected now." };
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
    await toggleWatched(partnerId, movieId, progress >= 100);
  };

  const updateProfile = async ({
    name,
    bio,
    city,
    avatarImageUrl,
  }: {
    name: string;
    bio: string;
    city: string;
    avatarImageUrl?: string;
  }) => {
    if (!currentUserId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      await supabase.auth.updateUser({
        data: {
          full_name: name,
          avatar_image_url: null,
        },
      });

      await supabase
        .from("profiles")
        .update({
          full_name: name,
          avatar_text: getAvatarText(name, currentUser?.email ?? ""),
          bio,
          city,
          avatar_image_url: avatarImageUrl ?? null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", currentUserId);
    }

    setData((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === currentUserId
          ? {
              ...user,
              name,
              avatar: getAvatarText(name, user.email),
              bio,
              city,
              avatarImageUrl,
            }
          : user,
      ),
    }));
    setAccountRefreshKey((current) => current + 1);
  };

  const updateSettings = async (payload: Partial<ProfileSettings>) => {
    if (!currentUserId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const nextSettings = {
      ...(data.settings[currentUserId] ?? defaultSettings),
      ...payload,
    };

    if (supabase && isSupabaseConfigured()) {
      const settingsPayload = {
        user_id: currentUserId,
        dark_mode: nextSettings.darkMode,
        notifications: nextSettings.notifications,
        autoplay_trailers: nextSettings.autoplayTrailers,
        hide_spoilers: nextSettings.hideSpoilers,
        cellular_sync: nextSettings.cellularSync,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("settings").upsert(
        settingsPayload as never,
        { onConflict: "user_id" },
      );
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        nextSettings.darkMode ? "dark" : "light",
      );
    }
    persistUserTheme(currentUserId, nextSettings.darkMode);
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
  };

  return (
    <AppStateContext.Provider
      value={{
        data,
        currentUserId,
        currentUser,
        isDarkMode,
        isReady,
        isSyncingAccountData,
        achievements,
        unlockedAchievement,
        dismissUnlockedAchievement: () => setUnlockedAchievement(null),
        login,
        signup,
        logout,
        registerMovies,
        swipeMovie,
        removePick,
        removeSharedMovie,
        linkUser,
        unlinkUser,
        createInviteLink,
        acceptInviteToken,
        toggleWatched,
        updateProgress,
        updateProfile,
        updateSettings,
        acceptedMovies,
        discoverQueue,
        discoverSessionKey: discoverShuffleSeed,
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
