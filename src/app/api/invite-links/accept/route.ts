import { NextRequest, NextResponse } from "next/server";
import { API_ERROR_CODES, apiJsonError } from "@/server/api-response";
import { parseJsonBody } from "@/server/api-validation";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { clientIp, checkRateLimit } from "@/server/rate-limit";
import { logSecurityAudit } from "@/server/security-audit";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";

type InviteRow = {
  id: string;
  inviter_id: string;
  token: string;
  created_at: string;
  used_at: string | null;
};

type LinkRow = {
  id: string;
  requester_id: string;
  target_id: string;
  status: "accepted" | "pending";
  created_at: string;
};

const ACCEPT_WINDOW_MS = 60 * 60 * 1000;
const ACCEPT_MAX_PER_USER = 60;
const acceptInviteBodySchema = z.object({
  token: z.string().trim().min(1, "An invite token is required."),
});

export async function POST(request: NextRequest) {
  const authToken = await verifyBearerFromRequest(request);

  if (!authToken) {
    return apiJsonError(401, "You need to be logged in first.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
    });
  }

  const ip = clientIp(request);
  const rate = checkRateLimit({
    key: `invite:accept:${authToken.userId}:${ip}`,
    max: ACCEPT_MAX_PER_USER,
    windowMs: ACCEPT_WINDOW_MS,
  });

  if (!rate.ok) {
    return apiJsonError(429, "Too many invite accept attempts. Try again later.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      headers: { "Retry-After": String(rate.retryAfterSec) },
    });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return apiJsonError(
      500,
      "Invite connections are not configured on the server yet.",
      { code: API_ERROR_CODES.INTERNAL },
    );
  }

  const currentUserId = authToken.userId;

  const parsedBody = await parseJsonBody(request, acceptInviteBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const token = parsedBody.data.token.trim();

  const inviteResult = await supabaseAdmin
    .from("invite_links")
    .select("id, inviter_id, token, created_at, used_at")
    .eq("token", token)
    .maybeSingle();

  const invite = (inviteResult.data ?? null) as InviteRow | null;

  if (!invite) {
    return apiJsonError(404, "This invite link is invalid.", {
      code: API_ERROR_CODES.NOT_FOUND,
    });
  }

  if (invite.inviter_id === currentUserId) {
    return apiJsonError(400, "You can’t use your own invite link.", {
      code: API_ERROR_CODES.BAD_REQUEST,
    });
  }

  if (invite.used_at) {
    return apiJsonError(400, "This invite link has already been used.", {
      code: API_ERROR_CODES.BAD_REQUEST,
    });
  }

  const existingLinkResult = await supabaseAdmin
    .from("linked_users")
    .select("id, requester_id, target_id, status, created_at")
    .or(
      `and(requester_id.eq.${currentUserId},target_id.eq.${invite.inviter_id}),and(requester_id.eq.${invite.inviter_id},target_id.eq.${currentUserId})`,
    )
    .maybeSingle();

  if (existingLinkResult.data) {
    return apiJsonError(400, "You’re already connected with this person.", {
      code: API_ERROR_CODES.BAD_REQUEST,
    });
  }

  const createdAt = new Date().toISOString();
  const linkResult = (await supabaseAdmin
    .from("linked_users")
    .insert(
      {
        requester_id: currentUserId,
        target_id: invite.inviter_id,
        status: "accepted",
        created_at: createdAt,
        accepted_at: createdAt,
      } as never,
    )
    .select("id, requester_id, target_id, status, created_at")
    .single()) as {
    data: LinkRow | null;
    error: { message?: string } | null;
  };

  if (linkResult.error || !linkResult.data) {
    return apiJsonError(
      500,
      linkResult.error?.message ?? "We couldn’t connect these accounts yet.",
      { code: API_ERROR_CODES.INTERNAL },
    );
  }

  await supabaseAdmin
    .from("invite_links")
    .update({ used_at: new Date().toISOString() } as never)
    .eq("id", invite.id);

  void logSecurityAudit({
    action: "invite_link_accept",
    actorUserId: currentUserId,
    ip,
    metadata: {
      inviteId: invite.id,
      inviterId: invite.inviter_id,
      linkId: linkResult.data.id,
    },
  });

  const inviterProfileResult = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, avatar_text, avatar_image_url, bio, city, profile_style")
    .eq("id", invite.inviter_id)
    .maybeSingle();

  return NextResponse.json({
    link: linkResult.data,
    partnerProfile: inviterProfileResult.data ?? null,
    invite: {
      ...invite,
      used_at: new Date().toISOString(),
    },
  });
}
