"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SurfaceCard } from "@/components/surface-card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finishing your sign-in...");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const supabase = getSupabaseBrowserClient();
  const urlError =
    searchParams.get("error_description") ?? searchParams.get("error") ?? "";

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const next = searchParams.get("next") || "/discover";
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (urlError) {
      return;
    }

    void (async () => {
      try {
        if (code) {
          const result = await supabase.auth.exchangeCodeForSession(code);

          if (result.error) {
            setError(result.error.message);
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
            return;
          }
        }

        setMessage("Your email is confirmed. Taking you back into CineMatch...");
        window.setTimeout(() => {
          router.replace(next);
        }, 900);
      } catch (callbackError) {
        setError(
          callbackError instanceof Error
            ? callbackError.message
            : "We couldn’t finish the email confirmation.",
        );
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
          {error || urlError ? (
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
                      setMessage("Finishing your sign-in...");
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
              <h1 className="text-2xl font-semibold text-slate-900">
                Email confirmed
              </h1>
              <p className="text-sm leading-7 text-slate-500">{message}</p>
            </>
          )}
        </SurfaceCard>
      </div>
    </div>
  );
}
