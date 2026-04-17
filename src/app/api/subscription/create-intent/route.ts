import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/server/api-validation";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { getCheckoutUrlForPlan } from "@/server/stripe";

const createCheckoutIntentSchema = z.object({
  planType: z.enum(["pro_monthly", "pro_yearly", "pro_partner_gift"]),
  partnerUserId: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await verifyBearerFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "You need to be logged in first." }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request, createCheckoutIntentSchema);
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

  const { planType } = parsedBody.data;
  const rawPartnerUserId = parsedBody.data.partnerUserId?.trim();
  const partnerUserId = rawPartnerUserId || null;
  const isPartnerPlan = planType === "pro_partner_gift";

  if (isPartnerPlan && !partnerUserId) {
    return NextResponse.json(
      { error: "Select a connected partner for this plan." },
      { status: 400 },
    );
  }

  if (!isPartnerPlan && partnerUserId) {
    return NextResponse.json(
      { error: "Partner can only be set for partner gift plan." },
      { status: 400 },
    );
  }

  if (partnerUserId && partnerUserId === auth.userId) {
    return NextResponse.json(
      { error: "Partner account must be different from your own account." },
      { status: 400 },
    );
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
        { error: linkResult.error.message ?? "Could not verify selected partner." },
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

  const baseCheckoutUrl = getCheckoutUrlForPlan(planType);
  if (!baseCheckoutUrl) {
    return NextResponse.json(
      { error: "Checkout link is not configured for this plan." },
      { status: 503 },
    );
  }

  const token = crypto.randomUUID();
  const now = new Date().toISOString();

  const intentInsertResult = await supabaseAdmin
    .from("subscription_checkout_intents")
    .insert({
      token,
      purchaser_user_id: auth.userId,
      partner_user_id: partnerUserId,
      plan_type: planType,
      status: "pending",
      created_at: now,
      updated_at: now,
    } as never)
    .select("id")
    .single();

  if (intentInsertResult.error) {
    return NextResponse.json(
      { error: intentInsertResult.error.message ?? "Could not create checkout intent." },
      { status: 500 },
    );
  }

  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(baseCheckoutUrl);
  } catch {
    return NextResponse.json(
      { error: "Configured checkout URL for this plan is invalid." },
      { status: 500 },
    );
  }
  checkoutUrl.searchParams.set("client_reference_id", token);

  const buyerResult = await supabaseAdmin.auth.getUser(auth.accessToken);
  const buyerEmail = buyerResult.data.user?.email ?? null;
  if (buyerEmail) {
    checkoutUrl.searchParams.set("prefilled_email", buyerEmail);
  }

  return NextResponse.json({
    ok: true,
    checkoutUrl: checkoutUrl.toString(),
    intentToken: token,
  });
}
