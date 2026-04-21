import { NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { clientIp, checkRateLimit } from "@/server/rate-limit";
import { parseJsonBody } from "@/server/api-validation";
import { logSecurityAudit } from "@/server/security-audit";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { appendConversation, parseConversation, type ConversationEntry } from "@/lib/support-ticket-conversation";
import { z } from "zod";

const FOLLOWUP_WINDOW_MS = 10 * 60 * 1000;
const FOLLOWUP_MAX = 20;

const bodySchema = z.object({
  message: z.string().trim().min(1, "Message is required.").max(5000),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await context.params;
  const authToken = await verifyBearerFromRequest(request);

  if (!authToken) {
    return apiJsonError(401, "You need to be signed in.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
      request,
    });
  }

  const rate = checkRateLimit({
    key: `ticket:followup:${authToken.userId}`,
    max: FOLLOWUP_MAX,
    windowMs: FOLLOWUP_WINDOW_MS,
  });

  if (!rate.ok) {
    return apiJsonError(429, "Too many messages. Please try again shortly.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      headers: { "Retry-After": String(rate.retryAfterSec) },
      request,
    });
  }

  const parsed = await parseJsonBody(request, bodySchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return apiJsonError(
      500,
      "Ticket service is not configured on the server yet.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  const rowResult = (await supabaseAdmin
    .from("support_tickets")
    .select("id, user_id, status, conversation")
    .eq("id", ticketId)
    .maybeSingle()) as {
    data: {
      id: string;
      user_id: string;
      status: string;
      conversation: unknown;
    } | null;
    error: { message?: string } | null;
  };

  if (rowResult.error) {
    return apiJsonError(
      500,
      rowResult.error.message ?? "Could not load ticket.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  const row = rowResult.data;
  if (!row || row.user_id !== authToken.userId) {
    return apiJsonError(404, "Ticket not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  if (row.status === "closed") {
    return apiJsonError(400, "This ticket is closed. Open a new ticket if you still need help.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  const nowIso = new Date().toISOString();
  const entry: ConversationEntry = {
    from: "user",
    body: parsed.data.message,
    at: nowIso,
  };
  const nextConversation = appendConversation(row.conversation, entry);

  const updateResult = (await supabaseAdmin
    .from("support_tickets")
    .update({
      conversation: nextConversation,
      updated_at: nowIso,
    } as never)
    .eq("id", ticketId)
    .eq("user_id", authToken.userId)
    .select("id, conversation")
    .maybeSingle()) as {
    data: { id: string; conversation: unknown } | null;
    error: { message?: string } | null;
  };

  if (updateResult.error) {
    return apiJsonError(
      500,
      updateResult.error.message ?? "Could not save your message.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  if (!updateResult.data) {
    return apiJsonError(404, "Ticket not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  void logSecurityAudit({
    action: "support_ticket_user_followup",
    actorUserId: authToken.userId,
    ip: clientIp(request),
    metadata: { ticketId, messageLength: parsed.data.message.length },
  });

  return apiJsonOk(
    {
      ok: true,
      ticketId: updateResult.data.id,
      conversation: parseConversation(updateResult.data.conversation),
    },
    request,
  );
}
