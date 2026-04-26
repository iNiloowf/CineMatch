import type { AuthUser } from "@/lib/types";

type UserWithPassword = Pick<AuthUser, "password">;

/**
 * Validates offline / in-memory login on the server only.
 * Shared demo password comes from `OFFLINE_DEMO_PASSWORD` (never `NEXT_PUBLIC_*`) and
 * is only honored when `NODE_ENV === "development"`.
 */
export function verifyServerOfflineDemoPassword(
  user: UserWithPassword | null,
  password: string,
): boolean {
  if (!user) {
    return false;
  }
  if (user.password != null && user.password !== "") {
    return user.password === password;
  }
  if (process.env.NODE_ENV !== "development") {
    return false;
  }
  const shared = process.env.OFFLINE_DEMO_PASSWORD?.trim();
  if (!shared) {
    return false;
  }
  return password === shared;
}
