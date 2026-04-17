import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/server/api-validation";
import { getDatabase, updateSettings as updateMockSettings } from "@/server/mock-db";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

const activateSubscriptionSchema = z.object({
  partnerUserId: z.string().min(1).optional(),
});

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

export async function POST(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in first." }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request, activateSubscriptionSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const partnerUserId = parsedBody.data.partnerUserId?.trim();
  if (partnerUserId && partnerUserId === auth.userId) {
    return NextResponse.json(
      { error: "Partner account must be different from your own account." },
      { status: 400 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    const database = getDatabase();
    if (partnerUserId) {
      const acceptedLinkExists = database.links.some(
        (link) =>
          link.status === "accepted" &&
          link.users.includes(auth.userId) &&
          link.users.includes(partnerUserId),
      );
      if (!acceptedLinkExists) {
        return NextResponse.json(
          { error: "Selected partner is not connected with an accepted link." },
          { status: 403 },
        );
      }
    }

    const ownSettings = updateMockSettings(auth.userId, {
      subscriptionTier: "pro",
      adminModeSimulatePro: false,
    });
    if (!ownSettings) {
      return NextResponse.json(
        { error: "Your settings could not be updated." },
        { status: 404 },
      );
    }

    if (partnerUserId) {
      const partnerSettings = updateMockSettings(partnerUserId, {
        subscriptionTier: "pro",
        adminModeSimulatePro: false,
      });
      if (!partnerSettings) {
        return NextResponse.json(
          { error: "Partner settings could not be updated." },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({
      ok: true,
      activatedUserIds: partnerUserId
        ? [auth.userId, partnerUserId]
        : [auth.userId],
    });
  }

  if (partnerUserId) {
    const linkResult = await supabaseAdmin
      .from("linked_users")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(requester_id.eq.${auth.userId},target_id.eq.${partnerUserId}),and(requester_id.eq.${partnerUserId},target_id.eq.${auth.userId})`,
      )
      .limit(1);

    if (linkResult.error) {
      return NextResponse.json(
        { error: linkResult.error.message ?? "Could not verify partner link." },
        { status: 500 },
      );
    }

    if (!linkResult.data || linkResult.data.length === 0) {
      return NextResponse.json(
        { error: "Selected partner is not connected with an accepted link." },
        { status: 403 },
      );
    }
  }

  const now = new Date().toISOString();
  const updateSettingsPayload = {
    subscription_tier: "pro" as const,
    admin_mode_simulate_pro: false,
    updated_at: now,
  };

  const ownUpdateResult = await supabaseAdmin
    .from("settings")
    .upsert(
      {
        user_id: auth.userId,
        ...updateSettingsPayload,
      } as never,
      { onConflict: "user_id" },
    );

  if (ownUpdateResult.error) {
    if (
      isMissingOptionalSettingsColumnError(ownUpdateResult.error, "subscription_tier") ||
      isMissingOptionalSettingsColumnError(ownUpdateResult.error, "admin_mode_simulate_pro")
    ) {
      return NextResponse.json(
        {
          error:
            "Subscription columns are missing in `settings` table. Run latest migration first.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: ownUpdateResult.error.message ?? "Could not activate Pro for your account." },
      { status: 500 },
    );
  }

  if (partnerUserId) {
    const partnerUpdateResult = await supabaseAdmin
      .from("settings")
      .upsert(
        {
          user_id: partnerUserId,
          ...updateSettingsPayload,
        } as never,
        { onConflict: "user_id" },
      );

    if (partnerUpdateResult.error) {
      if (
        isMissingOptionalSettingsColumnError(partnerUpdateResult.error, "subscription_tier") ||
        isMissingOptionalSettingsColumnError(
          partnerUpdateResult.error,
          "admin_mode_simulate_pro",
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Subscription columns are missing in `settings` table. Run latest migration first.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: partnerUpdateResult.error.message ?? "Could not activate Pro for partner." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    activatedUserIds: partnerUserId ? [auth.userId, partnerUserId] : [auth.userId],
  });
}
