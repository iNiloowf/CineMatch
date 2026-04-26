"use client";

import { processLock } from "@supabase/auth-js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AUTH_SUPABASE_KV_KEY,
  createSupabaseAuthStorageAdapter,
} from "@/lib/auth/auth-credential-kv";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type SupabaseDatabase = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

let browserClient: SupabaseClient<SupabaseDatabase> | null = null;

function clearLegacySupabaseCookies() {
  if (
    typeof document === "undefined" ||
    typeof window === "undefined" ||
    !supabaseUrl
  ) {
    return;
  }

  let projectRef = "";

  try {
    projectRef = new URL(supabaseUrl).hostname.split(".")[0] ?? "";
  } catch {
    projectRef = "";
  }

  if (!projectRef) {
    return;
  }

  const hostname = window.location.hostname;
  const hostParts = hostname.split(".");
  const rootDomain =
    hostParts.length >= 2 ? `.${hostParts.slice(-2).join(".")}` : "";
  const cookieNames = document.cookie
    .split(";")
    .map((entry) => entry.trim().split("=")[0])
    .filter((name) => name.startsWith(`sb-${projectRef}-`));

  for (const name of cookieNames) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${hostname}; SameSite=Lax`;

    if (rootDomain) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${rootDomain}; SameSite=Lax`;
    }
  }
}

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  if (!browserClient) {
    clearLegacySupabaseCookies();

    browserClient = createClient<SupabaseDatabase>(
      supabaseUrl,
      supabasePublishableKey,
      {
        auth: {
          /** iOS Keychain / Android Keystore in Capacitor; prefixed store on the web. */
          storage: createSupabaseAuthStorageAdapter(),
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
          storageKey: AUTH_SUPABASE_KV_KEY,
          /**
           * Use in-process locks instead of the Web Locks API (`navigator.locks`).
           * The default navigator lock can throw "stolen lock" errors when multiple
           * tabs or Strict Mode compete for the same lock name.
           */
          lock: processLock,
        },
      },
    );
  }

  return browserClient;
}
