import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { requireServerAdmin } from "@/server/admin-auth";
import { checkRateLimit, clientIp } from "@/server/rate-limit";
import { logSecurityAudit } from "@/server/security-audit";

const DELETE_WINDOW_MS = 5 * 60 * 1000;
const DELETE_MAX = 40;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function removeProfilePhotosForUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
) {
  const bucket = "profile-photos";
  const { data: files, error: listError } = await supabaseAdmin.storage
    .from(bucket)
    .list(userId, { limit: 200 });

  if (listError || !files?.length) {
    return;
  }

  const paths = files.map((file) => `${userId}/${file.name}`);
  const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);

  if (removeError && process.env.NODE_ENV === "development") {
    console.warn("[admin delete user] storage:", removeError.message);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const limited = checkRateLimit({
    key: `admin:user-delete:${clientIp(request)}`,
    max: DELETE_MAX,
    windowMs: DELETE_WINDOW_MS,
  });

  if (!limited.ok) {
    return apiJsonError(429, "Too many delete requests. Try again shortly.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      headers: { "Retry-After": String(limited.retryAfterSec) },
      request,
    });
  }

  const adminAuth = await requireServerAdmin(request);
  if (!adminAuth.ok) {
    return adminAuth.response;
  }

  const { supabaseAdmin, identity } = adminAuth;
  const { userId } = await context.params;

  if (!userId || !UUID_RE.test(userId)) {
    return apiJsonError(400, "A valid user id is required.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  if (userId === identity.userId) {
    return apiJsonError(400, "You cannot delete your own account from the admin console.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  await removeProfilePhotosForUser(supabaseAdmin, userId);

  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (deleteError) {
    return apiJsonError(500, deleteError.message ?? "User could not be deleted.", {
      code: API_ERROR_CODES.INTERNAL,
      request,
    });
  }

  void logSecurityAudit({
    action: "admin_user_delete",
    actorUserId: identity.userId,
    ip: clientIp(request),
    metadata: {
      deletedUserId: userId,
      actorEmail: identity.email,
    },
  });

  return apiJsonOk({ deleted: true, userId }, request);
}
