import { SecureStorage } from "@aparajita/capacitor-secure-storage";

/**
 * Central key/value for sensitive auth data. On iOS/Android (Capacitor), values are stored in
 * Keychain / the Android Keystore via Aparajita. On the web, the same plugin uses prefixed
 * localStorage. Plain `cinematch-*` keys from older builds are migrated once.
 */
const LOG_PREFIX = "[cinematch-auth-storage]";

let keyPrefixSet = false;
let legacyMigrationDone = false;
let legacyMigrationPromise: Promise<void> | null = null;

async function ensureKeyPrefix() {
  if (keyPrefixSet) {
    return;
  }
  keyPrefixSet = true;
  await SecureStorage.setKeyPrefix("cinematch_auth_");
}

/** goTrue `storageKey` and filesystem key. */
export const AUTH_SUPABASE_KV_KEY = "cinematch-supabase-auth";
/** App mirror of tokens (for `/api/auth/login` handoff) — was `cinematch-auth-session` in localStorage. */
export const AUTH_MIRROR_KV_KEY = "cinematch-auth-session";

const LEGACY_LOCAL_KEYS: Array<{ logical: string; legacy: string }> = [
  { logical: AUTH_SUPABASE_KV_KEY, legacy: "cinematch-supabase-auth" },
  { logical: AUTH_MIRROR_KV_KEY, legacy: "cinematch-auth-session" },
];

function migratePlainLocalStorageToSecure(): Promise<void> {
  if (legacyMigrationDone || typeof window === "undefined" || !window.localStorage) {
    return Promise.resolve();
  }
  if (legacyMigrationPromise) {
    return legacyMigrationPromise;
  }
  legacyMigrationPromise = (async () => {
    await ensureKeyPrefix();
    for (const { logical, legacy } of LEGACY_LOCAL_KEYS) {
      try {
        const raw = window.localStorage.getItem(legacy);
        if (raw === null) {
          continue;
        }
        const existing = await SecureStorage.getItem(logical);
        if (existing === null) {
          await SecureStorage.setItem(logical, raw);
        }
        window.localStorage.removeItem(legacy);
      } catch (e) {
        console.warn(`${LOG_PREFIX} legacy key "${legacy}":`, e);
      }
    }
    legacyMigrationDone = true;
  })();
  return legacyMigrationPromise;
}

/**
 * goTrue and our app mirror use the same async string interface as Supabase `auth.storage`.
 */
export function createSupabaseAuthStorageAdapter() {
  return {
    getItem: (key: string) => getAuthItem(key),
    setItem: (key: string, value: string) => setAuthItem(key, value),
    removeItem: (key: string) => removeAuthItem(key),
  };
}

export async function getAuthItem(key: string): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    await migratePlainLocalStorageToSecure();
    await ensureKeyPrefix();
    return await SecureStorage.getItem(key);
  } catch (e) {
    console.error(`${LOG_PREFIX} getItem(${key}):`, e);
    return null;
  }
}

export async function setAuthItem(key: string, value: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  try {
    await ensureKeyPrefix();
    await SecureStorage.setItem(key, value);
  } catch (e) {
    console.error(`${LOG_PREFIX} setItem(${key}):`, e);
    throw e;
  }
}

export async function removeAuthItem(key: string): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  try {
    await ensureKeyPrefix();
    await SecureStorage.removeItem(key);
  } catch (e) {
    console.error(`${LOG_PREFIX} removeItem(${key}):`, e);
  }
}
