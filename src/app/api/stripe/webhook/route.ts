import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { getStripeServerClient, getStripeWebhookSecret } from "@/server/stripe";

type CheckoutIntentRow = {
  id: string;
  token: string;
  purchaser_user_id: string;
  partner_user_id: string | null;
  plan_type: "pro_monthly" | "pro_yearly" | "pro_partner_gift";
  status: "pending" | "completed" | "failed" | "expired";
};

function createOneTimeGiftCode() {
  const raw = crypto.randomUUID().replace(/-/g, "").toUpperCase();
  return `CM-GIFT-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export async function POST(request: NextRequest) {
  const stripe = getStripeServerClient();
  const webhookSecret = getStripeWebhookSecret();
  const supabaseAdmin = getSupabaseAdminClient();

  if (!stripe || !webhookSecret || !supabaseAdmin) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured on the server." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook signature." },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const intentToken = session.client_reference_id;

    if (!intentToken) {
      return NextResponse.json({ ok: true, ignored: "missing_client_reference_id" });
    }

    const checkoutIntentResult = await supabaseAdmin
      .from("subscription_checkout_intents")
      .select("id, token, purchaser_user_id, partner_user_id, plan_type, status")
      .eq("token", intentToken)
      .maybeSingle();

    if (checkoutIntentResult.error) {
      return NextResponse.json(
        { error: checkoutIntentResult.error.message ?? "Could not load checkout intent." },
        { status: 500 },
      );
    }

    const checkoutIntent = (checkoutIntentResult.data ?? null) as CheckoutIntentRow | null;
    if (!checkoutIntent) {
      return NextResponse.json({ ok: true, ignored: "intent_not_found" });
    }

    if (checkoutIntent.status === "completed") {
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    const now = new Date().toISOString();
    const purchaserSettingsResult = await supabaseAdmin.from("settings").upsert(
      {
        user_id: checkoutIntent.purchaser_user_id,
        subscription_tier: "pro",
        admin_mode_simulate_pro: false,
        updated_at: now,
      } as never,
      { onConflict: "user_id" },
    );

    if (purchaserSettingsResult.error) {
      return NextResponse.json(
        {
          error:
            purchaserSettingsResult.error.message ??
            "Could not activate purchaser subscription tier.",
        },
        { status: 500 },
      );
    }

    if (checkoutIntent.plan_type === "pro_partner_gift") {
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const code = createOneTimeGiftCode();
      const createGiftCodeResult = await supabaseAdmin
        .from("subscription_partner_gift_codes")
        .insert({
          code,
          purchaser_user_id: checkoutIntent.purchaser_user_id,
          intended_partner_user_id: checkoutIntent.partner_user_id,
          checkout_intent_id: checkoutIntent.id,
          status: "active",
          expires_at: expiresAt,
          created_at: now,
        } as never);

      if (createGiftCodeResult.error) {
        return NextResponse.json(
          { error: createGiftCodeResult.error.message ?? "Could not create gift code." },
          { status: 500 },
        );
      }
    }

    const markCompletedResult = await supabaseAdmin
      .from("subscription_checkout_intents")
      .update({
        status: "completed",
        stripe_session_id: session.id,
        completed_at: now,
        updated_at: now,
      } as never)
      .eq("id", checkoutIntent.id);

    if (markCompletedResult.error) {
      return NextResponse.json(
        { error: markCompletedResult.error.message ?? "Could not mark checkout as completed." },
        { status: 500 },
      );
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const intentToken = session.client_reference_id;
    if (intentToken) {
      await supabaseAdmin
        .from("subscription_checkout_intents")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("token", intentToken)
        .eq("status", "pending");
    }
  }

  return NextResponse.json({ ok: true });
}
