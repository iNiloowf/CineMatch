"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SurfaceCard } from "@/components/surface-card";
import {
  clearSignupPendingEmail,
  readSignupPendingEmail,
  type SignupPendingPayload,
} from "@/lib/signup-pending-email";
import { useAppState } from "@/lib/app-state";

function AuthLandingBlobs({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={`auth-landing-blob -left-24 top-[-18%] h-[min(52vw,22rem)] w-[min(52vw,22rem)] ${
          isDarkMode
            ? "bg-[radial-gradient(circle_at_30%_30%,rgba(139,92,246,0.55),transparent_62%)]"
            : "bg-[radial-gradient(circle_at_30%_30%,rgba(167,139,250,0.5),transparent_62%)]"
        }`}
      />
      <div
        className={`auth-landing-blob auth-landing-blob--b right-[-20%] bottom-[-10%] h-[min(60vw,26rem)] w-[min(60vw,26rem)] ${
          isDarkMode
            ? "bg-[radial-gradient(circle_at_40%_40%,rgba(217,70,239,0.38),transparent_58%)]"
            : "bg-[radial-gradient(circle_at_40%_40%,rgba(192,132,252,0.45),transparent_58%)]"
        }`}
      />
    </div>
  );
}

export default function CheckEmailPage() {
  const router = useRouter();
  const { isDarkMode, currentUserId, isReady } = useAppState();
  const [pending, setPending] = useState<SignupPendingPayload | null | undefined>(undefined);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      setPending(readSignupPendingEmail());
    });
  }, []);

  useEffect(() => {
    if (!isReady || !currentUserId) {
      return;
    }
    router.replace("/discover");
  }, [currentUserId, isReady, router]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const t = window.setTimeout(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    const sec = pending?.resendCooldownSeconds;
    if (typeof sec === "number" && sec > 0) {
      queueMicrotask(() => {
        setResendCooldown(sec);
      });
    }
  }, [pending]);

  const sendSignupEmail = useCallback(async (payload: SignupPendingPayload) => {
    const response = await fetch("/api/auth/send-signup-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        publicHandle: payload.publicHandle,
        email: payload.email,
        password: payload.password,
      }),
    });

    const body = (await response.json()) as {
      message?: string;
      error?: string;
      retryAfterSeconds?: number;
    };

    if (!response.ok) {
      setSuccess("");
      setError(body.error ?? "We couldn’t send the confirmation email.");
      if (body.retryAfterSeconds) {
        setResendCooldown(body.retryAfterSeconds);
      }
      return false;
    }

    setError("");
    setSuccess(
      body.message ?? "Another confirmation email is on the way. Check your inbox (and spam).",
    );
    setResendCooldown(body.retryAfterSeconds ?? 60);
    return true;
  }, []);

  const pageBg = isDarkMode
    ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)]"
    : "bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.45),transparent_32%),linear-gradient(180deg,#fcfbff_0%,#f5f7ff_36%,#eef4ff_72%,#fef7ff_100%)]";

  if (pending === undefined) {
    return (
      <div className={`auth-landing-stage relative ${pageBg}`}>
        <AuthLandingBlobs isDarkMode={isDarkMode} />
        <div className="relative z-[1] mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col items-center justify-center">
          <SurfaceCard className="w-full text-center">
            <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}>Loading…</p>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  if (!pending) {
    return (
      <div className={`auth-landing-stage relative ${pageBg}`}>
        <AuthLandingBlobs isDarkMode={isDarkMode} />
        <div className="relative z-[1] mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col justify-center gap-6">
          <SurfaceCard
            className={`w-full space-y-5 text-center ${
              isDarkMode ? "border-white/12 bg-slate-950/80 text-slate-100" : ""
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-[0.28em] ${
                isDarkMode ? "text-violet-300" : "text-violet-600"
              }`}
            >
              CineMatch
            </p>
            <div className="space-y-2">
              <h1 className={`text-2xl font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Start from sign up
              </h1>
              <p className={`text-sm leading-7 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                This page opens after you create an account and we send your confirmation email. If you closed that
                tab, go back to sign up and submit the form again—we never received a pending sign-up on this device.
              </p>
            </div>
            <Link
              href="/signup"
              className={`inline-flex w-full items-center justify-center rounded-[22px] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(109,40,217,0.35)] ${
                isDarkMode
                  ? "bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-700"
                  : "bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600"
              }`}
            >
              Go to sign up
            </Link>
            <Link
              href="/"
              className={`block w-full rounded-[22px] border-2 px-4 py-3.5 text-center text-sm font-semibold transition ${
                isDarkMode
                  ? "border-violet-400/35 bg-white/5 text-violet-100 hover:border-violet-300/50 hover:bg-violet-500/12"
                  : "border-violet-300/90 bg-white/70 text-violet-800 hover:border-violet-400 hover:bg-violet-50"
              }`}
            >
              Sign in instead
            </Link>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  const emailDisplay = pending.email.trim() || "your inbox";

  return (
    <div className={`auth-landing-stage relative ${pageBg}`}>
      <AuthLandingBlobs isDarkMode={isDarkMode} />
      <div className="relative z-[1] mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col justify-between gap-8">
        <div className="space-y-6">
          <div
            className={`auth-landing-stagger space-y-3 rounded-[34px] p-6 backdrop-blur-xl ${
              isDarkMode
                ? "border border-white/12 bg-white/[0.09] shadow-[0_30px_80px_rgba(0,0,0,0.38)]"
                : "border border-white/85 bg-white/82 shadow-[0_30px_80px_rgba(123,97,188,0.16)]"
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-[0.28em] ${
                isDarkMode ? "text-violet-300" : "text-violet-600"
              }`}
            >
              CineMatch
            </p>
            <div className="space-y-2">
              <h1 className={`text-[1.65rem] font-semibold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Check your email
              </h1>
              <p className={`text-sm leading-7 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                One more step: we sent a secure link to{" "}
                <span className="font-semibold text-inherit">{emailDisplay}</span>. Open the message on this phone or
                computer and tap <strong className="font-semibold">Confirm</strong> to activate your CineMatch account.
              </p>
            </div>
          </div>

          <SurfaceCard className="auth-landing-stagger auth-landing-stagger--2 space-y-6 !p-6 sm:!p-7">
            <div className="space-y-2 text-center sm:text-left">
              <p
                className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                  isDarkMode ? "text-violet-300" : "text-violet-600"
                }`}
              >
                Confirm your address
              </p>
              <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                The link expires after a while for your security. Didn&apos;t get anything? Check spam and promotions,
                then use resend below. You can also use a different email if you made a typo.
              </p>
            </div>

            {success ? (
              <p
                role="status"
                className={`rounded-[18px] px-4 py-3 text-sm font-medium ${
                  isDarkMode
                    ? "border border-emerald-400/35 bg-emerald-500/14 text-emerald-100"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {success}
              </p>
            ) : null}
            {error ? (
              <p
                role="alert"
                className={`rounded-[18px] px-4 py-3 text-sm font-medium ${
                  isDarkMode
                    ? "border border-rose-400/35 bg-rose-500/14 text-rose-100"
                    : "border border-rose-200 bg-rose-50 text-rose-700"
                }`}
              >
                {error}
              </p>
            ) : null}

            <div
              className={`rounded-[22px] border px-4 py-4 ${
                isDarkMode
                  ? "border-white/12 bg-white/[0.06]"
                  : "border-violet-100/90 bg-[linear-gradient(180deg,#faf7ff_0%,#f8fafc_100%)]"
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                  isDarkMode ? "text-violet-300" : "text-violet-600"
                }`}
              >
                Resend confirmation
              </p>
              <p className={`mt-2 text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {resendCooldown > 0
                  ? `You can send another email in ${resendCooldown} seconds.`
                  : "You can send a fresh confirmation email now."}
              </p>
              <button
                type="button"
                disabled={resendCooldown > 0 || isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true);
                  await sendSignupEmail(pending);
                  setIsSubmitting(false);
                }}
                className={`mt-4 w-full rounded-[18px] border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  isDarkMode
                    ? "border-violet-400/35 bg-violet-500/15 text-violet-100 hover:bg-violet-500/22"
                    : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
                }`}
              >
                {isSubmitting
                  ? "Sending…"
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend confirmation email"}
              </button>
            </div>

            <div className="flex flex-col gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  clearSignupPendingEmail();
                  router.push("/signup");
                }}
                className={`w-full rounded-[22px] border-2 px-4 py-3.5 text-sm font-semibold transition ${
                  isDarkMode
                    ? "border-white/18 bg-white/5 text-slate-200 hover:bg-white/10"
                    : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                Use a different email
              </button>
              <Link
                href="/"
                className={`block w-full rounded-[22px] border-2 px-4 py-3.5 text-center text-sm font-semibold transition ${
                  isDarkMode
                    ? "border-violet-400/35 bg-white/5 text-violet-100 hover:border-violet-300/50 hover:bg-violet-500/12"
                    : "border-violet-300/90 bg-white/70 text-violet-800 hover:border-violet-400 hover:bg-violet-50"
                }`}
              >
                Already confirmed? Sign in
              </Link>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
