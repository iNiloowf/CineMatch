"use client";

import { clearStoredAuthSession } from "@/lib/auth-session-storage";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AuthSessionExpiredHandler = () => void | Promise<void>;

let handler: AuthSessionExpiredHandler | null = null;
let invalidating = false;

/**
 * App shell registers this (e.g. `AppStateProvider`) to clear React auth state and redirect.
 */
export function registerAuthSessionExpiredHandler(
  next: AuthSessionExpiredHandler,
): () => void {
  handler = next;
  return () => {
    if (handler === next) {
      handler = null;
    }
  };
}

async function clearSupabaseAuthStorage(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (supabase && isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Still clear local mirror below.
    }
  }
  clearStoredAuthSession();
}

/**
 * Clears stored credentials and signs the user out of the app when refresh is no longer possible.
 */
export async function invalidateAuthSession(): Promise<void> {
  if (invalidating) {
    return;
  }
  invalidating = true;
  try {
    await clearSupabaseAuthStorage();
    await handler?.();
  } finally {
    invalidating = false;
  }
}
