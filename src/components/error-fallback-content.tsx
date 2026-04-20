"use client";

import Link from "next/link";

type ErrorFallbackContentProps = {
  onReset: () => void;
  errorDigest?: string;
  /** Shown in development to help debugging */
  errorMessage?: string;
};

/**
 * Shared layout for `app/error.tsx` and `app/global-error.tsx` — no app context,
 * safe when the provider tree failed.
 */
export function ErrorFallbackContent({
  onReset,
  errorDigest,
  errorMessage,
}: ErrorFallbackContentProps) {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div
      className="flex min-h-[100dvh] min-h-[100svh] flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.45),transparent_32%),linear-gradient(180deg,#fcfbff_0%,#f5f7ff_36%,#eef4ff_72%,#fef7ff_100%)] px-4 py-10 text-slate-900"
      role="alert"
    >
      <div className="w-full max-w-md space-y-5 rounded-[28px] border border-violet-200/90 bg-white/90 p-7 shadow-[0_24px_60px_rgba(124,58,237,0.12)] backdrop-blur-md">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-violet-600">
            CineMatch
          </p>
          <h1 className="text-xl font-semibold leading-snug text-slate-900">
            We couldn’t load this screen
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            A runtime error stopped this page. Use Try again to reload, or go back to sign in.
          </p>
        </div>

        {isDev && errorMessage ? (
          <pre className="max-h-32 overflow-auto rounded-2xl border border-rose-200/80 bg-rose-50/90 p-3 text-left text-xs leading-relaxed text-rose-900">
            {errorMessage}
          </pre>
        ) : null}

        {errorDigest ? (
          <p className="text-center font-mono text-[11px] text-slate-500">
            Reference: {errorDigest}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={onReset} className="ui-btn ui-btn-primary w-full sm:w-auto">
            Try again
          </button>
          <Link
            href="/"
            className="ui-btn ui-btn-secondary w-full text-center sm:w-auto"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
