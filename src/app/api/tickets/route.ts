import { NextRequest, NextResponse } from "next/server";
import { clientIp, checkRateLimit } from "@/server/rate-limit";
import { logSecurityAudit } from "@/server/security-audit";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";

type TicketPriority = "low" | "normal" | "high";

const TICKET_WINDOW_MS = 10 * 60 * 1000;
const TICKET_MAX = 10;

function normalizePriority(value: string | undefined): TicketPriority {
  if (value === "low" || value === "high") {
    return value;
  }
  return "normal";
}

function isMissingSupportTicketsError(error: { message?: string; code?: string } | null) {
  if (!error) {
    return false;
  }
  const normalized = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (normalized.includes("support_tickets") &&
      normalized.includes("schema cache"))
  );
}

export async function POST(request: NextRequest) {
  const authToken = await verifyBearerFromRequest(request);

  if (!authToken) {
    return NextResponse.json(
      { error: "You need to be logged in to submit a ticket." },
      { status: 401 },
    );
  }

  const submitRate = checkRateLimit({
    key: `ticket:submit:${authToken.userId}`,
    max: TICKET_MAX,
    windowMs: TICKET_WINDOW_MS,
  });

  if (!submitRate.ok) {
    return NextResponse.json(
      { error: "Too many ticket requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(submitRate.retryAfterSec) },
      },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Ticket service is not configured on the server yet." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    subject?: string;
    message?: string;
    priority?: string;
  };
  const subject = (body.subject ?? "").trim();
  const message = (body.message ?? "").trim();
  const priority = normalizePriority(body.priority);

  if (!subject || !message) {
    return NextResponse.json(
      { error: "Subject and message are required." },
      { status: 400 },
    );
  }

  const ticketResult = (await supabaseAdmin
    .from("support_tickets")
    .insert({
      user_id: authToken.userId,
      subject,
      message,
      priority,
      status: "open",
    } as never)
    .select("id")
    .single()) as {
    data: { id: string } | null;
    error: { message?: string } | null;
  };

  if (ticketResult.error || !ticketResult.data) {
    if (isMissingSupportTicketsError(ticketResult.error)) {
      return NextResponse.json(
        {
          error:
            "Support tickets are not initialized yet. Please run the latest database migration.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: ticketResult.error?.message ?? "Ticket could not be created." },
      { status: 500 },
    );
  }

  void logSecurityAudit({
    action: "support_ticket_create",
    actorUserId: authToken.userId,
    ip: clientIp(request),
    metadata: {
      ticketId: ticketResult.data.id,
      priority,
      subjectLength: subject.length,
      messageLength: message.length,
    },
  });

  return NextResponse.json({ ok: true, ticketId: ticketResult.data.id });
}
