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
  const { login } = useAppState();
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f3ff_0%,#f8fafc_45%,#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-between gap-6">
        <div className="space-y-6">
          <div className="space-y-3 rounded-[34px] border border-white/65 bg-white/75 p-6 shadow-[0_30px_80px_rgba(123,97,188,0.16)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-500">
              CineMatch
            </p>
            <div className="space-y-3">
              <h1 className="text-[2rem] font-semibold tracking-tight text-slate-900">
                Sign in
              </h1>
              <p className="text-sm leading-7 text-slate-500">
                Browse, match, and build a shared watchlist with people you link to.
              </p>
            </div>
          </div>

          <SurfaceCard className="space-y-5">
            <div className="space-y-1">
              <p className="text-lg font-semibold text-slate-900">Sign in</p>
              <p className="text-sm text-slate-500">
                Welcome back. Continue to your movie lounge.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
                />
              </label>
              <label className="block space-y-2 text-sm font-medium text-slate-700">
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

            <p className="text-center text-sm text-slate-500">
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
