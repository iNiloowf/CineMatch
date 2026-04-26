import type { AuthUser } from "@/lib/types";

/**
 * Client-side checks for in-memory users that store a password in app data (offline signup).
 * A shared demo password for legacy seeded users is **never** read in the browser; use
 * `POST /api/dev/offline-demo-auth` in development only (see `login` in app-state).
 */
export function hasPerAccountOfflinePassword(user: AuthUser): boolean {
  return user.password != null && user.password !== "";
}

export function verifyPerAccountOfflinePassword(
  user: AuthUser,
  password: string,
): boolean {
  if (!hasPerAccountOfflinePassword(user)) {
    return false;
  }
  return user.password === password;
}
