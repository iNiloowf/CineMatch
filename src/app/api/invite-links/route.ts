import { NextRequest, NextResponse } from "next/server";
import { API_ERROR_CODES, apiJsonError } from "@/server/api-response";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { clientIp, checkRateLimit } from "@/server/rate-limit";
import { logSecurityAudit } from "@/server/security-audit";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

const INVITE_CREATE_WINDOW_MS = 60 * 60 * 1000;
const INVITE_CREATE_MAX = 40;

export async function POST(request: NextRequest) {
  const authToken = await verifyBearerFromRequest(request);

  if (!authToken) {
    return apiJsonError(401, "You need to be logged in to create an invite link.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
    });
  }

  const rate = checkRateLimit({
    key: `invite:create:${authToken.userId}`,
    max: INVITE_CREATE_MAX,
    windowMs: INVITE_CREATE_WINDOW_MS,
  });

  if (!rate.ok) {
    return apiJsonError(
      429,
      "Too many invite links created. Try again later.",
      {
        code: API_ERROR_CODES.RATE_LIMITED,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return apiJsonError(
      500,
      "Invite creation is not configured on the server yet.",
      { code: API_ERROR_CODES.INTERNAL },
    );
  }

  const currentUserId = authToken.userId;

  const token = `invite-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const invitePayload = {
    inviter_id: currentUserId,
    token,
    created_at: createdAt,
    used_at: null,
  };

  const insertResult = (await supabaseAdmin
    .from("invite_links")
    .insert(invitePayload as never)
    .select("id, inviter_id, token, created_at, used_at")
    .single()) as {
    data: {
      id: string;
      inviter_id: string;
      token: string;
      created_at: string;
      used_at: string | null;
    } | null;
    error: { message?: string } | null;
  };

  if (insertResult.error || !insertResult.data) {
    return apiJsonError(
      400,
      insertResult.error?.message ??
        "We couldn’t save this invite link right now.",
      { code: API_ERROR_CODES.BAD_REQUEST },
    );
  }

  void logSecurityAudit({
    action: "invite_link_create",
    actorUserId: currentUserId,
    ip: clientIp(request),
    metadata: { inviteId: insertResult.data.id },
  });

  return NextResponse.json({
    invite: insertResult.data,
    url: `${getAppUrl(request)}/connect?invite=${token}`,
  });
}
