import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/server/api-validation";
import { requireServerAdmin } from "@/server/admin-auth";

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const adminAuth = await requireServerAdmin(request);
  if (!adminAuth.ok) {
    return adminAuth.response;
  }
  const { supabaseAdmin } = adminAuth;
  const { userId } = await context.params;

  if (!userId) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
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
    return NextResponse.json(
      { error: "Provide at least one subscription update field." },
      { status: 400 },
    );
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
        return NextResponse.json(
          {
            error:
              authUserResult.error.message ??
              "Subscription columns are missing and auth metadata fallback failed.",
          },
          { status: 500 },
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
        return NextResponse.json(
          {
            error:
              metadataUpdateResult.error.message ??
              "Could not persist subscription fallback metadata.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ ok: true, usedFallback: "auth_metadata" });
    }

    return NextResponse.json(
      { error: updateResult.error.message ?? "Subscription update failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
