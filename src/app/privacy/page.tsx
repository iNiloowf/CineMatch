"use client";

import Link from "next/link";
import { useAppState } from "@/lib/app-state";

export default function PrivacyPolicyPage() {
  const { isDarkMode } = useAppState();
  const p = isDarkMode ? "text-slate-300" : "text-slate-700";
  const muted = isDarkMode ? "text-slate-400" : "text-slate-600";
  const strong = isDarkMode ? "font-semibold text-slate-100" : "font-semibold text-slate-900";
  const h2 = `mt-8 text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`;
  const ul = `mt-2 list-inside list-disc space-y-1.5 ${p}`;

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

          <div className="mt-6 space-y-1 text-sm leading-7">
            <p className={p}>
              This Privacy Policy describes how CineMatch (“we,” “us,” or “our”) handles personal information when you
              use our website, mobile apps, and related services (together, the “Service”). By using the Service, you
              agree to this policy together with our{" "}
              <Link href="/terms" className="font-semibold underline underline-offset-2 hover:opacity-90">
                Terms of Service
              </Link>
              .
            </p>

            <h2 className={h2}>1. Who we are</h2>
            <p className={p}>
              CineMatch is a movie discovery and social watchlist product. Depending on how you access the Service, data
              may be processed by us and by trusted infrastructure providers described below.
            </p>

            <h2 className={h2}>2. Information we collect</h2>
            <p className={p}>We collect information that falls into these categories:</p>
            <ul className={ul}>
              <li>
                <span className={strong}>Account and profile.</span> Name, email address, password
                (stored in hashed form by our authentication provider), profile details you choose to add (such as
                display name, city, or profile photo), and app settings (for example appearance or notification
                preferences).
              </li>
              <li>
                <span className={strong}>Usage and activity.</span> Actions you take in the app,
                such as movies you save, swipe or match activity, items on your lists, friend connections and invites,
                and timestamps needed to sync your account across devices.
              </li>
              <li>
                <span className={strong}>Technical data.</span> IP address, device or browser type,
                approximate region from IP, diagnostic logs, and security-related identifiers. We use these to operate,
                secure, and improve the Service.
              </li>
              <li>
                <span className={strong}>Support communications.</span> Information you send when
                you contact us (for example email content).
              </li>
            </ul>
            <p className={`mt-3 ${muted}`}>
              Movie metadata (titles, posters, descriptions) is provided by third-party databases such as TMDB. That
              content is not “your” personal data, but viewing or saving titles may be associated with your account as
              usage activity.
            </p>

            <h2 className={h2}>3. How we use information</h2>
            <p className={p}>We use personal information to:</p>
            <ul className={ul}>
              <li>Create and maintain your account and authenticate you.</li>
              <li>Provide core features: discovery, picks, shared lists, friend linking, invites, and sync.</li>
              <li>Protect the Service, detect abuse, enforce limits, and comply with law.</li>
              <li>Improve reliability, fix bugs, and understand aggregate usage trends.</li>
              <li>Communicate with you about the Service (for example security or policy notices).</li>
            </ul>

            <h2 className={h2}>4. Legal bases (EEA, UK, Switzerland)</h2>
            <p className={p}>
              Where GDPR-style laws apply, we rely on: performance of a contract (providing the Service); legitimate
              interests (security, product improvement, fraud prevention), balanced against your rights; consent where
              required (for example optional communications or non-essential cookies, if we use them); and legal
              obligations where applicable.
            </p>

            <h2 className={h2}>5. Sharing and subprocessors</h2>
            <p className={p}>
              We do not sell your personal information. We share data only as needed to run the Service, including with:
            </p>
            <ul className={ul}>
              <li>
                <span className={strong}>Supabase</span> (or equivalent) for authentication,
                database storage, and file storage for assets such as profile images, under their terms and security
                practices.
              </li>
              <li>
                <span className={strong}>Hosting and infrastructure</span> providers that serve our
                application and API.
              </li>
              <li>
                <span className={strong}>Movie data providers</span> (e.g. TMDB) for catalog
                content; requests may include technical identifiers required by those APIs.
              </li>
            </ul>
            <p className={`mt-3 ${p}`}>
              We may also disclose information if required by law, to protect rights and safety, or as part of a merger
              or acquisition (with notice where appropriate).
            </p>

            <h2 className={h2}>6. Retention</h2>
            <p className={p}>
              We keep personal information only as long as needed for the purposes above: for example, while your account
              is active, plus a reasonable period afterward for backups, legal compliance, and dispute resolution. You may
              request deletion as described below.
            </p>

            <h2 className={h2}>7. Security</h2>
            <p className={p}>
              We use industry-standard measures such as encryption in transit (HTTPS), access controls, authentication
              checks, and database policies (for example row-level security) where applicable. No method of storage or
              transmission is 100% secure; we work to reduce risk.
            </p>

            <h2 className={h2}>8. Your rights and choices</h2>
            <p className={p}>
              Depending on where you live, you may have rights to access, correct, delete, or export your personal
              information, object to certain processing, or withdraw consent where processing is consent-based. You can
              update much of your profile and settings inside the app. For other requests (including account deletion),
              contact us using the details in the “Contact” section. You may also lodge a complaint with a data
              protection authority in your country.
            </p>

            <h2 className={h2}>9. International transfers</h2>
            <p className={p}>
              Our providers may process data in the United States and other countries. Where required, we use appropriate
              safeguards (such as standard contractual clauses) for transfers from the EEA, UK, or Switzerland.
            </p>

            <h2 className={h2}>10. Children</h2>
            <p className={p}>
              The Service is not directed at children under 13 (or the age required in your jurisdiction). We do not
              knowingly collect personal information from children. If you believe we have, contact us and we will take
              steps to delete it.
            </p>

            <h2 className={h2}>11. Cookies and similar technologies</h2>
            <p className={p}>
              We may use cookies or local storage as needed for sessions, preferences, and security. If we add
              analytics or marketing cookies, we will describe them here and, where required, ask for your consent before
              non-essential cookies run.
            </p>

            <h2 className={h2}>12. Changes</h2>
            <p className={p}>
              We may update this Privacy Policy from time to time. We will post the new version on this page and update
              the “Last updated” date. For material changes, we may provide additional notice (for example in-app or by
              email).
            </p>

            <h2 className={h2}>13. Contact</h2>
            <p className={p}>
              For privacy questions or requests, contact us at the support or legal email address published for
              CineMatch (replace this sentence with your real contact email before production). You may also use
              in-app support if available.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
