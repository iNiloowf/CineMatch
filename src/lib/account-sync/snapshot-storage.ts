import { sanitizeAccountSyncPayloadForClient } from "@/lib/account-sync/sanitize-payload";
import type { AccountSyncPayload } from "@/lib/account-sync/types";

const ACCOUNT_CACHE_STORAGE_PREFIX = "cinematch-account-cache";

export function getAccountCacheKey(userId: string) {
  return `${ACCOUNT_CACHE_STORAGE_PREFIX}-${userId}`;
}

export function getStoredAccountSnapshot(userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getAccountCacheKey(userId));
    if (!raw) {
      return null;
    }
    return sanitizeAccountSyncPayloadForClient(
      userId,
      JSON.parse(raw) as AccountSyncPayload,
    );
  } catch {
    return null;
  }
}

export function persistAccountSnapshot(userId: string, payload: AccountSyncPayload) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getAccountCacheKey(userId), JSON.stringify(payload));
  } catch {
    // Ignore snapshot cache failures.
  }
}
