import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUserWithAdmin } from "@/server/api-auth-guard";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { checkRateLimit } from "@/server/rate-limit";
import { parseJsonBody } from "@/server/api-validation";

const WINDOW_MS = 60_000;
const MAX = 50;

const bodySchema = z.object({
  linkId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const session = await requireAuthenticatedUserWithAdmin(request);
  if (!session.ok) {
    return session.response;
  }
  const { supabaseAdmin: supabase, auth: token } = session;

  const rate = checkRateLimit({
    key: `friends-cancel:post:${token.userId}`,
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

  const { linkId } = parsed.data;

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

  if (!row || row.requester_id !== token.userId) {
    return apiJsonError(404, "That outgoing request wasn’t found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  if (row.status !== "pending") {
    return apiJsonError(400, "This request is no longer pending.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  const { error: delErr } = await supabase.from("linked_users").delete().eq("id", linkId);
  if (delErr) {
    return apiJsonError(500, "Couldn’t withdraw that request.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  return apiJsonOk({ linkId, withdrawn: true }, request);
}
