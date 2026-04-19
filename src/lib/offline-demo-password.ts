import type { AuthUser } from "@/lib/types";

/**
 * Offline / in-memory demo users omit `password`; sign-in then requires
 * `NEXT_PUBLIC_OFFLINE_DEMO_PASSWORD` (set locally, never committed).
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
