import { type NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { checkRateLimit } from "@/server/rate-limit";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";

const WINDOW_MS = 60_000;
const MAX = 30;

/**
 * Idempotent: assigns a generated `user_NNNNN` if the profile row is missing
 * a handle (legacy accounts). First login or sync.
 */
export async function POST(request: NextRequest) {
  const token = await verifyBearerFromRequest(request);
  if (!token) {
    return apiJsonError(401, "Log in to continue.", {
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
    key: `ensure-public-handle:post:${token.userId}`,
    max: MAX,
    windowMs: WINDOW_MS,
  });
  if (!rate.ok) {
    return apiJsonError(429, "Too many requests. Wait a moment.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      request,
    });
  }

  const readResult = await supabase
    .from("profiles")
    .select("id, public_handle")
    .eq("id", token.userId)
    .maybeSingle();
  const row = readResult.data as { id: string; public_handle: string | null } | null;
  const readError = readResult.error;

  if (readError || !row) {
    return apiJsonError(500, "Couldn’t load your profile.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  if (row.public_handle) {
    return apiJsonOk({ publicHandle: row.public_handle, created: false }, request);
  }

  for (let n = 0; n < 100; n++) {
    const suffix = String(10000 + Math.floor(Math.random() * 90000));
    const handle = `user_${suffix}`;

    const updateResult = await supabase
      .from("profiles")
      .update({ public_handle: handle, updated_at: new Date().toISOString() } as never)
      .eq("id", token.userId)
      .is("public_handle", null)
      .select("public_handle")
      .maybeSingle();
    const updated = updateResult.data as { public_handle: string } | null;
    const upError = updateResult.error;

    if (upError?.code === "23505" || (upError?.message ?? "").toLowerCase().includes("unique")) {
      continue;
    }
    if (upError) {
      return apiJsonError(500, "Couldn’t assign a User ID yet.", {
        code: API_ERROR_CODES.INTERNAL,
        request,
      });
    }
    if (updated?.public_handle) {
      return apiJsonOk(
        { publicHandle: updated.public_handle, created: true },
        request,
      );
    }

    const rereadRes = await supabase
      .from("profiles")
      .select("public_handle")
      .eq("id", token.userId)
      .maybeSingle();
    const reread = rereadRes.data as { public_handle: string | null } | null;
    if (reread?.public_handle) {
      return apiJsonOk(
        { publicHandle: reread.public_handle, created: false },
        request,
      );
    }
  }

  return apiJsonError(500, "Couldn’t assign a unique User ID. Try again.", {
    code: API_ERROR_CODES.INTERNAL,
    request,
  });
}
