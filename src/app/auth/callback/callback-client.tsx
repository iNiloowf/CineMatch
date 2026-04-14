"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SurfaceCard } from "@/components/surface-card";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Finishing your sign-in...");
  const [error, setError] = useState("");
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
  }, [router, searchParams, supabase, urlError]);

  if (!supabase) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f5f3ff_0%,#f8fafc_45%,#eef2ff_100%)] px-4 py-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#f5f3ff_0%,#f8fafc_45%,#eef2ff_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center">
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
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
              >
                Back to sign in
              </Link>
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
