import { NextRequest } from "next/server";
import { z } from "zod";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseJsonBody } from "@/server/api-validation";
import { requireServerAdmin } from "@/server/admin-auth";
import { checkRateLimit, clientIp } from "@/server/rate-limit";
import { logSecurityAudit } from "@/server/security-audit";

const updateSubscriptionSchema = z.object({
  subscriptionTier: z.enum(["free", "pro"]).optional(),
  adminModeSimulatePro: z.boolean().optional(),
});

type AuthMetadataLike = Record<string, unknown> | null | undefined;

function isMissingOptionalSettingsColumnError(
  error: { message?: string; code?: string } | null,
  columnName: string,
) {
  if (!error) {
    return false;
  }
  const normalized = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (normalized.includes(columnName.toLowerCase()) &&
      (normalized.includes("column") || normalized.includes("schema cache")))
  );
}

function readSubscriptionTierFromMetadata(metadata: AuthMetadataLike): "free" | "pro" {
  if (!metadata || typeof metadata !== "object") {
    return "free";
  }
  const raw =
    metadata.subscription_tier ??
    metadata.subscriptionTier;
  return raw === "pro" ? "pro" : "free";
}

function readAdminSimulateFromMetadata(metadata: AuthMetadataLike): boolean {
  if (!metadata || typeof metadata !== "object") {
    return false;
  }
  const raw =
    metadata.admin_mode_simulate_pro ??
    metadata.adminModeSimulatePro;
  return raw === true;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UPDATE_WINDOW_MS = 5 * 60 * 1000;
const UPDATE_MAX = 120;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const limited = checkRateLimit({
    key: `admin:subscription-update:${clientIp(request)}`,
    max: UPDATE_MAX,
    windowMs: UPDATE_WINDOW_MS,
  });
  if (!limited.ok) {
    return apiJsonError(429, "Too many subscription updates. Try again shortly.", {
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

  const parsedBody = await parseJsonBody(request, updateSubscriptionSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const updates: Record<string, unknown> = {};
  if (parsedBody.data.subscriptionTier) {
    updates.subscription_tier = parsedBody.data.subscriptionTier;
  }
  if (typeof parsedBody.data.adminModeSimulatePro === "boolean") {
    updates.admin_mode_simulate_pro = parsedBody.data.adminModeSimulatePro;
  }

  if (Object.keys(updates).length === 0) {
    return apiJsonError(400, "Provide at least one subscription update field.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  const upsertPayload = {
    user_id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  const updateResult = await supabaseAdmin.from("settings").upsert(upsertPayload as never, {
    onConflict: "user_id",
  });

  if (updateResult.error) {
    if (
      isMissingOptionalSettingsColumnError(updateResult.error, "subscription_tier") ||
      isMissingOptionalSettingsColumnError(updateResult.error, "admin_mode_simulate_pro")
    ) {
      const authUserResult = await supabaseAdmin.auth.admin.getUserById(userId);
      if (authUserResult.error) {
        return apiJsonError(
          500,
          authUserResult.error.message ??
            "Subscription columns are missing and auth metadata fallback failed.",
          { code: API_ERROR_CODES.INTERNAL, request },
        );
      }

      const existingMetadata = (authUserResult.data.user?.app_metadata ?? {}) as Record<string, unknown>;
      const nextSubscriptionTier =
        parsedBody.data.subscriptionTier ?? readSubscriptionTierFromMetadata(existingMetadata);
      const nextAdminSimulate =
        typeof parsedBody.data.adminModeSimulatePro === "boolean"
          ? parsedBody.data.adminModeSimulatePro
          : readAdminSimulateFromMetadata(existingMetadata);
      const metadataUpdateResult = await supabaseAdmin.auth.admin.updateUserById(userId, {
        app_metadata: {
          ...existingMetadata,
          subscription_tier: nextSubscriptionTier,
          admin_mode_simulate_pro: nextAdminSimulate,
        },
      });
      if (metadataUpdateResult.error) {
        return apiJsonError(
          500,
          metadataUpdateResult.error.message ??
            "Could not persist subscription fallback metadata.",
          { code: API_ERROR_CODES.INTERNAL, request },
        );
      }

      void logSecurityAudit({
        action: "admin_subscription_update",
        actorUserId: identity.userId,
        ip: clientIp(request),
        metadata: {
          targetUserId: userId,
          usedFallback: true,
          subscriptionTier: parsedBody.data.subscriptionTier ?? nextSubscriptionTier,
          adminModeSimulatePro:
            typeof parsedBody.data.adminModeSimulatePro === "boolean"
              ? parsedBody.data.adminModeSimulatePro
              : nextAdminSimulate,
        },
      });
      return apiJsonOk({ ok: true, usedFallback: "auth_metadata" }, request);
    }

    return apiJsonError(
      500,
      updateResult.error.message ?? "Subscription update failed.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  void logSecurityAudit({
    action: "admin_subscription_update",
    actorUserId: identity.userId,
    ip: clientIp(request),
    metadata: {
      targetUserId: userId,
      usedFallback: false,
      subscriptionTier: parsedBody.data.subscriptionTier,
      adminModeSimulatePro: parsedBody.data.adminModeSimulatePro,
    },
  });

  return apiJsonOk({ ok: true }, request);
}
