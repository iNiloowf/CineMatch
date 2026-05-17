"use client";

import { invalidateAuthSession } from "@/lib/auth/session-expired";
import {
  ensureAuthSessionMirrorLoaded,
  getStoredAuthSession,
  persistStoredAuthSession,
  touchStoredAuthSessionExpiry,
} from "@/lib/auth-session-storage";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function isAuthSessionMissingMessage(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    normalized.includes("auth session missing") ||
    normalized.includes("session missing") ||
    normalized.includes("invalid refresh token") ||
    normalized.includes("refresh token not found")
  );
}

function matchesExpectedUser(userId: string | undefined, expectedUserId?: string) {
  return !expectedUserId || !userId || userId === expectedUserId;
}

function persistSessionFromSupabase(session: Session, email?: string | null) {
  persistStoredAuthSession({
    userId: session.user.id,
    email: session.user.email ?? email ?? null,
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
  });
  touchStoredAuthSessionExpiry();
}

function isFatalAuthRefreshError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    isAuthSessionMissingMessage(message) ||
    normalized.includes("invalid refresh token") ||
    normalized.includes("refresh token already used") ||
    normalized.includes("user not found")
  );
}

type RefreshAttempt = { ok: true } | { ok: false; fatal: boolean };

async function tryRefreshFromMirror(
  supabase: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
  stored: NonNullable<ReturnType<typeof getStoredAuthSession>>,
  expectedUserId?: string,
): Promise<RefreshAttempt> {
  if (!matchesExpectedUser(stored.userId, expectedUserId)) {
    return { ok: false, fatal: false };
  }

  const refreshed = await supabase.auth.refreshSession({
    refresh_token: stored.refreshToken,
  });

  if (!refreshed.error && refreshed.data.session) {
    persistSessionFromSupabase(refreshed.data.session, stored.email);
    return { ok: true };
  }

  const restored = await supabase.auth.setSession({
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
  });

  if (!restored.error && restored.data.session) {
    persistSessionFromSupabase(restored.data.session, stored.email);
    return { ok: true };
  }

  const refreshMessage = refreshed.error?.message ?? restored.error?.message;
  return {
    ok: false,
    fatal: isFatalAuthRefreshError(refreshMessage),
  };
}

function accessTokenExpiresWithinMs(session: Session, withinMs: number) {
  if (!session.expires_at) {
    return false;
  }
  return session.expires_at * 1000 - Date.now() <= withinMs;
}

/**
 * Background keep-alive: refresh before the JWT expires; never signs the user out on failure.
 */
export async function maintainSupabaseBrowserSession(
  expectedUserId?: string,
): Promise<void> {
  await ensureAuthSessionMirrorLoaded();

  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isSupabaseConfigured()) {
    return;
  }

  const session = (await supabase.auth.getSession()).data.session;
  if (session && matchesExpectedUser(session.user.id, expectedUserId)) {
    if (accessTokenExpiresWithinMs(session, 10 * 60 * 1000)) {
      const stored = getStoredAuthSession();
      if (stored) {
        await tryRefreshFromMirror(supabase, stored, expectedUserId);
      }
    }
    touchStoredAuthSessionExpiry();
    return;
  }

  const stored = getStoredAuthSession();
  if (stored) {
    await tryRefreshFromMirror(supabase, stored, expectedUserId);
  }
}

/**
 * Ensures the browser Supabase client has an active session before protected writes.
 * Signs the user out automatically when refresh is no longer possible.
 */
export async function ensureSupabaseBrowserSession(
  expectedUserId?: string,
  options?: { signOutOnFailure?: boolean },
): Promise<boolean> {
  const signOutOnFailure = options?.signOutOnFailure !== false;

  await ensureAuthSessionMirrorLoaded();

  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isSupabaseConfigured()) {
    return false;
  }

  const readSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  };

  let session = await readSession();
  if (session && matchesExpectedUser(session.user.id, expectedUserId)) {
    touchStoredAuthSessionExpiry();
    if (accessTokenExpiresWithinMs(session, 60 * 1000)) {
      const stored = getStoredAuthSession();
      if (stored) {
        const attempt = await tryRefreshFromMirror(supabase, stored, expectedUserId);
        if (attempt.ok) {
          return true;
        }
      }
    }
    return true;
  }

  const stored = getStoredAuthSession();
  let refreshWasFatal = false;

  if (stored?.accessToken && stored.refreshToken) {
    const attempt = await tryRefreshFromMirror(supabase, stored, expectedUserId);
    if (attempt.ok) {
      return true;
    }
    refreshWasFatal = attempt.fatal;
  }

  session = await readSession();
  if (session && matchesExpectedUser(session.user.id, expectedUserId)) {
    touchStoredAuthSessionExpiry();
    return true;
  }

  if (
    signOutOnFailure &&
    refreshWasFatal &&
    stored &&
    matchesExpectedUser(stored.userId, expectedUserId)
  ) {
    await invalidateAuthSession();
  }

  return false;
}
