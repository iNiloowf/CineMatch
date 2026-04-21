import { NextRequest } from "next/server";
import { z } from "zod";
import { normalizePartnerGiftCode } from "@/lib/partner-gift-code";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseJsonBody } from "@/server/api-validation";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

const redeemGiftCodeSchema = z.object({
  code: z
    .string()
    .min(4)
    .max(32)
    .regex(/^[A-Za-z0-9]+$/, {
      message: "Use only English letters and numbers.",
    }),
});

type GiftCodeRow = {
  id: string;
  code: string;
  purchaser_user_id: string;
  intended_partner_user_id: string | null;
  status: "active" | "redeemed" | "expired" | "revoked";
  expires_at: string;
  redeemed_by_user_id: string | null;
};

export async function POST(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);
  if (!auth) {
    return apiJsonError(401, "You need to be logged in first.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }

  const parsedBody = await parseJsonBody(request, redeemGiftCodeSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return apiJsonError(503, "Billing is not configured on the server yet.", {
      code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
      request,
    });
  }

  const normalizedCode = normalizePartnerGiftCode(parsedBody.data.code);
  const giftCodeResult = await supabaseAdmin
    .from("subscription_partner_gift_codes")
    .select(
      "id, code, purchaser_user_id, intended_partner_user_id, status, expires_at, redeemed_by_user_id",
    )
    .eq("code", normalizedCode)
    .maybeSingle();

  if (giftCodeResult.error) {
    return apiJsonError(
      500,
      giftCodeResult.error.message ?? "Could not validate this code.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  const giftCode = (giftCodeResult.data ?? null) as GiftCodeRow | null;
  if (!giftCode) {
    return apiJsonError(404, "Gift code is invalid.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  if (giftCode.purchaser_user_id === auth.userId) {
    return apiJsonError(400, "You cannot redeem your own gift code.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  if (giftCode.status !== "active") {
    return apiJsonError(400, "Gift code is no longer active.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  if (giftCode.redeemed_by_user_id) {
    return apiJsonError(400, "Gift code is already redeemed.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  if (new Date(giftCode.expires_at).getTime() <= Date.now()) {
    await supabaseAdmin
      .from("subscription_partner_gift_codes")
      .update({ status: "expired" } as never)
      .eq("id", giftCode.id);
    return apiJsonError(400, "Gift code has expired.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  if (
    giftCode.intended_partner_user_id &&
    giftCode.intended_partner_user_id !== auth.userId
  ) {
    return apiJsonError(
      403,
      "This code is reserved for a different partner account.",
      { code: API_ERROR_CODES.FORBIDDEN, request },
    );
  }

  const linkResult = await supabaseAdmin
    .from("linked_users")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${giftCode.purchaser_user_id},target_id.eq.${auth.userId}),and(requester_id.eq.${auth.userId},target_id.eq.${giftCode.purchaser_user_id})`,
    )
    .limit(1);

  if (linkResult.error) {
    return apiJsonError(
      500,
      linkResult.error.message ?? "Could not verify linked partner relationship.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  if (!linkResult.data || linkResult.data.length === 0) {
    return apiJsonError(
      403,
      "You must be connected with this partner before redeeming the code.",
      { code: API_ERROR_CODES.FORBIDDEN, request },
    );
  }

  const now = new Date().toISOString();
  const settingsResult = await supabaseAdmin.from("settings").upsert(
    {
      user_id: auth.userId,
      subscription_tier: "pro",
      admin_mode_simulate_pro: false,
      updated_at: now,
    } as never,
    { onConflict: "user_id" },
  );

  if (settingsResult.error) {
    return apiJsonError(
      500,
      settingsResult.error.message ?? "Could not activate Pro on your account.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  const markRedeemedResult = await supabaseAdmin
    .from("subscription_partner_gift_codes")
    .update({
      status: "redeemed",
      redeemed_by_user_id: auth.userId,
      redeemed_at: now,
    } as never)
    .eq("id", giftCode.id)
    .eq("status", "active")
    .is("redeemed_by_user_id", null);

  if (markRedeemedResult.error) {
    return apiJsonError(
      500,
      markRedeemedResult.error.message ?? "Could not finalize gift redemption.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  return apiJsonOk({ ok: true }, request);
}
