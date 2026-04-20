import { NextRequest } from "next/server";
import { z } from "zod";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
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
    return apiJsonError(401, "You need to be logged in first.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }

  const parsedBody = await parseJsonBody(request, createCheckoutIntentSchema);
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

  const { planType } = parsedBody.data;
  const rawPartnerUserId = parsedBody.data.partnerUserId?.trim();
  const partnerUserId = rawPartnerUserId || null;
  const isPartnerPlan = planType === "pro_partner_gift";

  if (isPartnerPlan && !partnerUserId) {
    return apiJsonError(400, "Select a connected partner for this plan.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  if (!isPartnerPlan && partnerUserId) {
    return apiJsonError(400, "Partner can only be set for partner gift plan.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  if (partnerUserId && partnerUserId === auth.userId) {
    return apiJsonError(
      400,
      "Partner account must be different from your own account.",
      { code: API_ERROR_CODES.BAD_REQUEST, request },
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
      return apiJsonError(
        500,
        linkResult.error.message ?? "Could not verify selected partner.",
        { code: API_ERROR_CODES.INTERNAL, request },
      );
    }

    if (!linkResult.data || linkResult.data.length === 0) {
      return apiJsonError(
        403,
        "Selected partner is not connected with an accepted link.",
        { code: API_ERROR_CODES.FORBIDDEN, request },
      );
    }
  }

  const baseCheckoutUrl = getCheckoutUrlForPlan(planType);
  if (!baseCheckoutUrl) {
    return apiJsonError(503, "Checkout link is not configured for this plan.", {
      code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
      request,
    });
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
    return apiJsonError(
      500,
      intentInsertResult.error.message ?? "Could not create checkout intent.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  let checkoutUrl: URL;
  try {
    checkoutUrl = new URL(baseCheckoutUrl);
  } catch {
    return apiJsonError(
      500,
      "Configured checkout URL for this plan is invalid.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }
  checkoutUrl.searchParams.set("client_reference_id", token);

  const buyerResult = await supabaseAdmin.auth.getUser(auth.accessToken);
  const buyerEmail = buyerResult.data.user?.email ?? null;
  if (buyerEmail) {
    checkoutUrl.searchParams.set("prefilled_email", buyerEmail);
  }

  return apiJsonOk(
    {
      ok: true,
      checkoutUrl: checkoutUrl.toString(),
      intentToken: token,
    },
    request,
  );
}
