"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/password-input";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const { login, isDarkMode } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const result = await login(email, password);

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError("");

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
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-between gap-6">
        <div className="space-y-6">
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
                  isDarkMode ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Browse, match, and build a shared watchlist with people you link to.
              </p>
            </div>
          </div>

          <SurfaceCard className="space-y-9">
            <div className="space-y-5">
              <p className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Sign in</p>
              <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                Welcome back. Continue to your movie lounge.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label
                className={`block space-y-2 text-sm font-medium ${
                  isDarkMode ? "text-slate-200" : "text-slate-700"
                }`}
              >
                Email
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className={`w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition ${
                    isDarkMode
                      ? "border-white/10 bg-white/8 text-white placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/10"
                      : "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white"
                  }`}
                />
              </label>
              <label
                className={`block space-y-2 text-sm font-medium ${
                  isDarkMode ? "text-slate-200" : "text-slate-700"
                }`}
              >
                Password
                <PasswordInput
                  name="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              {error ? (
                <p className="rounded-[18px] bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-[22px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(124,58,237,0.3)] transition hover:bg-violet-500"
              >
                {isSubmitting ? "Signing in..." : "Continue"}
              </button>
            </form>

            <p className={`pt-5 text-center text-sm ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
              New here?{" "}
              <Link href="/signup" className="font-semibold text-violet-600">
                Create an account
              </Link>
            </p>
          </SurfaceCard>
        </div>

        {!isSupabaseConfigured() ? (
          <SurfaceCard className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Demo access</p>
              <p className="text-sm leading-6 text-slate-500">
                Supabase keys are not set yet, so you can use `admin@cinematch.app`
                with `admin123` to explore the local demo app.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const result = await login("admin@cinematch.app", "admin123");

                if (result.ok) {
                  router.push("/discover");
                }
              }}
              className="w-full rounded-[22px] border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
            >
              Continue as Admin
            </button>
          </SurfaceCard>
        ) : null}
      </div>
    </div>
  );
}
