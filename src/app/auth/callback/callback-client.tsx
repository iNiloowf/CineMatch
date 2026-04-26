"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SurfaceCard } from "@/components/surface-card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function parseHashParams(hash: string): URLSearchParams {
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
  return new URLSearchParams(normalized);
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<"working" | "error">("working");
  const [message, setMessage] = useState("Confirming your email…");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const supabase = getSupabaseBrowserClient();
  const urlError =
    searchParams.get("error_description") ?? searchParams.get("error") ?? "";

  useEffect(() => {
    if (!supabase) {
      return;
    }

    if (urlError) {
      queueMicrotask(() => {
        setPhase("error");
      });
      return;
    }

    const next = searchParams.get("next") || "/auth/email-confirmed";

    void (async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 280));

        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession.session) {
          router.replace(next);
          return;
        }

        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
        const type = url.searchParams.get("type");
        const hashParams = parseHashParams(window.location.hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code);
          if (result.error) {
            setError(result.error.message);
            setPhase("error");
            return;
          }
        } else if (tokenHash && type) {
          const result = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as
              | "signup"
              | "magiclink"
              | "recovery"
              | "invite"
              | "email_change"
              | "email",
          });
          if (result.error) {
            setError(result.error.message);
            setPhase("error");
            return;
          }
        } else if (accessToken && refreshToken) {
          const result = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (result.error) {
            setError(result.error.message);
            setPhase("error");
            return;
          }
        } else {
          const { data: retrySession } = await supabase.auth.getSession();
          if (!retrySession.session) {
            setError(
              "This confirmation link is missing or expired. Request a new confirmation email from the sign-up page, or sign in if you already confirmed.",
            );
            setPhase("error");
            return;
          }
        }

        router.replace(next);
      } catch (callbackError) {
        setError(
          callbackError instanceof Error
            ? callbackError.message
            : "We couldn’t finish the email confirmation.",
        );
        setPhase("error");
      }
    })();
  }, [attempt, router, searchParams, supabase, urlError]);

  const shellClass =
    "min-h-[100dvh] min-h-[100svh] bg-[linear-gradient(180deg,#f5f3ff_0%,#f8fafc_45%,#eef2ff_100%)] px-4 pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[max(2rem,env(safe-area-inset-top,0px))]";

  if (!supabase) {
    return (
      <div className={shellClass}>
        <div className="mx-auto flex min-h-[min(100dvh,100svh)] max-w-md items-center justify-center">
          <SurfaceCard className="w-full space-y-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-500">
              CineMatch
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Auth is unavailable
            </h1>
            <p className="text-sm leading-7 text-slate-500">
              Sign in again after the app auth settings are restored.
            </p>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Back to sign in
            </Link>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="mx-auto flex min-h-[min(100dvh,100svh)] max-w-md items-center justify-center">
        <SurfaceCard className="w-full space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-500">
            CineMatch
          </p>
          {phase === "error" || urlError ? (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">
                We hit a small issue
              </h1>
              <p className="text-sm leading-7 text-slate-500">
                {error || urlError}
              </p>
              <p className="rounded-[18px] bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                If your account was already confirmed, you can go back and sign in.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                {error && !urlError ? (
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white sm:w-auto"
                    onClick={() => {
                      setError("");
                      setMessage("Confirming your email…");
                      setPhase("working");
                      setAttempt((value) => value + 1);
                    }}
                  >
                    Try again
                  </button>
                ) : null}
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 sm:w-auto"
                >
                  Back to sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">Confirming…</h1>
              <p className="text-sm leading-7 text-slate-500">{message}</p>
            </>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
