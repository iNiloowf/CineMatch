import type { NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getBearerAccessToken } from "@/server/auth-token";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

export type VerifyBearerResult =
  | { ok: true; user: User; userId: string; accessToken: string }
  | { ok: false; error: "missing_bearer" | "invalid_token" | "server_misconfigured" };

export type VerifiedAuth = {
  userId: string;
  accessToken: string;
};

/**
 * Verifies the Supabase access JWT via the service role client (`auth.getUser`).
 * Distinguishes missing/invalid token from missing server configuration.
 */
export async function verifySupabaseBearer(
  request: NextRequest,
): Promise<VerifyBearerResult> {
  const accessToken = getBearerAccessToken(request.headers.get("authorization") ?? "");
  if (!accessToken) {
    return { ok: false, error: "missing_bearer" };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { ok: false, error: "server_misconfigured" };
  }

  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) {
    return { ok: false, error: "invalid_token" };
  }

  return {
    ok: true,
    user: data.user,
    userId: data.user.id,
    accessToken,
  };
}

/**
 * @deprecated Use `verifySupabaseBearer` or `requireAuthenticatedUser` from
 * `@/server/api-auth-guard`. `null` conflates auth failure with a misconfigured server.
 */
export async function verifyBearerFromRequest(
  request: NextRequest,
): Promise<VerifiedAuth | null> {
  const r = await verifySupabaseBearer(request);
  if (!r.ok) {
    return null;
  }
  return { userId: r.userId, accessToken: r.accessToken };
}
