import type { NextRequest } from "next/server";
import { getBearerAccessToken } from "@/server/auth-token";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

export type VerifiedAuth = {
  userId: string;
  accessToken: string;
};

/**
 * Verifies the Supabase access JWT via the project (signature, expiry, user) using the service
 * role client. Requires `SUPABASE_SERVICE_ROLE_KEY` in production; no decode-only path.
 */
export async function verifyBearerFromRequest(
  request: NextRequest,
): Promise<VerifiedAuth | null> {
  const accessToken = getBearerAccessToken(request.headers.get("authorization") ?? "");
  if (!accessToken) {
    return null;
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return null;
  }

  const { data, error } = await admin.auth.getUser(accessToken);

  if (error || !data.user) {
    return null;
  }

  return {
    userId: data.user.id,
    accessToken,
  };
}
