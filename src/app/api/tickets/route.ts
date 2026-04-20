import { NextRequest, NextResponse } from "next/server";
import { API_ERROR_CODES, apiJsonError } from "@/server/api-response";
import { clientIp, checkRateLimit } from "@/server/rate-limit";
import { parseJsonBody } from "@/server/api-validation";
import { logSecurityAudit } from "@/server/security-audit";
import {
  getResendClient,
  getResendFromEmail,
  getResendTestingTarget,
  isResendTestModeEnabled,
} from "@/server/resend";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { verifyBearerFromRequest } from "@/server/supabase-auth-verify";
import { z } from "zod";

type TicketPriority = "low" | "normal" | "high";

const TICKET_WINDOW_MS = 10 * 60 * 1000;
const TICKET_MAX = 10;
const createTicketBodySchema = z.object({
  subject: z.string().trim().min(1, "Subject is required.").max(200),
  message: z.string().trim().min(1, "Message is required.").max(5000),
  priority: z.enum(["low", "normal", "high"]).optional(),
});

type TicketProfileLookup = {
  email: string | null;
  full_name: string | null;
};

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

function buildTicketAcknowledgementHtml({
  displayName,
  ticketId,
}: {
  displayName: string;
  ticketId: string;
}) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f3ff;padding:32px 16px;color:#111827;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:28px;padding:32px;border:1px solid rgba(124,58,237,0.10);box-shadow:0 18px 50px rgba(124,58,237,0.12);">
        <p style="margin:0 0 12px;color:#7c3aed;font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;">CineMatch Support</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#111827;">We received your ticket</h1>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#6b7280;">Hi ${displayName}, your support request was submitted successfully.</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#4b5563;">Ticket ID: <strong>${ticketId}</strong></p>
        <p style="margin:0;font-size:15px;line-height:1.7;color:#6b7280;">Our admin team will reply to this email within 24 hours.</p>
      </div>
    </div>
  `;
}

function buildAdminTicketNotificationHtml({
  ticketId,
  userName,
  userEmail,
  subject,
  priority,
  message,
}: {
  ticketId: string;
  userName: string;
  userEmail: string;
  subject: string;
  priority: TicketPriority;
  message: string;
}) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f3ff;padding:32px 16px;color:#111827;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:28px;padding:32px;border:1px solid rgba(124,58,237,0.10);box-shadow:0 18px 50px rgba(124,58,237,0.12);">
        <p style="margin:0 0 12px;color:#7c3aed;font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;">CineMatch Admin Alert</p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#111827;">New support ticket opened</h1>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b5563;">Ticket ID: <strong>${ticketId}</strong></p>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b5563;">User: <strong>${userName}</strong> (${userEmail || "no-email"})</p>
        <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#4b5563;">Priority: <strong>${priority}</strong></p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#4b5563;">Subject: <strong>${subject}</strong></p>
        <div style="border:1px solid rgba(15,23,42,0.08);border-radius:14px;padding:12px 14px;background:#fafafa;">
          <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;white-space:pre-wrap;">${message}</p>
        </div>
      </div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  const authToken = await verifyBearerFromRequest(request);

  if (!authToken) {
    return apiJsonError(401, "You need to be logged in to submit a ticket.", {
      code: API_ERROR_CODES.UNAUTHORIZED,
    });
  }

  const submitRate = checkRateLimit({
    key: `ticket:submit:${authToken.userId}`,
    max: TICKET_MAX,
    windowMs: TICKET_WINDOW_MS,
  });

  if (!submitRate.ok) {
    return apiJsonError(429, "Too many ticket requests. Please try again shortly.", {
      code: API_ERROR_CODES.RATE_LIMITED,
      headers: { "Retry-After": String(submitRate.retryAfterSec) },
    });
  }

  const supabaseAdmin = getSupabaseAdminClient();

  if (!supabaseAdmin) {
    return apiJsonError(
      500,
      "Ticket service is not configured on the server yet.",
      { code: API_ERROR_CODES.INTERNAL },
    );
  }

  const parsedBody = await parseJsonBody(request, createTicketBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const subject = parsedBody.data.subject.trim();
  const message = parsedBody.data.message.trim();
  const priority: TicketPriority = parsedBody.data.priority ?? "normal";

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
      return apiJsonError(
        503,
        "Support tickets are not initialized yet. Please run the latest database migration.",
        { code: API_ERROR_CODES.SERVICE_UNAVAILABLE },
      );
    }
    return apiJsonError(
      500,
      ticketResult.error?.message ?? "Ticket could not be created.",
      { code: API_ERROR_CODES.INTERNAL },
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

  const resend = getResendClient();
  const fromEmail = getResendFromEmail();
  const resendTestMode = isResendTestModeEnabled();
  const resendTestTarget = getResendTestingTarget();
  const adminTicketAlertTarget = (
    process.env.ADMIN_TICKET_ALERT_EMAIL ??
    process.env.ADMIN_DASHBOARD_EMAIL ??
    ""
  )
    .trim()
    .toLowerCase();
  let acknowledgementEmailSent = false;
  let adminNotificationEmailSent = false;

  if (resend && fromEmail) {
    const profileResult = (await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", authToken.userId)
      .maybeSingle()) as {
      data: TicketProfileLookup | null;
      error: { message?: string } | null;
    };

    let rawEmail = profileResult.data?.email?.trim().toLowerCase() ?? "";
    if (!rawEmail) {
      const authUserResult = await supabaseAdmin.auth.getUser(authToken.accessToken);
      rawEmail = authUserResult.data.user?.email?.trim().toLowerCase() ?? "";
    }
    const targetEmail = resendTestMode ? resendTestTarget : rawEmail;
    const displayName = profileResult.data?.full_name?.trim() || "there";

    if (targetEmail) {
      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: targetEmail,
        subject: "We received your CineMatch support ticket",
        html: buildTicketAcknowledgementHtml({
          displayName,
          ticketId: ticketResult.data.id,
        }),
      });

      if (!emailError) {
        acknowledgementEmailSent = true;
      } else {
        void logSecurityAudit({
          action: "support_ticket_ack_email_failed",
          actorUserId: authToken.userId,
          ip: clientIp(request),
          metadata: {
            ticketId: ticketResult.data.id,
            reason: emailError.message,
          },
        });
      }
    }

    const adminTargetEmail = resendTestMode ? resendTestTarget : adminTicketAlertTarget;
    if (adminTargetEmail) {
      const { error: adminEmailError } = await resend.emails.send({
        from: fromEmail,
        to: adminTargetEmail,
        subject: `[CineMatch] New support ticket (${priority})`,
        html: buildAdminTicketNotificationHtml({
          ticketId: ticketResult.data.id,
          userName: displayName,
          userEmail: rawEmail,
          subject,
          priority,
          message,
        }),
      });

      if (!adminEmailError) {
        adminNotificationEmailSent = true;
      } else {
        void logSecurityAudit({
          action: "support_ticket_admin_email_failed",
          actorUserId: authToken.userId,
          ip: clientIp(request),
          metadata: {
            ticketId: ticketResult.data.id,
            reason: adminEmailError.message,
          },
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    ticketId: ticketResult.data.id,
    acknowledgementEmailSent,
    adminNotificationEmailSent,
  });
}
