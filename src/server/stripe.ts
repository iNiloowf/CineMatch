import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}

export function getCheckoutUrlForPlan(planType: "pro_monthly" | "pro_yearly" | "pro_partner_gift") {
  if (planType === "pro_monthly") {
    return process.env.NEXT_PUBLIC_PRO_CHECKOUT_URL_SOLO_MONTHLY ?? "";
  }
  if (planType === "pro_yearly") {
    return process.env.NEXT_PUBLIC_PRO_CHECKOUT_URL_SOLO_YEARLY ?? "";
  }
  return process.env.NEXT_PUBLIC_PRO_CHECKOUT_URL_PARTNER_GIFT ?? "";
}
