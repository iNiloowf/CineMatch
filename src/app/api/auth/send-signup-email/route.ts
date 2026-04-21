import { NextRequest } from "next/server";
import { API_ERROR_CODES, apiJsonError, apiJsonOk } from "@/server/api-response";
import { checkEmailCooldown } from "@/server/auth-email-rate-limit";
import { parseJsonBody } from "@/server/api-validation";
import {
  getResendClient,
  getResendFromEmail,
  getResendTestingTarget,
  isResendTestModeEnabled,
} from "@/server/resend";
import { getSupabaseAdminClient } from "@/server/supabase-admin";
import { signupPasswordFieldSchema } from "@/lib/auth-form-schemas";
import { z } from "zod";

const sendSignupEmailBodySchema = z.object({
  name: z.string().trim().min(1, "Please fill in your name first."),
  email: z.string().trim().email("Please enter a valid email address."),
  password: signupPasswordFieldSchema,
});

function getAppUrl(request: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(request.url).origin
  );
}

export async function POST(request: NextRequest) {
  const parsedBody = await parseJsonBody(request, sendSignupEmailBodySchema);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }
  const body = parsedBody.data;

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  const supabaseAdmin = getSupabaseAdminClient();
  const resend = getResendClient();
  const fromEmail = getResendFromEmail();
  const resendTestMode = isResendTestModeEnabled();
  const resendTestTarget = getResendTestingTarget();

  if (!supabaseAdmin || !resend || !fromEmail) {
    return apiJsonError(
      500,
      "Email sending is not configured yet. Add your Supabase service role key and Resend settings first.",
      { code: API_ERROR_CODES.INTERNAL, request },
    );
  }

  const cooldown = checkEmailCooldown(`signup:${email}`);

  if (!cooldown.allowed) {
    return apiJsonError(
      429,
      `Please wait ${cooldown.retryAfterSeconds}s before sending another confirmation email.`,
      {
        code: API_ERROR_CODES.RATE_LIMITED,
        extra: { retryAfterSeconds: cooldown.retryAfterSeconds },
        request,
      },
    );
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      redirectTo: `${getAppUrl(request)}/auth/callback?next=${encodeURIComponent("/auth/email-confirmed")}`,
    },
  });

  if (error || !data.properties.action_link) {
    return apiJsonError(
      400,
      error?.message ?? "We couldn’t prepare your confirmation email right now.",
      { code: API_ERROR_CODES.BAD_REQUEST, request },
    );
  }

  const confirmationLink = data.properties.action_link;
  const emailTarget = resendTestMode ? resendTestTarget : email;

  const { error: emailError } = await resend.emails.send({
    from: fromEmail,
    to: emailTarget,
    subject: "Confirm your CineMatch account",
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f3ff;padding:32px 16px;color:#111827;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:28px;padding:32px;border:1px solid rgba(124,58,237,0.10);box-shadow:0 18px 50px rgba(124,58,237,0.12);">
          <p style="margin:0 0 12px;color:#7c3aed;font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;">CineMatch</p>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#111827;">Confirm your account</h1>
          ${
            resendTestMode
              ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#7c3aed;background:#f5f3ff;border-radius:16px;padding:10px 12px;">Testing mode is on. This email was redirected from ${email} to ${emailTarget}.</p>`
              : ""
          }
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#6b7280;">Hi ${name}, tap below to confirm your account and start matching movies.</p>
          <a href="${confirmationLink}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:18px;font-weight:700;">Confirm account</a>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#9ca3af;">If the button does not open, copy and paste this link into your browser:</p>
          <p style="margin:8px 0 0;word-break:break-all;font-size:13px;line-height:1.7;color:#6b7280;">${confirmationLink}</p>
        </div>
      </div>
    `,
  });

  if (emailError) {
    return apiJsonError(502, "The confirmation email could not be sent right now.", {
      code: API_ERROR_CODES.BAD_GATEWAY,
      request,
    });
  }

  return apiJsonOk(
    {
      message: resendTestMode
        ? `Testing mode is on. Your confirmation email was sent to ${emailTarget} instead of ${email}.`
        : "Your confirmation email is on the way. Open it to finish creating your account.",
      retryAfterSeconds: cooldown.retryAfterSeconds,
    },
    request,
  );
}
