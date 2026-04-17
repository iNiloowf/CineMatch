import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/server/api-validation";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

const redeemGiftCodeSchema = z.object({
  code: z.string().min(4),
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
    return NextResponse.json({ error: "You need to be logged in first." }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request, redeemGiftCodeSchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Billing is not configured on the server yet." },
      { status: 503 },
    );
  }

  const normalizedCode = parsedBody.data.code.trim().toUpperCase();
  const giftCodeResult = await supabaseAdmin
    .from("subscription_partner_gift_codes")
    .select(
      "id, code, purchaser_user_id, intended_partner_user_id, status, expires_at, redeemed_by_user_id",
    )
    .eq("code", normalizedCode)
    .maybeSingle();

  if (giftCodeResult.error) {
    return NextResponse.json(
      { error: giftCodeResult.error.message ?? "Could not validate this code." },
      { status: 500 },
    );
  }

  const giftCode = (giftCodeResult.data ?? null) as GiftCodeRow | null;
  if (!giftCode) {
    return NextResponse.json({ error: "Gift code is invalid." }, { status: 404 });
  }

  if (giftCode.purchaser_user_id === auth.userId) {
    return NextResponse.json(
      { error: "You cannot redeem your own gift code." },
      { status: 400 },
    );
  }

  if (giftCode.status !== "active") {
    return NextResponse.json(
      { error: "Gift code is no longer active." },
      { status: 400 },
    );
  }

  if (giftCode.redeemed_by_user_id) {
    return NextResponse.json(
      { error: "Gift code is already redeemed." },
      { status: 400 },
    );
  }

  if (new Date(giftCode.expires_at).getTime() <= Date.now()) {
    await supabaseAdmin
      .from("subscription_partner_gift_codes")
      .update({ status: "expired" } as never)
      .eq("id", giftCode.id);
    return NextResponse.json({ error: "Gift code has expired." }, { status: 400 });
  }

  if (
    giftCode.intended_partner_user_id &&
    giftCode.intended_partner_user_id !== auth.userId
  ) {
    return NextResponse.json(
      { error: "This code is reserved for a different partner account." },
      { status: 403 },
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
    return NextResponse.json(
      { error: linkResult.error.message ?? "Could not verify linked partner relationship." },
      { status: 500 },
    );
  }

  if (!linkResult.data || linkResult.data.length === 0) {
    return NextResponse.json(
      { error: "You must be connected with this partner before redeeming the code." },
      { status: 403 },
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
    return NextResponse.json(
      { error: settingsResult.error.message ?? "Could not activate Pro on your account." },
      { status: 500 },
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
    return NextResponse.json(
      { error: markRedeemedResult.error.message ?? "Could not finalize gift redemption." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
