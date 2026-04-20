"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/password-input";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import { MIN_AUTH_PASSWORD_LEN, signupFormSchema } from "@/lib/auth-form-schemas";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

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

export default function SignUpPage() {
  const router = useRouter();
  const { signup, isDarkMode, currentUserId, isReady } = useAppState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const skipLoggedInRedirectRef = useRef(false);

  useEffect(() => {
    if (!isReady || !currentUserId) {
      return;
    }
    if (skipLoggedInRedirectRef.current) {
      return;
    }
    router.replace("/discover");
  }, [currentUserId, isReady, router]);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const pageBg = isDarkMode
    ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)]"
    : "bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.45),transparent_32%),linear-gradient(180deg,#fcfbff_0%,#f5f7ff_36%,#eef4ff_72%,#fef7ff_100%)]";

  const inputBase = (invalid: boolean) =>
    invalid
      ? isDarkMode
        ? "border-rose-400/55 bg-white/8 text-white ring-2 ring-rose-500/30 placeholder:text-slate-400 focus:border-rose-300 focus:bg-white/10"
        : "border-rose-300 bg-rose-50/80 text-slate-900 ring-2 ring-rose-200 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white"
      : isDarkMode
        ? "border-white/10 bg-white/8 text-white placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/10"
        : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white";

  const errorBanner = (message: string) => (
    <p
      role="alert"
      className={`rounded-[18px] px-4 py-3 text-sm font-medium ${
        isDarkMode
          ? "border border-rose-400/35 bg-rose-500/14 text-rose-100"
          : "border border-rose-200 bg-rose-50 text-rose-700"
      }`}
    >
      {message}
    </p>
  );

  const successBanner = (message: string) => (
    <p
      role="status"
      className={`rounded-[18px] px-4 py-3 text-sm font-medium ${
        isDarkMode
          ? "border border-emerald-400/35 bg-emerald-500/14 text-emerald-100"
          : "border border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {message}
    </p>
  );

  const fieldHint = (message: string) => (
    <p
      className={`text-xs font-medium leading-snug ${isDarkMode ? "text-rose-300" : "text-rose-600"}`}
      role="alert"
    >
      {message}
    </p>
  );

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
      setAuthError(payload.error ?? "We couldn’t send the confirmation email.");
      if (payload.retryAfterSeconds) {
        setResendCooldown(payload.retryAfterSeconds);
      }
      return false;
    }

    setAuthError("");
    setSuccess(
      payload.message ??
        "Your confirmation email is on the way. Open it to finish creating your account.",
    );
    setResendCooldown(payload.retryAfterSeconds ?? 60);
    return true;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setSuccess("");

    const parsed = signupFormSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        name: flat.name?.[0],
        email: flat.email?.[0],
        password: flat.password?.[0],
      });
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);

    if (isSupabaseConfigured()) {
      await sendSignupEmail();
      setIsSubmitting(false);
      return;
    }

    const result = await signup({
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setSuccess("");
      setAuthError(result.message);
      return;
    }

    setAuthError("");
    setFieldErrors({});

    if (result.shouldRedirect) {
      skipLoggedInRedirectRef.current = true;
      setSuccess(result.message ?? "Account created! Taking you to Discover…");
      window.setTimeout(() => {
        router.push("/discover");
      }, 1800);
      return;
    }

    setSuccess(
      result.message ??
        "Your account was created. Check your email to confirm it, then sign in.",
    );
  };

  const visitorAlreadySignedIn = Boolean(isReady && currentUserId && !skipLoggedInRedirectRef.current);

  if (!isReady || visitorAlreadySignedIn) {
    return (
      <div className={`auth-landing-stage min-h-screen px-4 py-8 ${pageBg}`}>
        <AuthLandingBlobs isDarkMode={isDarkMode} />
        <div className="relative z-[1] mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
          <SurfaceCard className="auth-landing-stagger w-full text-center">
            <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}>
              {!isReady ? "Loading…" : "Taking you to Discover…"}
            </p>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-landing-stage min-h-screen px-4 py-8 ${pageBg}`}>
      <AuthLandingBlobs isDarkMode={isDarkMode} />
      <div className="relative z-[1] mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-between gap-8">
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
            <div className="space-y-3">
              <h1
                className={`text-[2rem] font-semibold tracking-tight ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                Create your account
              </h1>
              <p className={`text-sm leading-7 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Match on movies, save picks, and build a shared watchlist with people you link to — same flow as sign
                in, one system.
              </p>
            </div>
          </div>

          <SurfaceCard className="auth-landing-stagger auth-landing-stagger--2 space-y-8 !p-6 sm:!p-7">
            <div className="space-y-2">
              <p className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Sign up</p>
              <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {isSupabaseConfigured()
                  ? "We will email you a confirmation link to finish setup."
                  : "Your account is stored in this browser only until Supabase is configured for hosted auth."}
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="signup-name"
                  className={`block text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
                >
                  Name
                </label>
                <input
                  id="signup-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, name: undefined }));
                    setAuthError("");
                  }}
                  placeholder="Your name"
                  aria-invalid={Boolean(fieldErrors.name) || undefined}
                  className={`w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition ${inputBase(Boolean(fieldErrors.name))}`}
                />
                {fieldErrors.name ? fieldHint(fieldErrors.name) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="signup-email"
                  className={`block text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
                >
                  Email
                </label>
                <input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    setAuthError("");
                  }}
                  onBlur={() => {
                    const t = email.trim();
                    if (!t) {
                      return;
                    }
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: "Enter a valid email address.",
                      }));
                    }
                  }}
                  placeholder="you@example.com"
                  aria-invalid={Boolean(fieldErrors.email) || undefined}
                  className={`w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition ${inputBase(Boolean(fieldErrors.email))}`}
                />
                {fieldErrors.email ? fieldHint(fieldErrors.email) : null}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="signup-password"
                  className={`block text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
                >
                  Password
                </label>
                <div
                  className={`rounded-[18px] border px-3 py-2.5 text-xs leading-relaxed ${
                    isDarkMode
                      ? "border-white/12 bg-white/[0.06] text-slate-300"
                      : "border-slate-200/90 bg-slate-50/95 text-slate-600"
                  }`}
                >
                  <p className={`font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                    Password rules
                  </p>
                  <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                    <li>At least {MIN_AUTH_PASSWORD_LEN} characters (required).</li>
                    <li>Mix letters and numbers when you can — harder to guess.</li>
                    <li>Avoid your name or email in the password.</li>
                  </ul>
                </div>
                <PasswordInput
                  id="signup-password"
                  name="password"
                  placeholder="Create a password"
                  value={password}
                  isDarkMode={isDarkMode}
                  invalid={Boolean(fieldErrors.password)}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    setAuthError("");
                  }}
                  onBlur={() => {
                    if (!password) {
                      return;
                    }
                    if (password.length < MIN_AUTH_PASSWORD_LEN) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: `Use at least ${MIN_AUTH_PASSWORD_LEN} characters.`,
                      }));
                    }
                  }}
                />
                {fieldErrors.password ? fieldHint(fieldErrors.password) : null}
              </div>

              {authError ? errorBanner(authError) : null}
              {success ? successBanner(success) : null}

              <div className="space-y-3 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`auth-primary-glow relative w-full rounded-[22px] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(109,40,217,0.35)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100 ${
                    isDarkMode
                      ? "bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-700"
                      : "bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600"
                  }`}
                >
                  <span className="relative z-[1]">
                    {isSubmitting
                      ? isSupabaseConfigured()
                        ? "Sending email…"
                        : "Creating account…"
                      : isSupabaseConfigured()
                        ? "Create account & send email"
                        : "Create account"}
                  </span>
                </button>

                <Link
                  href="/"
                  className={`block w-full rounded-[22px] border-2 px-4 py-3.5 text-center text-sm font-semibold transition ${
                    isDarkMode
                      ? "border-violet-400/35 bg-white/5 text-violet-100 hover:border-violet-300/50 hover:bg-violet-500/12"
                      : "border-violet-300/90 bg-white/70 text-violet-800 hover:border-violet-400 hover:bg-violet-50"
                  }`}
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </form>

            {success && isSupabaseConfigured() ? (
              <div
                className={`rounded-[24px] border px-4 py-4 ${
                  isDarkMode
                    ? "border-white/12 bg-white/[0.06] shadow-[0_14px_30px_rgba(0,0,0,0.2)]"
                    : "border-violet-100/90 bg-[linear-gradient(180deg,#faf7ff_0%,#f8fafc_100%)] shadow-[0_14px_30px_rgba(124,58,237,0.08)]"
                }`}
              >
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Need the email again?
                    </p>
                    <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      You can resend the confirmation email if it has not arrived yet.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div
                      className={`rounded-[18px] px-4 py-3 text-sm ${
                        isDarkMode ? "border border-white/10 bg-black/20" : "border border-slate-200/80 bg-white"
                      }`}
                    >
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                          isDarkMode ? "text-violet-300" : "text-violet-600"
                        }`}
                      >
                        Status
                      </p>
                      <p className={`mt-1 font-medium ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
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
                      className={`w-full shrink-0 rounded-[18px] border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                        isDarkMode
                          ? "border-violet-400/35 bg-violet-500/15 text-violet-100 hover:bg-violet-500/22"
                          : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
                      }`}
                    >
                      {resendCooldown > 0 ? `Try again in ${resendCooldown}s` : "Resend email"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
