import { type NextRequest } from "next/server";
import { z } from "zod";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { checkRateLimit } from "@/server/rate-limit";
import { parseJsonBody } from "@/server/api-validation";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";

const WINDOW_MS = 60_000;
const MAX = 50;

const bodySchema = z.object({
  linkId: z.string().uuid(),
  accept: z.boolean(),
});

export async function POST(request: NextRequest) {
  const token = await verifyBearerFromRequest(request);
  if (!token) {
    return apiJsonError(401, "Log in to answer friend requests.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return apiJsonError(500, "Server is not configured.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  const rate = checkRateLimit({
    key: `friends-respond:post:${token.userId}`,
    max: MAX,
    windowMs: WINDOW_MS,
  });
  if (!rate.ok) {
    return apiJsonError(429, "Too many updates. Try again in a moment.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      request,
    });
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { linkId, accept } = parsed.data;

  const { data: row, error: readError } = (await supabase
    .from("linked_users")
    .select("id, requester_id, target_id, status")
    .eq("id", linkId)
    .maybeSingle()) as {
    data: {
      id: string;
      requester_id: string;
      target_id: string;
      status: string;
    } | null;
    error: unknown;
  };

  if (readError) {
    return apiJsonError(500, "Couldn’t read that request.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  if (!row || row.target_id !== token.userId) {
    return apiJsonError(404, "That request wasn’t found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  if (row.status !== "pending") {
    return apiJsonError(400, "This request was already handled.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  if (!accept) {
    const { error: delErr } = await supabase
      .from("linked_users")
      .delete()
      .eq("id", linkId);
    if (delErr) {
      return apiJsonError(500, "Couldn’t remove that request.", {
        code: API_ERROR_CODES.INTERNAL,
        request,
      });
    }
    return apiJsonOk({ linkId, accepted: false }, request);
  }

  const { data: updated, error: upErr } = (await supabase
    .from("linked_users")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
    } as never)
    .eq("id", linkId)
    .select("id, requester_id, target_id, status, created_at")
    .single()) as {
    data: {
      id: string;
      requester_id: string;
      target_id: string;
      status: string;
      created_at: string;
    } | null;
    error: unknown;
  };

  if (upErr || !updated) {
    return apiJsonError(500, "Couldn’t accept that request right now.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  return apiJsonOk({ linkId, accepted: true, link: updated }, request);
}
