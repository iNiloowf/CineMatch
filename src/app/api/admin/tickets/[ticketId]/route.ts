import { NextRequest, NextResponse } from "next/server";
import { API_ERROR_CODES, apiJsonError } from "@/server/api-response";
import { checkRateLimit, clientIp } from "@/server/rate-limit";
import { requireServerAdmin } from "@/server/admin-auth";
import { parseJsonBody } from "@/server/api-validation";
import { logSecurityAudit } from "@/server/security-audit";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { z } from "zod";

type SupportTicketStatus = "open" | "under_review" | "closed";
type TicketStatusRow = { id: string; status: SupportTicketStatus | "in_progress" };
type TicketIdRow = { id: string };
type TicketMutationResult = {
  data: TicketStatusRow | null;
  error: { message?: string } | null;
};

const ADMIN_WINDOW_MS = 5 * 60 * 1000;
const ADMIN_MUTATION_MAX = 80;
const updateTicketBodySchema = z.object({
  status: z.enum(["open", "under_review", "closed"]),
});

function isLegacyStatusConstraintError(message: string | undefined) {
  const normalized = (message ?? "").toLowerCase();
  return (
    normalized.includes("support_tickets_status_check") &&
    normalized.includes("violates check constraint")
  );
}

async function updateTicketStatus(
  ticketId: string,
  status: SupportTicketStatus | "in_progress",
): Promise<TicketMutationResult> {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      data: null,
      error: { message: "Admin dashboard is not configured on the server yet." },
    };
  }

  return (await supabaseAdmin
    .from("support_tickets")
    .update({
      status,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", ticketId)
    .select("id, status")
    .maybeSingle()) as TicketMutationResult;
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
    });
  }

  const parsedBody = await parseJsonBody(request, updateTicketBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const { status: nextStatus } = parsedBody.data;
  const adminAuth = await requireServerAdmin(request);
  if (!adminAuth.ok) {
    return adminAuth.response;
  }
  const { identity } = adminAuth;

  if (!ticketId) {
    return apiJsonError(400, "Ticket id is required.", {
      code: API_ERROR_CODES.BAD_REQUEST,
    });
  }

  let effectiveStatus: SupportTicketStatus | "in_progress" = nextStatus;
  let updateResult = await updateTicketStatus(ticketId, effectiveStatus);

  if (
    nextStatus === "under_review" &&
    updateResult.error &&
    isLegacyStatusConstraintError(updateResult.error.message)
  ) {
    // Backward compatibility for databases that still allow "in_progress" only.
    effectiveStatus = "in_progress";
    updateResult = await updateTicketStatus(ticketId, effectiveStatus);
  }

  if (updateResult.error) {
    return apiJsonError(
      500,
      updateResult.error.message ?? "Ticket status could not be updated.",
      { code: API_ERROR_CODES.INTERNAL },
    );
  }

  if (!updateResult.data) {
    return apiJsonError(404, "Ticket was not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
    });
  }

  void logSecurityAudit({
    action: "admin_ticket_status_update",
    ip: clientIp(request),
    metadata: {
      actor: identity.email ?? identity.userId,
      ticketId,
      requestedStatus: nextStatus,
      effectiveStatus,
    },
  });

  return NextResponse.json({
    ok: true,
    ticketId: updateResult.data.id,
    status: updateResult.data.status,
  });
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
      { code: API_ERROR_CODES.INTERNAL },
    );
  }

  if (!deleteResult.data) {
    return apiJsonError(404, "Ticket was not found.", {
      code: API_ERROR_CODES.NOT_FOUND,
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

  return NextResponse.json({ ok: true, ticketId: deleteResult.data.id });
}
