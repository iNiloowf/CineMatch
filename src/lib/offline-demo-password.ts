import type { AuthUser } from "@/lib/types";

/**
 * Offline / in-memory users may omit `password`; optional env
 * `NEXT_PUBLIC_OFFLINE_DEMO_PASSWORD` can unlock legacy seeded accounts (local dev only).
 * Users created via offline signup keep a per-account `password`.
 */
export function verifyOfflineDemoPassword(user: AuthUser, password: string): boolean {
  if (user.password != null && user.password !== "") {
    return user.password === password;
  }
  const shared = process.env.NEXT_PUBLIC_OFFLINE_DEMO_PASSWORD?.trim();
  if (!shared) {
    return false;
  }
  return password === shared;
}
