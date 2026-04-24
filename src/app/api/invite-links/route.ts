import { type NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { clientIp, checkRateLimit } from "@/server/rate-limit";
import { logSecurityAudit } from "@/server/security-audit";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { randomCode } from "@/server/invite-link-code";

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
}

/**
 * Public share URL (short) — fits one line in Telegram; redirects to /connect?invite=….
 */
function publicShortInviteUrl(request: NextRequest, code: string) {
  return `${getAppUrl(request)}/c/${code}`;
}

type InviteRow = {
  id: string;
  inviter_id: string;
  token: string;
  created_at: string;
  used_at: string | null;
  link_code: string | null;
};

const INVITE_CREATE_WINDOW_MS = 60 * 60 * 1000;
const INVITE_CREATE_MAX = 40;

const INSERT_ATTEMPTS = 12;
const BACKFILL_ATTEMPTS = 12;

async function ensureRowHasLinkCode(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  row: { id: string; link_code: string | null },
): Promise<string> {
  if (row.link_code) {
    return row.link_code;
  }
  for (let a = 0; a < BACKFILL_ATTEMPTS; a++) {
    const code = randomCode();
    const { data } = (await supabase
      .from("invite_links")
      .update({ link_code: code } as never)
      .eq("id", row.id)
      .is("link_code", null)
      .select("id, link_code")
      .maybeSingle()) as {
      data: { id: string; link_code: string } | null;
      error: { code?: string; message?: string } | null;
    };
    if (data?.link_code) {
      return data.link_code;
    }
    const { data: reread } = (await supabase
      .from("invite_links")
      .select("link_code")
      .eq("id", row.id)
      .maybeSingle()) as { data: { link_code: string | null } | null };
    if (reread?.link_code) {
      return reread.link_code;
    }
  }
  throw new Error("Couldn’t assign a short code for this invite. Try again.");
}

export async function POST(request: NextRequest) {
  const authToken = await verifyBearerFromRequest(request);

  if (!authToken) {
    return apiJsonError(401, "You need to be logged in to create an invite link.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return apiJsonError(500, "Invite creation is not configured on the server yet.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  const currentUserId = authToken.userId;

  const existing = (await supabaseAdmin
    .from("invite_links")
    .select("id, inviter_id, token, created_at, used_at, link_code")
    .eq("inviter_id", currentUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: InviteRow | null; error: { message?: string } | null };

  if (existing.error) {
    return apiJsonError(500, existing.error.message ?? "We couldn’t look up an invite for this account.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  if (existing.data) {
    let row = existing.data;
    if (!row.link_code) {
      try {
        const code = await ensureRowHasLinkCode(supabaseAdmin, row);
        row = { ...row, link_code: code };
      } catch (e) {
        return apiJsonError(
          500,
          e instanceof Error ? e.message : "Couldn’t prepare a short invite link. Try again.",
          { code: API_ERROR_CODES.INTERNAL, request },
        );
      }
    }
    return apiJsonOk(
      {
        invite: row,
        url: publicShortInviteUrl(request, row.link_code!),
        reused: true,
      },
      request,
    );
  }

  const rate = checkRateLimit({
    key: `invite:create:${authToken.userId}`,
    max: INVITE_CREATE_MAX,
    windowMs: INVITE_CREATE_WINDOW_MS,
  });

  if (!rate.ok) {
    return apiJsonError(429, "Too many invite links created. Try again later.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      headers: { "Retry-After": String(rate.retryAfterSec) },
      request,
    });
  }

  const token = `invite-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  let inserted: InviteRow | null = null;

  for (let t = 0; t < INSERT_ATTEMPTS; t++) {
    const link_code = randomCode();
    const insertResult = (await supabaseAdmin
      .from("invite_links")
      .insert(
        {
          inviter_id: currentUserId,
          token,
          link_code,
          created_at: createdAt,
          used_at: null,
        } as never,
      )
      .select("id, inviter_id, token, created_at, used_at, link_code")
      .single()) as { data: InviteRow | null; error: { code?: string; message?: string } | null };

    if (insertResult.data) {
      inserted = insertResult.data;
      break;
    }
    if (!insertResult.error) {
      break;
    }
    const msg = insertResult.error.message?.toLowerCase() ?? "";
    if (!/duplicate|unique|23505/.test(String(insertResult.error.code) + msg)) {
      return apiJsonError(400, insertResult.error.message ?? "We couldn’t save this invite link right now.", {
        code: API_ERROR_CODES.BAD_REQUEST,
        request,
      });
    }
  }

  if (!inserted?.link_code) {
    return apiJsonError(500, "We couldn’t create a short invite link. Try again.", { code: API_ERROR_CODES.INTERNAL, request });
  }

  void logSecurityAudit({
    action: "invite_link_create",
    actorUserId: currentUserId,
    ip: clientIp(request),
    metadata: { inviteId: inserted.id, linkCode: inserted.link_code },
  });

  return apiJsonOk(
    {
      invite: inserted,
      url: publicShortInviteUrl(request, inserted.link_code),
      reused: false,
    },
    request,
  );
}
