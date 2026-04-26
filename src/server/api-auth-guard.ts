import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { API_ERROR_CODES, apiJsonError } from "@/server/api-response";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { type VerifyBearerResult, verifySupabaseBearer } from "@/server/supabase-auth-verify";

const MSG_AUTH_REQUIRED = "Authentication required.";
const MSG_SESSION_INVALID = "Invalid or expired session. Please sign in again.";
const MSG_AUTH_PROVIDER = "Authentication could not be verified. Try again shortly.";

export type AuthenticatedContext = {
  user: User;
  userId: string;
  accessToken: string;
};

export function mapBearerFailureToResponse(
  result: Extract<VerifyBearerResult, { ok: false }>,
  request: NextRequest,
): NextResponse {
  if (result.error === "missing_bearer") {
    return apiJsonError(401, MSG_AUTH_REQUIRED, {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }
  if (result.error === "invalid_token") {
    return apiJsonError(401, MSG_SESSION_INVALID, {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }
  return apiJsonError(503, MSG_AUTH_PROVIDER, {
    code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
    request,
  });
}

/**
 * Verifies a Supabase session (JWT) for protected API routes. No fall-through or decode-only path.
 */
export async function requireAuthenticatedUser(
  request: NextRequest,
): Promise<
  { ok: true; auth: AuthenticatedContext } | { ok: false; response: NextResponse }
> {
  const r = await verifySupabaseBearer(request);
  if (!r.ok) {
    return { ok: false, response: mapBearerFailureToResponse(r, request) };
  }
  return {
    ok: true,
    auth: { user: r.user, userId: r.userId, accessToken: r.accessToken },
  };
}

/**
 * Same as `requireAuthenticatedUser`, plus a `supabaseAdmin` client for the same project.
 * Use when the route needs DB access; returns 503 if the admin client is unavailable
 * (should be rare if verification succeeded).
 */
export async function requireAuthenticatedUserWithAdmin(
  request: NextRequest,
): Promise<
  | { ok: true; auth: AuthenticatedContext; supabaseAdmin: SupabaseClient }
  | { ok: false; response: NextResponse }
> {
  const r = await verifySupabaseBearer(request);
  if (!r.ok) {
    return { ok: false, response: mapBearerFailureToResponse(r, request) };
  }
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      ok: false,
      response: apiJsonError(503, MSG_AUTH_PROVIDER, {
        code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
        request,
      }),
    };
  }
  return {
    ok: true,
    auth: { user: r.user, userId: r.userId, accessToken: r.accessToken },
    supabaseAdmin,
  };
}

/**
 * 403 for acting on another user’s scope (e.g. mismatched `userId` query or body).
 */
export function forbiddenUserScopeResponse(request: NextRequest): NextResponse {
  return apiJsonError(403, "You do not have access to this resource.", {
    code: API_ERROR_CODES.FORBIDDEN,
    request,
  });
}
