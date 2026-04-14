"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const AUTH_STORAGE_KEY = "cinematch-supabase-auth";

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
  if (typeof document === "undefined" || !supabaseUrl) {
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

  const cookieNames = document.cookie
    .split(";")
    .map((entry) => entry.trim().split("=")[0])
    .filter((name) => name.startsWith(`sb-${projectRef}-`));

  for (const name of cookieNames) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
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
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey: AUTH_STORAGE_KEY,
      },
      },
    );
  }

  return browserClient;
}
