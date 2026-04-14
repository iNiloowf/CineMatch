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
  const { signup } = useAppState();
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f3ff_0%,#f8fafc_45%,#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center gap-6">
        <div className="space-y-3 rounded-[34px] border border-white/65 bg-white/75 p-6 shadow-[0_30px_80px_rgba(123,97,188,0.16)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-500">
            CineMatch
          </p>
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
              Create your account.
            </h1>
            <p className="text-sm leading-7 text-slate-500">
              Start matching movies, building picks, and sharing watchlists.
            </p>
          </div>
        </div>

        <SurfaceCard className="space-y-5">
          <div className="space-y-1">
            <p className="text-lg font-semibold text-slate-900">Sign up</p>
            <p className="text-sm text-slate-500">
              Make your profile and start swiping.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              Name
              <input
                name="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
              />
            </label>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              Email
              <input
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
              />
            </label>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
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
            <div className="rounded-[20px] bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Need the email again?
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    You can resend the confirmation email if it did not arrive yet.
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
                  className="shrink-0 rounded-[18px] border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend email"}
                </button>
              </div>
            </div>
          ) : null}

          <p className="text-center text-sm text-slate-500">
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
