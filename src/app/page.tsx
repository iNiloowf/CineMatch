"use client";

import Link from "next/link";
import { FormEvent, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/password-input";
import { SurfaceCard } from "@/components/surface-card";
import { LegalPolicyModal } from "@/components/legal-policy-modal";
import { useAppState } from "@/lib/app-state";
import { loginFormSchema, MIN_AUTH_PASSWORD_LEN } from "@/lib/auth-form-schemas";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type FieldErrors = {
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

export default function SignInPage() {
  const router = useRouter();
  const { login, isDarkMode, currentUserId, isReady } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [authError, setAuthError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);

  /**
   * Logged-in users on `/` must land on the app. `router.replace` is sometimes a no-op in
   * embedded WebViews and Capacitor, which leaves the “Opening your movie lounge…” screen forever.
   * A same-origin `location.replace` is reliable.
   */
  useLayoutEffect(() => {
    if (typeof window === "undefined" || !isReady || !currentUserId) {
      return;
    }
    const path = window.location.pathname;
    if (path !== "/" && path !== "") {
      return;
    }
    window.location.replace(new URL("/discover", window.location.origin).toString());
  }, [currentUserId, isReady]);

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

  const fieldHint = (message: string) => (
    <p
      className={`text-xs font-medium leading-snug ${
        isDarkMode ? "text-rose-300" : "text-rose-600"
      }`}
      role="alert"
    >
      {message}
    </p>
  );

  if (!isReady || currentUserId) {
    return (
      <div className={`auth-landing-stage ${pageBg}`}>
        <AuthLandingBlobs isDarkMode={isDarkMode} />
        <div className="relative z-[1] mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col items-center justify-center">
          <SurfaceCard className="auth-landing-stagger w-full text-center">
            <p
              className={`text-sm font-medium ${
                isDarkMode ? "text-slate-200" : "text-slate-600"
              }`}
            >
              Opening your movie lounge…
            </p>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setFieldErrors({
        email: flat.email?.[0],
        password: flat.password?.[0],
      });
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);

    const result = await login(parsed.data.email, parsed.data.password);

    setIsSubmitting(false);

    if (!result.ok) {
      setAuthError(result.message);
      return;
    }

    setAuthError("");

    if (result.shouldRedirect) {
      router.push("/discover");
    }
  };

  return (
    <div className={`auth-landing-stage ${pageBg}`}>
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
            <div className="space-y-3">
              <h1
                className={`text-[2rem] font-semibold tracking-tight ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                Sign in
              </h1>
              <p
                className={`text-sm leading-7 ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Browse, match, and build a shared watchlist with people you link to.
              </p>
            </div>
          </div>

          <SurfaceCard className="auth-landing-stagger auth-landing-stagger--2 space-y-8 !p-6 sm:!p-7">
            <div className="space-y-2">
              <p
                className={`text-lg font-semibold ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                Welcome back
              </p>
              <p
                className={`text-sm leading-relaxed ${
                  isDarkMode ? "text-slate-300" : "text-slate-600"
                }`}
              >
                Enter your email and password to continue.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="signin-email"
                  className={`block text-sm font-medium ${
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Email
                </label>
                <input
                  id="signin-email"
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

              <label className="block space-y-1.5">
                <span
                  className={`block text-sm font-medium ${
                    isDarkMode ? "text-slate-200" : "text-slate-700"
                  }`}
                >
                  Password
                </span>
                <PasswordInput
                  name="password"
                  placeholder="Your password"
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
              </label>

              {authError ? errorBanner(authError) : null}

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
                    {isSubmitting ? "Signing in…" : "Continue"}
                  </span>
                </button>

                <Link
                  href="/signup"
                  className={`block w-full rounded-[22px] border-2 px-4 py-3.5 text-center text-sm font-semibold transition ${
                    isDarkMode
                      ? "border-violet-400/35 bg-white/5 text-violet-100 hover:border-violet-300/50 hover:bg-violet-500/12"
                      : "border-violet-300/90 bg-white/70 text-violet-800 hover:border-violet-400 hover:bg-violet-50"
                  }`}
                >
                  Create an account
                </Link>
              </div>
            </form>
          </SurfaceCard>
        </div>

        {!isSupabaseConfigured() ? (
          <SurfaceCard className="auth-landing-stagger auth-landing-stagger--3 space-y-3 !p-5">
            <p
              className={`text-sm font-semibold ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Supabase not configured
            </p>
            <p
              className={`text-sm leading-6 ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              Add <span className="font-mono text-[0.8125rem]">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
              <span className="font-mono text-[0.8125rem]">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span>{" "}
              to your <span className="font-mono text-[0.8125rem]">.env.local</span> for hosted
              sign-in. Without them, only accounts created on this device in the same browser session
              can sign in locally.
            </p>
          </SurfaceCard>
        ) : null}

        <nav
          className={`auth-landing-stagger text-center text-[0.8125rem] ${
            isDarkMode ? "text-slate-500" : "text-slate-500"
          }`}
          aria-label="Legal"
        >
          <button
            type="button"
            onClick={() => setLegalModal("privacy")}
            className="underline-offset-2 hover:underline"
          >
            Privacy
          </button>
          <span className="mx-2 opacity-70" aria-hidden>
            ·
          </span>
          <button
            type="button"
            onClick={() => setLegalModal("terms")}
            className="underline-offset-2 hover:underline"
          >
            Terms
          </button>
        </nav>

        <LegalPolicyModal
          variant={legalModal}
          isDarkMode={isDarkMode}
          onClose={() => setLegalModal(null)}
        />
      </div>
    </div>
  );
}
