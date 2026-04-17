import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { clientIp, checkRateLimit } from "@/server/rate-limit";
import { logSecurityAudit } from "@/server/security-audit";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";

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

export async function POST(request: NextRequest) {
  const authToken = await verifyBearerFromRequest(request);

  if (!authToken) {
    return NextResponse.json(
      { error: "You need to be logged in first." },
      { status: 401 },
    );
  }

  const ip = clientIp(request);
  const rate = checkRateLimit({
    key: `invite:accept:${authToken.userId}:${ip}`,
    max: ACCEPT_MAX_PER_USER,
    windowMs: ACCEPT_WINDOW_MS,
  });

  if (!rate.ok) {
    return NextResponse.json(
      { error: "Too many invite accept attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Invite connections are not configured on the server yet." },
      { status: 500 },
    );
  }

  const currentUserId = authToken.userId;

  const body = (await request.json()) as { token?: string };
  const token = body.token?.trim();

  if (!token) {
    return NextResponse.json(
      { error: "An invite token is required." },
      { status: 400 },
    );
  }

  const inviteResult = await supabaseAdmin
    .from("invite_links")
    .select("id, inviter_id, token, created_at, used_at")
    .eq("token", token)
    .maybeSingle();

  const invite = (inviteResult.data ?? null) as InviteRow | null;

  if (!invite) {
    return NextResponse.json(
      { error: "This invite link is invalid." },
      { status: 404 },
    );
  }

  if (invite.inviter_id === currentUserId) {
    return NextResponse.json(
      { error: "You can’t use your own invite link." },
      { status: 400 },
    );
  }

  if (invite.used_at) {
    return NextResponse.json(
      { error: "This invite link has already been used." },
      { status: 400 },
    );
  }

  const existingLinkResult = await supabaseAdmin
    .from("linked_users")
    .select("id, requester_id, target_id, status, created_at")
    .or(
      `and(requester_id.eq.${currentUserId},target_id.eq.${invite.inviter_id}),and(requester_id.eq.${invite.inviter_id},target_id.eq.${currentUserId})`,
    )
    .maybeSingle();

  if (existingLinkResult.data) {
    return NextResponse.json(
      { error: "You’re already connected with this person." },
      { status: 400 },
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
    return NextResponse.json(
      {
        error:
          linkResult.error?.message ?? "We couldn’t connect these accounts yet.",
      },
      { status: 500 },
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
    .select("id, email, full_name, avatar_text, avatar_image_url, bio, city")
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
