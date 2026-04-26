import { type NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { checkRateLimit } from "@/server/rate-limit";
import {
  describePublicHandleValidationError,
  normalizePublicHandleInput,
} from "@/lib/public-handle";

const WINDOW_MS = 60 * 1000;
const MAX = 50;

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return apiJsonError(500, "Server is not configured.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rate = checkRateLimit({
    key: `handle-availability:${ip}`,
    max: MAX,
    windowMs: WINDOW_MS,
  });
  if (!rate.ok) {
    return apiJsonError(429, "Too many requests. Try again in a moment.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      headers: { "Retry-After": String(rate.retryAfterSec) },
      request,
    });
  }

  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("handle") ?? "";
  const excludeId = searchParams.get("exclude")?.trim() ?? "";
  const handle = normalizePublicHandleInput(raw);
  const formatError = describePublicHandleValidationError(handle);
  if (formatError) {
    return apiJsonOk({ available: false, reason: formatError }, request);
  }

  const readResult = await supabase
    .from("profiles")
    .select("id")
    .eq("public_handle", handle)
    .maybeSingle();
  const row = readResult.data as { id: string } | null;
  const error = readResult.error;

  if (error) {
    return apiJsonError(500, "Couldn’t check that User ID right now.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  const ownedByCurrentUser = Boolean(
    row && excludeId.length > 0 && row.id === excludeId,
  );
  const available = !row || ownedByCurrentUser;

  return apiJsonOk({ available, handle }, request);
}
