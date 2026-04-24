import { type NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { checkRateLimit, clientIp } from "@/server/rate-limit";
import { z } from "zod";

const RESOLVE_MAX = 90;
const RESOLVE_WINDOW_MS = 60 * 60 * 1000;
const codeSchema = z
  .string()
  .trim()
  .min(6, "code")
  .max(20, "code")
  .regex(/^[a-z0-9]+$/i);

/**
 * Resolves a short /c/… public code to the long invite-… token (for in-app “Paste link”).
 * Public, rate-limited. Does not create links.
 */
export async function GET(request: NextRequest) {
  const ip = clientIp(request);
  const rate = checkRateLimit({
    key: `invite:code_resolve:${ip}`,
    max: RESOLVE_MAX,
    windowMs: RESOLVE_WINDOW_MS,
  });
  if (!rate.ok) {
    return apiJsonError(
      429,
      "Too many code lookups. Try again later.",
      { code: API_ERROR_CODES.RATE_LIMITED, headers: { "Retry-After": String(rate.retryAfterSec) }, request },
    );
  }

  const codeRaw = request.nextUrl.searchParams.get("code");
  const parsed = codeSchema.safeParse(typeof codeRaw === "string" ? codeRaw : "");
  if (!parsed.success) {
    return apiJsonError(400, "A valid `code` query (6–20 letters or digits) is required.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }
  const code = parsed.data.toLowerCase();
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return apiJsonError(500, "Service not configured.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  const { data, error } = (await supabaseAdmin
    .from("invite_links")
    .select("token")
    .eq("link_code", code)
    .maybeSingle()) as { data: { token: string } | null; error: { message?: string } | null };

  if (error) {
    return apiJsonError(500, error.message ?? "Lookup failed.", { code: API_ERROR_CODES.INTERNAL, request });
  }
  if (!data?.token) {
    return apiJsonError(404, "We couldn’t find that invite code.", { code: API_ERROR_CODES.NOT_FOUND, request });
  }

  return apiJsonOk({ token: data.token }, request, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
