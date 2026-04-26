import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-1/4 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
        aria-hidden
      />

      <section className="relative mx-auto flex min-h-[100dvh] w-full min-w-0 max-w-3xl flex-col items-center justify-center px-[var(--app-page-px)] py-16 text-center">
        <span className="ui-chip ui-chip--brand-media mb-5">Error 404</span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          This page is lost in the cinema multiverse
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
          The link may be broken, moved, or never existed. Head back to a safe route and keep
          exploring.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="ui-btn ui-btn-primary auth-primary-glow px-5">
            Go to Home
          </Link>
          <Link href="/discover" className="ui-btn ui-btn-secondary px-5">
            Open Discover
          </Link>
        </div>
      </section>
    </main>
  );
}
