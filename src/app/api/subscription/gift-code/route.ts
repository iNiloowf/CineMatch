import { NextRequest } from "next/server";
import { z } from "zod";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { parseSearchParams } from "@/server/api-validation";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

const giftCodeQuerySchema = z.object({
  activeOnly: z.string().optional(),
});

type GiftCodeRow = {
  id: string;
  code: string;
  status: "active" | "redeemed" | "expired" | "revoked";
  expires_at: string;
  intended_partner_user_id: string | null;
  redeemed_at: string | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  const parsedQuery = parseSearchParams(request, giftCodeQuerySchema);
  if (!parsedQuery.ok) {
    return parsedQuery.response;
  }

  const auth = await verifyBearerFromRequest(request);
  if (!auth) {
    return apiJsonError(401, "You need to be logged in first.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return apiJsonError(503, "Billing is not configured on the server yet.", {
      code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
      request,
    });
  }

  const activeOnly = parsedQuery.data.activeOnly !== "false";

  const giftCodeResult = await supabaseAdmin
    .from("subscription_partner_gift_codes")
    .select(
      "id, code, status, expires_at, intended_partner_user_id, redeemed_at, created_at",
    )
    .eq("purchaser_user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (giftCodeResult.error) {
    return apiJsonError(
      500,
      giftCodeResult.error.message ?? "Could not load gift code.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  const giftCode = (giftCodeResult.data ?? null) as GiftCodeRow | null;
  if (!giftCode) {
    return apiJsonOk({ giftCode: null }, request);
  }

  const isExpired = new Date(giftCode.expires_at).getTime() <= Date.now();
  const isActive = giftCode.status === "active" && !isExpired;

  if (activeOnly && !isActive) {
    return apiJsonOk({ giftCode: null }, request);
  }

  return apiJsonOk(
    {
      giftCode: {
        id: giftCode.id,
        code: giftCode.code,
        status: isExpired && giftCode.status === "active" ? "expired" : giftCode.status,
        expiresAt: giftCode.expires_at,
        intendedPartnerUserId: giftCode.intended_partner_user_id,
        redeemedAt: giftCode.redeemed_at,
        createdAt: giftCode.created_at,
      },
    },
    request,
  );
}
