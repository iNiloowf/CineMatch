"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/password-input";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const { signup, isDarkMode } = useAppState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function sendSignupEmail() {
    const response = await fetch("/api/auth/send-signup-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
        password,
      }),
    });

    const payload = (await response.json()) as {
      message?: string;
      error?: string;
      retryAfterSeconds?: number;
    };

    if (!response.ok) {
      setSuccess("");
      setError(payload.error ?? "We couldn’t send the confirmation email.");
      if (payload.retryAfterSeconds) {
        setResendCooldown(payload.retryAfterSeconds);
      }
      return false;
    }

    setError("");
    setSuccess(
      payload.message ??
        "Your confirmation email is on the way. Open it to finish creating your account.",
    );
    setResendCooldown(payload.retryAfterSeconds ?? 60);
    return true;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (isSupabaseConfigured()) {
      await sendSignupEmail();
      setIsSubmitting(false);
      return;
    }

    const result = await signup({
      name,
      email,
      password,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setSuccess("");
      setError(result.message);
      return;
    }

    setError("");
    setSuccess(result.message ?? "");

    if (result.shouldRedirect) {
      router.push("/discover");
    }
  };

  return (
    <div
      className={`min-h-screen px-4 py-8 ${
        isDarkMode
          ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)]"
          : "bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.5),transparent_28%),linear-gradient(180deg,#fcfbff_0%,#f5f7ff_36%,#eef4ff_72%,#fef7ff_100%)]"
      }`}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center gap-6">
        <div
          className={`space-y-3 rounded-[34px] p-6 backdrop-blur-xl ${
            isDarkMode
              ? "border border-white/10 bg-white/8 shadow-[0_30px_80px_rgba(0,0,0,0.3)]"
              : "border border-white/80 bg-white/80 shadow-[0_30px_80px_rgba(123,97,188,0.14)]"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-500">
            CineMatch
          </p>
          <div className="space-y-2">
            <h1 className={`text-4xl font-semibold tracking-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Create your account.
            </h1>
            <p className={`text-sm leading-7 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
              Start matching movies, building picks, and sharing watchlists.
            </p>
          </div>
        </div>

        <SurfaceCard className="space-y-7">
          <div className="space-y-3">
            <p className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Sign up</p>
            <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
              Make your profile and start swiping.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className={`block space-y-4 text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
              Name
              <input
                name="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className={`w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-white/8 text-white placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/10"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white"
                }`}
              />
            </label>
            <label className={`block space-y-4 text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
              Email
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={`w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition ${
                  isDarkMode
                    ? "border-white/10 bg-white/8 text-white placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/10"
                    : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white"
                }`}
              />
            </label>
            <label className={`block space-y-4 text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
              Password
              <PasswordInput
                name="password"
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error ? (
              <p className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-600">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[22px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(124,58,237,0.3)] transition hover:bg-violet-500"
            >
              {isSubmitting
                ? "Creating account..."
                : isSupabaseConfigured()
                  ? "Create account and send email"
                  : "Create account"}
            </button>
          </form>

          {success && isSupabaseConfigured() ? (
            <div
              className={`rounded-[24px] px-4 py-4 ${
                isDarkMode
                  ? "border border-white/10 bg-white/6 shadow-[0_14px_30px_rgba(0,0,0,0.2)]"
                  : "border border-violet-100 bg-[linear-gradient(180deg,#faf7ff_0%,#f8fafc_100%)] shadow-[0_14px_30px_rgba(124,58,237,0.08)]"
              }`}
            >
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Need the email again?
                  </p>
                  <p className="text-sm leading-6 text-slate-500">
                    You can resend the confirmation email if it has not arrived yet.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className={`rounded-[18px] px-4 py-3 text-sm ${isDarkMode ? "bg-white/8" : "bg-white"}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
                      Status
                    </p>
                    <p className="mt-1 font-medium text-slate-700">
                      {resendCooldown > 0
                        ? `You can request another email in ${resendCooldown} seconds.`
                        : "You can request another email now."}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isSubmitting}
                    onClick={async () => {
                      setIsSubmitting(true);
                      await sendSignupEmail();
                      setIsSubmitting(false);
                    }}
                    className="w-full shrink-0 rounded-[18px] border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {resendCooldown > 0
                      ? `Try again in ${resendCooldown}s`
                      : "Resend email"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

            <p className={`pt-4 text-center text-sm ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
              Already have an account?{" "}
              <Link href="/" className="font-semibold text-violet-600">
                Sign in
            </Link>
          </p>
        </SurfaceCard>
      </div>
    </div>
  );
}
