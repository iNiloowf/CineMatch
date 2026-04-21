import { NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { checkRateLimit, clientIp } from "@/server/rate-limit";
import { requireServerAdmin } from "@/server/admin-auth";
import { parseJsonBody } from "@/server/api-validation";
import { logSecurityAudit } from "@/server/security-audit";
import { z } from "zod";

type SupportTicketStatus = "open" | "under_review" | "closed";
type TicketStatusRow = {
  id: string;
  status: SupportTicketStatus | "in_progress";
  admin_reply: string | null;
  admin_replied_at: string | null;
};
type TicketIdRow = { id: string };
type TicketMutationResult = {
  data: TicketStatusRow | null;
  error: { message?: string } | null;
};

const ADMIN_WINDOW_MS = 5 * 60 * 1000;
const ADMIN_MUTATION_MAX = 80;

const updateTicketBodySchema = z
  .object({
    status: z.enum(["open", "under_review", "closed"]).optional(),
    adminReply: z.string().trim().min(1, "Reply cannot be empty.").max(8000).optional(),
  })
  .refine(
    (body) => body.status !== undefined || body.adminReply !== undefined,
    { message: "Provide a status change and/or an admin reply." },
  );

function isLegacyStatusConstraintError(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("support_tickets_status_check") &&
    normalized.includes("violates check constraint")
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await context.params;
  const adminRate = checkRateLimit({
    key: `admin:ticket:update:${clientIp(request)}`,
    max: ADMIN_MUTATION_MAX,
    windowMs: ADMIN_WINDOW_MS,
  });

  if (!adminRate.ok) {
    return apiJsonError(429, "Too many admin ticket requests. Try again shortly.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      headers: { "Retry-After": String(adminRate.retryAfterSec) },
      request,
    });
  }

  const parsedBody = await parseJsonBody(request, updateTicketBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const adminAuth = await requireServerAdmin(request);
  if (!adminAuth.ok) {
    return adminAuth.response;
  }
  const { identity, supabaseAdmin } = adminAuth;

  if (!ticketId) {
    return apiJsonError(400, "Ticket id is required.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  const { status: nextStatus, adminReply } = parsedBody.data;

  const nowIso = new Date().toISOString();
  const updatePayload: Record<string, string> = {
    updated_at: nowIso,
  };

  if (adminReply !== undefined) {
    updatePayload.admin_reply = adminReply;
    updatePayload.admin_replied_at = nowIso;
  }

  if (nextStatus !== undefined) {
    updatePayload.status = nextStatus;
  }

  let updateResult = (await supabaseAdmin
    .from("support_tickets")
    .update(updatePayload as never)
    .eq("id", ticketId)
    .select("id, status, admin_reply, admin_replied_at")
    .maybeSingle()) as TicketMutationResult;

  if (
    nextStatus === "under_review" &&
    updateResult.error &&
    isLegacyStatusConstraintError(updateResult.error.message)
  ) {
    const retryPayload = { ...updatePayload, status: "in_progress" as const };
    updateResult = (await supabaseAdmin
      .from("support_tickets")
      .update(retryPayload as never)
      .eq("id", ticketId)
      .select("id, status, admin_reply, admin_replied_at")
      .maybeSingle()) as TicketMutationResult;
  }

  if (updateResult.error) {
    return apiJsonError(
      500,
      updateResult.error.message ?? "Ticket could not be updated.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  if (!updateResult.data) {
    return apiJsonError(404, "Ticket was not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  void logSecurityAudit({
    action: "admin_ticket_update",
    ip: clientIp(request),
    metadata: {
      actor: identity.email ?? identity.userId,
      ticketId,
      status: nextStatus,
      hasAdminReply: Boolean(adminReply),
    },
  });

  return apiJsonOk(
    {
      ok: true,
      ticketId: updateResult.data.id,
      status: updateResult.data.status,
      adminReply: updateResult.data.admin_reply,
      adminRepliedAt: updateResult.data.admin_replied_at,
    },
    request,
  );
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await context.params;
  const adminRate = checkRateLimit({
    key: `admin:ticket:delete:${clientIp(request)}`,
    max: ADMIN_MUTATION_MAX,
    windowMs: ADMIN_WINDOW_MS,
  });

  if (!adminRate.ok) {
    return apiJsonError(429, "Too many admin ticket requests. Try again shortly.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      headers: { "Retry-After": String(adminRate.retryAfterSec) },
      request,
    });
  }

  const adminAuth = await requireServerAdmin(request);
  if (!adminAuth.ok) {
    return adminAuth.response;
  }
  const { identity, supabaseAdmin } = adminAuth;

  if (!ticketId) {
    return apiJsonError(400, "Ticket id is required.", {
      code: API_ERROR_CODES.BAD_REQUEST,
      request,
    });
  }

  const deleteResult = (await supabaseAdmin
    .from("support_tickets")
    .delete()
    .eq("id", ticketId)
    .select("id")
    .maybeSingle()) as {
    data: TicketIdRow | null;
    error: { message?: string } | null;
  };

  if (deleteResult.error) {
    return apiJsonError(
      500,
      deleteResult.error.message ?? "Ticket could not be deleted.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  if (!deleteResult.data) {
    return apiJsonError(404, "Ticket was not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
      request,
    });
  }

  void logSecurityAudit({
    action: "admin_ticket_delete",
    ip: clientIp(request),
    metadata: {
      actor: identity.email ?? identity.userId,
      ticketId,
    },
  });

  return apiJsonOk({ ok: true, ticketId: deleteResult.data.id }, request);
}
