"use client";

import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
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

const STORAGE_KEY = "cinematch-demo-state-v3";
const CURRENT_USER_KEY = "cinematch-current-user-v3";
const ACHIEVEMENT_STORAGE_PREFIX = "cinematch-achievements";

type AuthResult =
  | { ok: true; message?: string; shouldRedirect?: boolean }
  | {
      ok: false;
      message: string;
    };

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

type AppStateContextValue = {
  data: AppData;
  currentUserId: string | null;
  currentUser: User | null;
  isDarkMode: boolean;
  isReady: boolean;
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
  linkUser: (targetUserId: string) => Promise<void>;
  createInviteLink: () => Promise<string | null>;
  acceptInviteToken: (token: string) => Promise<{ ok: boolean; message: string }>;
  toggleWatched: (
    partnerId: string,
    movieId: string,
    watched: boolean,
  ) => Promise<void>;
  updateProgress: (partnerId: string, movieId: string, progress: number) => Promise<void>;
  updateProfile: (payload: {
    bio: string;
    city: string;
    avatarImageUrl?: string;
  }) => Promise<void>;
  updateSettings: (payload: Partial<ProfileSettings>) => Promise<void>;
  acceptedMovies: Movie[];
  discoverQueue: Movie[];
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
  const [isReady, setIsReady] = useState(() => !isSupabaseConfigured());
  const [unlockedAchievement, setUnlockedAchievement] =
    useState<Achievement | null>(null);
  const isDarkMode = currentUserId
    ? (data.settings[currentUserId]?.darkMode ?? false)
    : false;

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

      if (!sessionUser) {
        setCurrentUserId(null);
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
      setIsReady(true);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const sessionUser = session?.user;

        if (!sessionUser) {
          setCurrentUserId(null);
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
        setIsReady(true);
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

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

    const activeUserId = currentUserId;

    async function loadSupabaseAppData() {
      const profilePromise = supabase
        .from("profiles")
        .select("id, email, full_name, avatar_text, avatar_image_url, bio, city")
        .eq("id", activeUserId)
        .maybeSingle();
      const settingsPromise = supabase
        .from("settings")
        .select(
          "user_id, dark_mode, notifications, autoplay_trailers, hide_spoilers, cellular_sync",
        )
        .eq("user_id", activeUserId)
        .maybeSingle();
      const linksPromise = supabase
        .from("linked_users")
        .select("id, requester_id, target_id, status, created_at")
        .or(`requester_id.eq.${activeUserId},target_id.eq.${activeUserId}`);
      const invitesPromise = supabase
        .from("invite_links")
        .select("id, inviter_id, token, created_at, used_at")
        .eq("inviter_id", activeUserId)
        .order("created_at", { ascending: false });

      const [profileResult, settingsResult, linksResult, invitesResult] =
        await Promise.all([
          profilePromise,
          settingsPromise,
          linksPromise,
          invitesPromise,
        ]);

      if (!active) {
        return;
      }

      const linkRows = (linksResult.data ?? []) as LinkRow[];
      const partnerIds = Array.from(
        new Set(
          linkRows.map((link) =>
            link.requester_id === activeUserId ? link.target_id : link.requester_id,
          ),
        ),
      );
      const sharedLinkIds = linkRows.map((link) => link.id);
      const acceptedUserIds = Array.from(
        new Set([activeUserId, ...partnerIds]),
      );

      const [partnerProfilesResult, sharedWatchResult, partnerSwipesResult] =
        await Promise.all([
          partnerIds.length > 0
            ? supabase
                .from("profiles")
                .select("id, email, full_name, avatar_text, avatar_image_url, bio, city")
                .in("id", partnerIds)
            : Promise.resolve({ data: [] as ProfileRow[] }),
          sharedLinkIds.length > 0
            ? supabase
                .from("shared_watchlist")
                .select("id, linked_user_id, movie_id, watched, updated_at")
                .in("linked_user_id", sharedLinkIds)
            : Promise.resolve({ data: [] as SharedWatchRow[] }),
          acceptedUserIds.length > 0
            ? supabase
                .from("swipes")
                .select("user_id, movie_id, decision, created_at")
                .in("user_id", acceptedUserIds)
            : Promise.resolve({ data: [] as SwipeRow[] }),
        ]);

      if (!active) {
        return;
      }

      setData((current) => {
        let next = current;

        const ownProfile = profileResult.data as ProfileRow | null;
        const allProfiles = [
          ...(ownProfile ? [ownProfile] : []),
          ...(((partnerProfilesResult as { data: ProfileRow[] }).data ?? []) as ProfileRow[]),
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

        const ownSettings = settingsResult.data as SettingsRow | null;
        const currentSwipes = [
          ...next.swipes.filter((swipe) => !acceptedUserIds.includes(swipe.userId)),
          ...((partnerSwipesResult as { data: SwipeRow[] }).data ?? []).map(mapSwipeRow),
        ];
        const currentLinks = [
          ...next.links.filter((link) => !link.users.includes(activeUserId)),
          ...linkRows.map(mapLinkRow),
        ];
        const currentInvites = [
          ...next.invites.filter((invite) => invite.inviterId !== activeUserId),
          ...((invitesResult.data ?? []) as InviteRow[]).map(mapInviteRow),
        ];
        const currentSharedWatch = [
          ...next.sharedWatch.filter(
            (item) => !sharedLinkIds.includes(item.pairKey),
          ),
          ...(((sharedWatchResult as { data: SharedWatchRow[] }).data ?? []) as SharedWatchRow[]).map(
            (item) => ({
              id: item.id,
              pairKey: item.linked_user_id,
              movieId: item.movie_id,
              watched: item.watched,
              progress: item.watched ? 100 : 0,
              updatedAt: item.updated_at,
            }),
          ),
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
    }

    void loadSupabaseAppData();

    return () => {
      active = false;
    };
  }, [currentUserId]);

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

  const seenMovieIds = new Set(
    data.swipes
      .filter((swipe) => swipe.userId === currentUserId)
      .map((swipe) => swipe.movieId),
  );

  const discoverQueue = currentUserId
    ? data.movies.filter((movie) => !seenMovieIds.has(movie.id))
    : data.movies;

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

  const sharedMovieGroups: SharedMovieGroup[] = sharedMovies.reduce(
    (groups, entry) => {
      const existingGroup = groups.find(
        (group) => group.partner.id === entry.partner.id,
      );

      if (existingGroup) {
        existingGroup.movies.push(entry);
        return groups;
      }

      groups.push({
        linkId: entry.linkId,
        partner: entry.partner,
        movies: [entry],
      });

      return groups;
    },
    [] as SharedMovieGroup[],
  );

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
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !authData.user) {
        return {
          ok: false,
          message:
            error?.message ??
            "We couldn’t sign you in. Double-check your email and password.",
        };
      }

      const fullName =
        (authData.user.user_metadata.full_name as string | undefined) ??
        authData.user.email?.split("@")[0] ??
        "CineMatch User";

      setData((current) =>
        ensureLocalUser(current, {
          id: authData.user.id,
          name: fullName,
          email: authData.user.email ?? email,
          avatarImageUrl:
            (authData.user.user_metadata.avatar_image_url as string | undefined) ??
            undefined,
        }),
      );
      setCurrentUserId(authData.user.id);

      return { ok: true, shouldRedirect: true };
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

      setData((current) =>
        ensureLocalUser(current, {
          id: authData.user.id,
          name,
          email: authData.user.email ?? email,
        }),
      );

      if (authData.session) {
        setCurrentUserId(authData.user.id);
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

    return { ok: true, shouldRedirect: true };
  };

  const logout = async () => {
    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }

    setCurrentUserId(null);
  };

  const registerMovies = (movies: Movie[]) => {
    setData((current) => mergeMoviesIntoData(current, movies));
  };

  const persistMovie = async (movieId: string) => {
    const supabase = getSupabaseBrowserClient();
    const movie = data.movies.find((entry) => entry.id === movieId);

    if (!supabase || !isSupabaseConfigured() || !movie) {
      return;
    }

    await supabase.from("movies").upsert(
      {
        id: movie.id,
        title: movie.title,
        release_year: movie.year,
        runtime: movie.runtime,
        rating: movie.rating,
        genres: movie.genre,
        description: movie.description,
        poster_eyebrow: movie.poster.eyebrow,
        poster_image_url: movie.poster.imageUrl ?? null,
        accent_from: movie.poster.accentFrom,
        accent_to: movie.poster.accentTo,
        trailer_url: null,
      },
      { onConflict: "id" },
    );
  };

  const swipeMovie = async (movieId: string, decision: SwipeDecision) => {
    if (!currentUserId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      await persistMovie(movieId);

      const createdAt = new Date().toISOString();
      const { error } = await supabase.from("swipes").upsert(
        {
          user_id: currentUserId,
          movie_id: movieId,
          decision,
          created_at: createdAt,
        },
        { onConflict: "user_id,movie_id" },
      );

      if (!error) {
        setData((current) => ({
          ...current,
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
        return;
      }
    }

    setData((current) => {
      const alreadyExists = current.swipes.some(
        (swipe) => swipe.userId === currentUserId && swipe.movieId === movieId,
      );

      if (alreadyExists) {
        return current;
      }

      return {
        ...current,
        swipes: [
          ...current.swipes,
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
      const { data: insertedLink, error } = await supabase
        .from("linked_users")
        .insert({
          requester_id: currentUserId,
          target_id: targetUserId,
          status: "accepted",
          created_at: createdAt,
          accepted_at: createdAt,
        })
        .select("id, requester_id, target_id, status, created_at")
        .single();

      if (!error && insertedLink) {
        setData((current) => ({
          ...current,
          links: [...current.links, mapLinkRow(insertedLink as LinkRow)],
        }));
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

  const removePick = async (movieId: string) => {
    if (!currentUserId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      await supabase
        .from("swipes")
        .delete()
        .eq("user_id", currentUserId)
        .eq("movie_id", movieId)
        .eq("decision", "accepted");
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

  const createInviteLink = async () => {
    if (!currentUserId || typeof window === "undefined") {
      return null;
    }

    const token = `invite-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      const { data: insertedInvite, error } = await supabase
        .from("invite_links")
        .insert({
          inviter_id: currentUserId,
          token,
          created_at: createdAt,
          used_at: null,
        })
        .select("id, inviter_id, token, created_at, used_at")
        .single();

      if (!error && insertedInvite) {
        setData((current) => ({
          ...current,
          invites: [
            ...current.invites.filter((invite) => invite.inviterId !== currentUserId),
            mapInviteRow(insertedInvite as InviteRow),
          ],
        }));

        return `${window.location.origin}/linked?invite=${token}`;
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

    return `${window.location.origin}/linked?invite=${token}`;
  };

  const acceptInviteToken = async (token: string) => {
    if (!currentUserId) {
      return { ok: false, message: "Log in first to use an invite link." };
    }

    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      const inviteResult = await supabase
        .from("invite_links")
        .select("id, inviter_id, token, created_at, used_at")
        .eq("token", token)
        .maybeSingle();
      const invite = inviteResult.data as InviteRow | null;

      if (!invite) {
        return { ok: false, message: "This invite link is invalid." };
      }

      if (invite.inviter_id === currentUserId) {
        return { ok: false, message: "You can’t use your own invite link." };
      }

      if (invite.used_at) {
        return { ok: false, message: "This invite link has already been used." };
      }

      const existingLinkResult = await supabase
        .from("linked_users")
        .select("id")
        .or(
          `and(requester_id.eq.${currentUserId},target_id.eq.${invite.inviter_id}),and(requester_id.eq.${invite.inviter_id},target_id.eq.${currentUserId})`,
        )
        .maybeSingle();

      if (existingLinkResult.data) {
        return {
          ok: false,
          message: "You’re already connected with this person.",
        };
      }

      const createdAt = new Date().toISOString();
      const insertResult = await supabase
        .from("linked_users")
        .insert({
          requester_id: currentUserId,
          target_id: invite.inviter_id,
          status: "accepted",
          created_at: createdAt,
          accepted_at: createdAt,
        })
        .select("id, requester_id, target_id, status, created_at")
        .single();

      if (insertResult.error || !insertResult.data) {
        return { ok: false, message: "We couldn’t connect these accounts yet." };
      }

      await supabase
        .from("invite_links")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invite.id);

      setData((current) => ({
        ...current,
        links: [...current.links, mapLinkRow(insertResult.data as LinkRow)],
        invites: current.invites.map((entry) =>
          entry.id === invite.id
            ? {
                ...entry,
                usedAt: new Date().toISOString(),
              }
            : entry,
        ),
      }));

      return { ok: true, message: "You’re connected now." };
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

    if (supabase && isSupabaseConfigured()) {
      await persistMovie(movieId);
      await supabase.from("shared_watchlist").upsert(
        {
          linked_user_id: pairKey,
          movie_id: movieId,
          watched,
          updated_at: new Date().toISOString(),
        },
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
    bio,
    city,
    avatarImageUrl,
  }: {
    bio: string;
    city: string;
    avatarImageUrl?: string;
  }) => {
    if (!currentUserId) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (supabase && isSupabaseConfigured()) {
      await supabase
        .from("profiles")
        .update({
          bio,
          city,
          avatar_image_url: avatarImageUrl ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUserId);
    }

    setData((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === currentUserId
          ? { ...user, bio, city, avatarImageUrl }
          : user,
      ),
    }));
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
      await supabase.from("settings").upsert(
        {
          user_id: currentUserId,
          dark_mode: nextSettings.darkMode,
          notifications: nextSettings.notifications,
          autoplay_trailers: nextSettings.autoplayTrailers,
          hide_spoilers: nextSettings.hideSpoilers,
          cellular_sync: nextSettings.cellularSync,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }

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
        achievements,
        unlockedAchievement,
        dismissUnlockedAchievement: () => setUnlockedAchievement(null),
        login,
        signup,
        logout,
        registerMovies,
        swipeMovie,
        removePick,
        linkUser,
        createInviteLink,
        acceptInviteToken,
        toggleWatched,
        updateProgress,
        updateProfile,
        updateSettings,
        acceptedMovies,
        discoverQueue,
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
