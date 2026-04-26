import { defaultSettings, initialAppData } from "@/lib/mock-data";
import { AppData, ProfileSettings } from "@/lib/types";
import { verifyServerOfflineDemoPassword } from "@/server/offline-demo-password";
import { fetchTmdbMediaPool, isTmdbConfigured } from "@/server/tmdb";

// This module acts like a tiny in-memory database for local development.
// Route handlers can mutate it while the dev server is running.
const database: AppData = JSON.parse(JSON.stringify(initialAppData)) as AppData;

function clone<T>(value: T) {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pairKey(userA: string, userB: string) {
  return [userA, userB].sort().join("::");
}

function uniquePublicHandleFromEmail(email: string): string {
  const rawLocal = (email.split("@")[0] ?? "user")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "") || "user";
  const base = rawLocal.slice(0, 22);
  let handle = base;
  let n = 0;
  while (
    database.users.some((entry) => entry.publicHandle.toLowerCase() === handle.toLowerCase())
  ) {
    n += 1;
    handle = `${base.slice(0, 16)}_${n}`;
  }
  return handle.toLowerCase();
}

export function getDatabase() {
  return clone(database);
}

export async function getMergedMovies() {
  if (!isTmdbConfigured()) {
    return clone(database.movies);
  }

  try {
    const tmdbMovies = await fetchTmdbMediaPool(5, 10);
    const seenIds = new Set(database.movies.map((movie) => movie.id));

    return clone([
      ...database.movies,
      ...tmdbMovies.filter((movie) => !seenIds.has(movie.id)),
    ]);
  } catch {
    return clone(database.movies);
  }
}

export function loginUser(email: string, password: string) {
  const user = database.users.find(
    (entry) => entry.email.toLowerCase() === email.toLowerCase(),
  );

  if (!user || !verifyServerOfflineDemoPassword(user, password)) {
    return null;
  }

  const safeUser = { ...user };
  Reflect.deleteProperty(safeUser, "password");
  return safeUser;
}

export function signupUser(payload: {
  name: string;
  email: string;
  password: string;
}) {
  const exists = database.users.some(
    (entry) => entry.email.toLowerCase() === payload.email.toLowerCase(),
  );

  if (exists) {
    return { error: "Email already exists." };
  }

  const user = {
    id: `user-${crypto.randomUUID()}`,
    publicHandle: uniquePublicHandleFromEmail(payload.email),
    name: payload.name,
    email: payload.email,
    password: payload.password,
    avatar: payload.name
      .split(" ")
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2),
    bio: "New to CineMatch and building a shared watchlist.",
    city: "Set your city",
  };

  database.users.push(user);
  database.settings[user.id] = { ...defaultSettings };

  const safeUser = { ...user };
  Reflect.deleteProperty(safeUser, "password");
  return { user: safeUser };
}

export function saveSwipe(
  userId: string,
  movieId: string,
  decision: "accepted" | "rejected",
) {
  const existing = database.swipes.find(
    (entry) => entry.userId === userId && entry.movieId === movieId,
  );

  if (existing) {
    existing.decision = decision;
    existing.createdAt = new Date().toISOString();
    return clone(existing);
  }

  const swipe = {
    userId,
    movieId,
    decision,
    createdAt: new Date().toISOString(),
  };
  database.swipes.push(swipe);
  return clone(swipe);
}

export function linkUsers(userId: string, targetUserId: string) {
  const existing = database.links.find(
    (entry) => entry.users.includes(userId) && entry.users.includes(targetUserId),
  );

  if (existing) {
    return clone(existing);
  }

  const link = {
    id: `link-${crypto.randomUUID()}`,
    users: [userId, targetUserId] as [string, string],
    requesterId: userId,
    status: "accepted" as const,
    createdAt: new Date().toISOString(),
  };

  database.links.push(link);
  return clone(link);
}

export function getSharedWatchlist(userId: string) {
  const acceptedByUser = new Set(
    database.swipes
      .filter((entry) => entry.userId === userId && entry.decision === "accepted")
      .map((entry) => entry.movieId),
  );

  return database.links
    .filter((entry) => entry.status === "accepted" && entry.users.includes(userId))
    .flatMap((link) => {
      const partnerId = link.users.find((entry) => entry !== userId);

      if (!partnerId) {
        return [];
      }

      const partner = database.users.find((entry) => entry.id === partnerId);

      if (!partner) {
        return [];
      }

      const partnerAccepted = new Set(
        database.swipes
          .filter(
            (entry) =>
              entry.userId === partnerId && entry.decision === "accepted",
          )
          .map((entry) => entry.movieId),
      );

      return Array.from(acceptedByUser)
        .filter((movieId) => partnerAccepted.has(movieId))
        .map((movieId) => {
          const movie = database.movies.find((entry) => entry.id === movieId);
          const shared = database.sharedWatch.find(
            (entry) =>
              entry.pairKey === pairKey(userId, partnerId) &&
              entry.movieId === movieId,
          );

          if (!movie) {
            return null;
          }

          return {
            linkId: link.id,
            partner: {
              id: partner.id,
              name: partner.name,
              avatar: partner.avatar,
            },
            movie,
            watched: shared?.watched ?? false,
            progress: shared?.progress ?? 0,
          };
        })
        .filter(
          (
            entry,
          ): entry is {
            linkId: string;
            partner: {
              id: string;
              name: string;
              avatar: string;
            };
            movie: AppData["movies"][number];
            watched: boolean;
            progress: number;
          } => Boolean(entry),
        );
    });
}

export function updateSharedWatch(payload: {
  userId: string;
  partnerId: string;
  movieId: string;
  watched?: boolean;
  progress?: number;
}) {
  const key = pairKey(payload.userId, payload.partnerId);
  const existing = database.sharedWatch.find(
    (entry) => entry.pairKey === key && entry.movieId === payload.movieId,
  );

  if (existing) {
    if (typeof payload.watched === "boolean") {
      existing.watched = payload.watched;
    }

    if (typeof payload.progress === "number") {
      existing.progress = Math.max(0, Math.min(payload.progress, 100));
    }

    if (existing.progress === 100) {
      existing.watched = true;
    }

    existing.updatedAt = new Date().toISOString();
    return clone(existing);
  }

  const created = {
    id: `shared-${crypto.randomUUID()}`,
    pairKey: key,
    movieId: payload.movieId,
    watched: payload.watched ?? false,
    progress: Math.max(0, Math.min(payload.progress ?? 0, 100)),
    updatedAt: new Date().toISOString(),
  };

  if (created.progress === 100) {
    created.watched = true;
  }

  database.sharedWatch.push(created);
  return clone(created);
}

export function updateProfile(
  userId: string,
  payload: { bio?: string; city?: string },
) {
  const user = database.users.find((entry) => entry.id === userId);

  if (!user) {
    return null;
  }

  if (typeof payload.bio === "string") {
    user.bio = payload.bio;
  }

  if (typeof payload.city === "string") {
    user.city = payload.city;
  }

  const safeUser = { ...user };
  Reflect.deleteProperty(safeUser, "password");
  return safeUser;
}

export function updateSettings(userId: string, payload: Partial<ProfileSettings>) {
  const current = database.settings[userId];

  if (!current) {
    return null;
  }

  database.settings[userId] = {
    ...current,
    ...payload,
  };

  return clone(database.settings[userId]);
}
