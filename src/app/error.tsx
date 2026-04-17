"use client";

import { useEffect } from "react";

type AppErrorProps = {
  error: Error & { digest?: string };
  unstable_retry: () => void;
};

export default function AppError({ error, unstable_retry }: AppErrorProps) {
  useEffect(() => {
    console.error("Route error boundary triggered:", error);
  }, [error]);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/30 blur-3xl"
        aria-hidden
      />
      <section className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col items-center justify-center px-6 py-14 text-center">
        <span className="ui-chip ui-chip--brand-media mb-5">App Error</span>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Something went wrong while loading this page
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Please try again. If the issue continues, come back later and we will fix it as soon as
          possible.
        </p>
        {error.digest ? (
          <p className="mt-4 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-slate-300">
            Ref: {error.digest}
          </p>
        ) : null}
        <button type="button" onClick={() => unstable_retry()} className="ui-btn ui-btn-primary mt-8 px-6">
          Try again
        </button>
      </section>
    </main>
  );
}
