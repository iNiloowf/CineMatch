"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  variant?: "embedded" | "global";
};

export function AppErrorScreen({ error, reset, variant = "embedded" }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const shell =
    variant === "global"
      ? "flex min-h-[100dvh] min-h-[100svh] flex-col items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
      : "flex min-h-[min(420px,70svh)] w-full max-w-md flex-col items-center justify-center";

  return (
    <div className={shell}>
      <div
        className="w-full rounded-[var(--radius-card)] border border-slate-200/90 bg-white/95 p-6 shadow-[var(--elev-card)] backdrop-blur-sm theme-dark:border-white/10 theme-dark:bg-slate-900/90 theme-dark:shadow-none"
        role="alert"
      >
        <h1 className="text-[length:var(--font-scale-title)] font-semibold text-slate-900 theme-dark:text-slate-50">
          Something went wrong
        </h1>
        <p className="mt-2 text-[length:var(--font-scale-body)] text-slate-600 theme-dark:text-slate-300">
          The app hit an unexpected error. You can try again or go back to browsing.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-slate-100/80 p-3 text-xs text-slate-800 theme-dark:bg-slate-800/80 theme-dark:text-slate-200">
            {error.message}
          </pre>
        )}
        {error.digest ? (
          <p className="mt-2 text-[length:var(--font-scale-meta)] text-slate-500 theme-dark:text-slate-400">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-[44px] min-w-[120px] items-center justify-center rounded-[var(--radius-button)] bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 theme-dark:bg-violet-500 theme-dark:hover:bg-violet-400"
          >
            Try again
          </button>
          <Link
            href="/discover"
            className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-button)] border border-slate-200 bg-white/80 px-4 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 theme-dark:border-white/15 theme-dark:bg-slate-800/80 theme-dark:text-slate-100 theme-dark:hover:bg-slate-800"
          >
            Discover
          </Link>
        </div>
      </div>
    </div>
  );
}
