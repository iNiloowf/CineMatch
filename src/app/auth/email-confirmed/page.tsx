"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SurfaceCard } from "@/components/surface-card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearSignupPendingEmail } from "@/lib/signup-pending-email";
import { useAppState } from "@/lib/app-state";

export default function EmailConfirmedPage() {
  const { isDarkMode } = useAppState();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    clearSignupPendingEmail();
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => {
        setHasSession(false);
      });
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
  }, []);

  const pageBg = isDarkMode
    ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)]"
    : "bg-[linear-gradient(180deg,#f5f3ff_0%,#f8fafc_45%,#eef2ff_100%)]";

  return (
    <div
      className={`min-h-[100dvh] min-h-[100svh] px-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[max(2rem,env(safe-area-inset-top,0px))] ${pageBg}`}
    >
      <div className="mx-auto flex min-h-[min(100dvh,100svh)] max-w-md items-center justify-center">
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
              You&apos;re all set
            </h1>
            <p className={`text-sm leading-7 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Your email is verified and your CineMatch account is active. If you opened this link on the same device
              where you signed up, you may already be signed in—otherwise use your email and password on the sign-in
              page.
            </p>
          </div>
          {hasSession === null ? (
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Checking your session…</p>
          ) : (
            <>
              {hasSession ? (
                <p className={`rounded-[18px] px-4 py-3 text-sm leading-snug ${isDarkMode ? "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/25" : "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/80"}`}>
                  You&apos;re signed in on this device. Continue to Discover to start matching and saving picks.
                </p>
              ) : null}
              <div className="flex flex-col gap-3 pt-1">
                {hasSession ? (
                  <Link
                    href="/discover"
                    className={`inline-flex w-full items-center justify-center rounded-[22px] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(109,40,217,0.35)] ${
                      isDarkMode
                        ? "bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-700"
                        : "bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600"
                    }`}
                  >
                    Continue to Discover
                  </Link>
                ) : null}
                <Link
                  href="/"
                  className={`inline-flex w-full items-center justify-center rounded-[22px] border-2 px-4 py-3.5 text-sm font-semibold transition ${
                    hasSession
                      ? isDarkMode
                        ? "border-white/18 bg-white/5 text-slate-200 hover:bg-white/10"
                        : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      : isDarkMode
                        ? "border-violet-400/35 bg-white/5 text-violet-100 hover:border-violet-300/50 hover:bg-violet-500/12"
                        : "border-violet-300/90 bg-white/90 text-violet-800 hover:border-violet-400 hover:bg-violet-50"
                  }`}
                >
                  {hasSession ? "Open sign-in page" : "Sign in"}
                </Link>
              </div>
            </>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
