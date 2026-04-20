"use client";

import { PrivacyPolicyDocumentBody } from "@/components/legal-policy-document-bodies";
import { useAppState } from "@/lib/app-state";

export default function PrivacyPolicyPage() {
  const { isDarkMode } = useAppState();
  const muted = isDarkMode ? "text-slate-400" : "text-slate-600";

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
          <p
            className={`text-xs font-semibold uppercase tracking-[0.2em] ${isDarkMode ? "text-violet-300" : "text-violet-600"}`}
          >
            CineMatch
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <p className={`mt-2 text-sm ${muted}`}>Last updated: April 2026</p>

          <div className="mt-6">
            <PrivacyPolicyDocumentBody isDarkMode={isDarkMode} />
          </div>
        </section>
      </div>
    </main>
  );
}
