import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export function getResendFromEmail() {
  return process.env.RESEND_FROM_EMAIL ?? "CineMatch <onboarding@resend.dev>";
}

export function getResendTestingTarget() {
  return process.env.RESEND_TEST_TO ?? "delivered@resend.dev";
}

export function isResendTestModeEnabled() {
  return process.env.RESEND_TEST_MODE === "true";
}
