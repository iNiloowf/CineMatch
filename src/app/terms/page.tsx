"use client";

import { useAppState } from "@/lib/app-state";

export default function TermsOfServicePage() {
  const { isDarkMode } = useAppState();

  return (
    <main
      className={`min-h-screen px-4 py-10 ${
        isDarkMode
          ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)] text-slate-100"
          : "bg-[linear-gradient(180deg,#f8f7ff_0%,#eff3ff_100%)] text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-3xl">
        <section
          className={`rounded-[28px] border p-6 sm:p-8 ${
            isDarkMode ? "border-white/12 bg-slate-950/75" : "border-slate-200 bg-white"
          }`}
        >
          <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDarkMode ? "text-violet-300" : "text-violet-600"}`}>
            CineMatch
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            Last updated: April 2026
          </p>

          <div className="mt-6 space-y-5 text-sm leading-7">
            <section>
              <h2 className="text-base font-semibold">Using the app</h2>
              <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                Use CineMatch lawfully. Do not abuse features, spam users, or try to access data
                you do not own.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold">Accounts</h2>
              <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                You are responsible for your account activity and keeping your login secure.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold">Availability</h2>
              <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                We aim for reliable service, but features can change and uptime is not guaranteed.
              </p>
            </section>
            <section>
              <h2 className="text-base font-semibold">Enforcement</h2>
              <p className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                Accounts may be restricted or removed for misuse or policy violations.
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
