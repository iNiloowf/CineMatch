import { NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseJsonBody } from "@/server/api-validation";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { clientIp, checkRateLimit } from "@/server/rate-limit";
import { logSecurityAudit } from "@/server/security-audit";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";
import { MAX_LINKED_FRIENDS } from "@/lib/invite-link-utils";

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
      request,
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
      request,
    });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return apiJsonError(
      500,
      "Invite connections are not configured on the server yet.",
      { code: API_ERROR_CODES.INTERNAL, request },
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
      request,
    });
  }

  if (invite.inviter_id === currentUserId) {
    return apiJsonError(400, "You can’t use your own invite link.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
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
      request,
    });
  }

  const countLinksForUser = async (userId: string) => {
    const { count, error } = await supabaseAdmin
      .from("linked_users")
      .select("id", { count: "exact", head: true })
      .or(`requester_id.eq.${userId},target_id.eq.${userId}`);
    if (error) {
      return null;
    }
    return count ?? 0;
  };

  const [acceptorLinkCount, inviterLinkCount] = await Promise.all([
    countLinksForUser(currentUserId),
    countLinksForUser(invite.inviter_id),
  ]);

  if (acceptorLinkCount === null || inviterLinkCount === null) {
    return apiJsonError(500, "We couldn’t verify friend limits right now.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  if (acceptorLinkCount >= MAX_LINKED_FRIENDS) {
    return apiJsonError(
      400,
      `You can link up to ${MAX_LINKED_FRIENDS} friends. Remove a connection before accepting a new one.`,
      { code: API_ERROR_CODES.BAD_REQUEST, request },
    );
  }

  if (inviterLinkCount >= MAX_LINKED_FRIENDS) {
    return apiJsonError(
      400,
      "This person already has the maximum number of friend links.",
      { code: API_ERROR_CODES.BAD_REQUEST, request },
    );
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
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  // Same invite token stays valid so more people (e.g. a group) can use one link;
  // do not set used_at. Limits are enforced by linked_users + MAX_LINKED_FRIENDS.

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
    .select("id, email, full_name, avatar_text, avatar_image_url, bio, city, profile_style, favorite_movie_id, favorite_movie_title, favorite_movie_year, favorite_movie_poster_url, favorite_movie_media_type, profile_header_movie_id, profile_header_movie_title, profile_header_movie_year, profile_header_poster_url, profile_header_media_type")
    .eq("id", invite.inviter_id)
    .maybeSingle();

  return apiJsonOk(
    {
      link: linkResult.data,
      partnerProfile: inviterProfileResult.data ?? null,
      invite,
    },
    request,
  );
}
