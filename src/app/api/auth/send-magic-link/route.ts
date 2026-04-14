import { NextRequest, NextResponse } from "next/server";
import { checkEmailCooldown } from "@/server/auth-email-rate-limit";
import {
  getResendClient,
  getResendFromEmail,
  getResendTestingTarget,
  isResendTestModeEnabled,
} from "@/server/resend";
import { getSupabaseAdminClient } from "@/server/supabase-admin";

function getAppUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json(
      { error: "Enter your email first so we know where to send the link." },
      { status: 400 },
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const resend = getResendClient();
  const fromEmail = getResendFromEmail();
  const resendTestMode = isResendTestModeEnabled();
  const resendTestTarget = getResendTestingTarget();

  if (!supabaseAdmin || !resend || !fromEmail) {
    return NextResponse.json(
      {
        error:
          "Magic link email is not configured yet. Add your Supabase service role key and Resend settings first.",
      },
      { status: 500 },
    );
  }

  const cooldown = checkEmailCooldown(`magic:${email}`);

  if (!cooldown.allowed) {
    return NextResponse.json(
      {
        error: `Please wait ${cooldown.retryAfterSeconds}s before sending another magic link.`,
        retryAfterSeconds: cooldown.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: `${getAppUrl(request)}/discover`,
    },
  });

  if (error || !data.properties.action_link) {
    return NextResponse.json({
      message:
        "If this email belongs to an account, a magic link is on the way.",
      retryAfterSeconds: cooldown.retryAfterSeconds,
    });
  }

  const magicLink = data.properties.action_link;
  const emailTarget = resendTestMode ? resendTestTarget : email;

  const { error: emailError } = await resend.emails.send({
    from: fromEmail,
    to: emailTarget,
    subject: "Your CineMatch magic link",
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f3ff;padding:32px 16px;color:#111827;">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:28px;padding:32px;border:1px solid rgba(124,58,237,0.10);box-shadow:0 18px 50px rgba(124,58,237,0.12);">
          <p style="margin:0 0 12px;color:#7c3aed;font-size:12px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;">CineMatch</p>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#111827;">Your magic login link</h1>
          ${
            resendTestMode
              ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#7c3aed;background:#f5f3ff;border-radius:16px;padding:10px 12px;">Testing mode is on. This email was redirected from ${email} to ${emailTarget}.</p>`
              : ""
          }
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#6b7280;">Tap below to sign in without typing your password.</p>
          <a href="${magicLink}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:18px;font-weight:700;">Sign in to CineMatch</a>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#9ca3af;">If the button does not open, copy and paste this link into your browser:</p>
          <p style="margin:8px 0 0;word-break:break-all;font-size:13px;line-height:1.7;color:#6b7280;">${magicLink}</p>
        </div>
      </div>
    `,
  });

  if (emailError) {
    return NextResponse.json(
      { error: "The magic link email could not be sent right now." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    message: resendTestMode
      ? `Testing mode is on. Your magic link email was sent to ${emailTarget} instead of ${email}.`
      : "A magic link is on the way. Check your inbox and spam folder.",
    retryAfterSeconds: cooldown.retryAfterSeconds,
  });
}
