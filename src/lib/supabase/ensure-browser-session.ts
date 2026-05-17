"use client";

import {
  ensureAuthSessionMirrorLoaded,
  getStoredAuthSession,
  persistStoredAuthSession,
} from "@/lib/auth-session-storage";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

export function isAuthSessionMissingMessage(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    normalized.includes("auth session missing") ||
    normalized.includes("session missing")
  );
}

/**
 * Ensures the browser Supabase client has an active session. The app can keep
 * `currentUserId` from the token mirror while goTrue has no in-memory session
 * (cold start / storage split). Restores from the mirror before auth/RLS calls.
 */
export async function ensureSupabaseBrowserSession(
  expectedUserId?: string,
): Promise<boolean> {
  await ensureAuthSessionMirrorLoaded();

  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isSupabaseConfigured()) {
    return false;
  }

  const matchesExpected = (userId: string | undefined) =>
    !expectedUserId || !userId || userId === expectedUserId;

  const readSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  };

  let session = await readSession();
  if (session && matchesExpected(session.user.id)) {
    return true;
  }

  const stored = getStoredAuthSession();
  if (
    stored &&
    matchesExpected(stored.userId) &&
    stored.accessToken &&
    stored.refreshToken
  ) {
    const restored = await supabase.auth.setSession({
      access_token: stored.accessToken,
      refresh_token: stored.refreshToken,
    });

    if (!restored.error && restored.data.session) {
      persistStoredAuthSession({
        userId: restored.data.session.user.id,
        email: restored.data.session.user.email ?? stored.email ?? null,
        accessToken: restored.data.session.access_token,
        refreshToken: restored.data.session.refresh_token,
      });
      return true;
    }

    const refreshed = await supabase.auth.refreshSession({
      refresh_token: stored.refreshToken,
    });

    if (!refreshed.error && refreshed.data.session) {
      persistStoredAuthSession({
        userId: refreshed.data.session.user.id,
        email: refreshed.data.session.user.email ?? stored.email ?? null,
        accessToken: refreshed.data.session.access_token,
        refreshToken: refreshed.data.session.refresh_token,
      });
      return true;
    }
  }

  session = await readSession();
  return Boolean(session && matchesExpected(session.user.id));
}
