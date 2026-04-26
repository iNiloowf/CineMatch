/**
 * Client-side mirror of Supabase session tokens (used with `/api/auth/login` and account sync).
 * Backed by {@link ensureAuthSessionMirrorLoaded} from secure storage; see `auth-credential-kv`.
 */

import {
  AUTH_MIRROR_KV_KEY,
  getAuthItem,
  removeAuthItem,
  setAuthItem,
} from "@/lib/auth/auth-credential-kv";

export const AUTH_SESSION_STORAGE_KEY = AUTH_MIRROR_KV_KEY;
export const AUTH_SESSION_TTL_MS = 10 * 24 * 60 * 60 * 1000;

export type StoredAuthSession = {
  userId: string;
  email?: string | null;
  accessToken: string;
  refreshToken: string;
  savedAt: number;
  expiresAt: number;
};

let sessionMirror: StoredAuthSession | null = null;
let mirrorLoaded = false;
let mirrorLoadPromise: Promise<void> | null = null;

function normalizeSessionFromStorage(
  parsed: Partial<StoredAuthSession>,
): StoredAuthSession | null {
  if (
    typeof parsed.userId !== "string" ||
    typeof parsed.accessToken !== "string" ||
    typeof parsed.refreshToken !== "string"
  ) {
    return null;
  }

  const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now();
  const expiresAt =
    typeof parsed.expiresAt === "number" ? parsed.expiresAt : savedAt + AUTH_SESSION_TTL_MS;

  if (expiresAt <= Date.now()) {
    return null;
  }

  return {
    userId: parsed.userId,
    email: typeof parsed.email === "string" ? parsed.email : null,
    accessToken: parsed.accessToken,
    refreshToken: parsed.refreshToken,
    savedAt,
    expiresAt,
  };
}

/**
 * Loads the session mirror from secure storage once. Safe to call multiple times; must run before
 * relying on {@link getStoredAuthSession} for native cold start.
 */
export function ensureAuthSessionMirrorLoaded(): Promise<void> {
  if (typeof window === "undefined" || mirrorLoaded) {
    return Promise.resolve();
  }
  if (mirrorLoadPromise) {
    return mirrorLoadPromise;
  }
  mirrorLoadPromise = (async () => {
    const raw = await getAuthItem(AUTH_MIRROR_KV_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
        const normalized = normalizeSessionFromStorage(parsed);
        if (normalized) {
          if (
            parsed.savedAt !== normalized.savedAt ||
            parsed.expiresAt !== normalized.expiresAt
          ) {
            void setAuthItem(AUTH_MIRROR_KV_KEY, JSON.stringify(normalized));
          }
          sessionMirror = normalized;
        } else {
          await removeAuthItem(AUTH_MIRROR_KV_KEY);
          sessionMirror = null;
        }
      } catch {
        await removeAuthItem(AUTH_MIRROR_KV_KEY);
        sessionMirror = null;
      }
    } else {
      sessionMirror = null;
    }
    mirrorLoaded = true;
  })();
  return mirrorLoadPromise;
}

/**
 * Synchronous read of the in-memory mirror. Call {@link ensureAuthSessionMirrorLoaded} in the
 * current async path first so cold start has data.
 */
export function getStoredAuthSession(): StoredAuthSession | null {
  return sessionMirror;
}

export function persistStoredAuthSession(
  session: Omit<StoredAuthSession, "savedAt" | "expiresAt"> &
    Partial<Pick<StoredAuthSession, "savedAt" | "expiresAt">>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const savedAt = typeof session.savedAt === "number" ? session.savedAt : Date.now();
  const normalizedSession: StoredAuthSession = {
    ...session,
    savedAt,
    expiresAt:
      typeof session.expiresAt === "number" ? session.expiresAt : savedAt + AUTH_SESSION_TTL_MS,
  };
  sessionMirror = normalizedSession;
  mirrorLoaded = true;
  void setAuthItem(AUTH_MIRROR_KV_KEY, JSON.stringify(normalizedSession));
}

export function clearStoredAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionMirror = null;
  mirrorLoaded = true;
  void removeAuthItem(AUTH_MIRROR_KV_KEY);
}
