import { NextRequest, NextResponse } from "next/server";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

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
  const auth = await verifyBearerFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in first." }, { status: 401 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Billing is not configured on the server yet." },
      { status: 503 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const activeOnly = searchParams.get("activeOnly") !== "false";

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
    return NextResponse.json(
      { error: giftCodeResult.error.message ?? "Could not load gift code." },
      { status: 500 },
    );
  }

  const giftCode = (giftCodeResult.data ?? null) as GiftCodeRow | null;
  if (!giftCode) {
    return NextResponse.json({ giftCode: null });
  }

  const isExpired = new Date(giftCode.expires_at).getTime() <= Date.now();
  const isActive = giftCode.status === "active" && !isExpired;

  if (activeOnly && !isActive) {
    return NextResponse.json({ giftCode: null });
  }

  return NextResponse.json({
    giftCode: {
      id: giftCode.id,
      code: giftCode.code,
      status: isExpired && giftCode.status === "active" ? "expired" : giftCode.status,
      expiresAt: giftCode.expires_at,
      intendedPartnerUserId: giftCode.intended_partner_user_id,
      redeemedAt: giftCode.redeemed_at,
      createdAt: giftCode.created_at,
    },
  });
}
