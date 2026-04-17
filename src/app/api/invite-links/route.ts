import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { getUserIdFromBearerToken } from "@/server/auth-token";

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  const authorizationHeader = request.headers.get("authorization") ?? "";
  const authToken = getUserIdFromBearerToken(authorizationHeader);

  if (!authToken) {
    return NextResponse.json(
      { error: "You need to be logged in to create an invite link." },
      { status: 401 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Invite creation is not configured on the server yet." },
      { status: 500 },
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
    return NextResponse.json(
      {
        error:
          insertResult.error?.message ??
          "We couldn’t save this invite link right now.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({
    invite: insertResult.data,
    url: `${getAppUrl(request)}/connect?invite=${token}`,
  });
}
