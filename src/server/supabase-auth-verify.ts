import type { NextRequest } from "next/server";
import { getUserIdFromBearerToken } from "@/server/auth-token";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

export type VerifiedAuth = {
  userId: string;
  accessToken: string;
};

/**
 * Verifies the Supabase access JWT with the project (signature + expiry + user).
 * When the service role key is not configured (local mock), falls back to decode-only
 * checks from {@link getUserIdFromBearerToken} — weaker; only for offline demos.
 */
export async function verifyBearerFromRequest(
  request: NextRequest,
): Promise<VerifiedAuth | null> {
  const authorizationHeader = request.headers.get("authorization") ?? "";
  const decoded = getUserIdFromBearerToken(authorizationHeader);

  if (!decoded) {
    return null;
  }

  const admin = getSupabaseAdminClient();

  if (!admin) {
    return {
      userId: decoded.userId,
      accessToken: decoded.accessToken,
    };
  }

  const { data, error } = await admin.auth.getUser(decoded.accessToken);

  if (error || !data.user) {
    return null;
  }

  if (data.user.id !== decoded.userId) {
    return null;
  }

  return {
    userId: data.user.id,
    accessToken: decoded.accessToken,
  };
}
