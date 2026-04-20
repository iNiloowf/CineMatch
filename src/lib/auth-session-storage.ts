/**
 * Browser-local persisted Supabase session mirror (used when coordinating with `/api/auth/login`).
 * Extracted from `app-state.tsx` to shrink the provider module.
 */

export const AUTH_SESSION_STORAGE_KEY = "cinematch-auth-session";
export const AUTH_SESSION_TTL_MS = 10 * 24 * 60 * 60 * 1000;

export type StoredAuthSession = {
  userId: string;
  email?: string | null;
  accessToken: string;
  refreshToken: string;
  savedAt: number;
  expiresAt: number;
};

export function getStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;

    if (
      typeof parsed.userId !== "string" ||
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string"
    ) {
      clearStoredAuthSession();
      return null;
    }

    const savedAt = typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now();
    const expiresAt =
      typeof parsed.expiresAt === "number" ? parsed.expiresAt : savedAt + AUTH_SESSION_TTL_MS;

    if (expiresAt <= Date.now()) {
      clearStoredAuthSession();
      return null;
    }

    const normalizedSession: StoredAuthSession = {
      userId: parsed.userId,
      email: typeof parsed.email === "string" ? parsed.email : null,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      savedAt,
      expiresAt,
    };

    if (parsed.savedAt !== normalizedSession.savedAt || parsed.expiresAt !== normalizedSession.expiresAt) {
      persistStoredAuthSession(normalizedSession);
    }

    return normalizedSession;
  } catch {
    clearStoredAuthSession();
    return null;
  }
}

export function persistStoredAuthSession(
  session: Omit<StoredAuthSession, "savedAt" | "expiresAt"> &
    Partial<Pick<StoredAuthSession, "savedAt" | "expiresAt">>,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const savedAt = typeof session.savedAt === "number" ? session.savedAt : Date.now();
    const normalizedSession: StoredAuthSession = {
      ...session,
      savedAt,
      expiresAt:
        typeof session.expiresAt === "number" ? session.expiresAt : savedAt + AUTH_SESSION_TTL_MS,
    };
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
  } catch {
    // Ignore storage failures.
  }
}

export function clearStoredAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}
