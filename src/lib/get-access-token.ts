import { getStoredAuthSession } from "@/lib/auth-session-storage";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Resolves a Supabase access token for authenticated API calls from the client.
 * Mirrors the logic in app-state.
 */
export async function getClientAccessToken(): Promise<string | null> {
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
