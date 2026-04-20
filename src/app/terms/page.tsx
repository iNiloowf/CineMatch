"use client";

import Link from "next/link";
import { useAppState } from "@/lib/app-state";

export default function TermsOfServicePage() {
  const { isDarkMode } = useAppState();
  const p = isDarkMode ? "text-slate-300" : "text-slate-700";
  const muted = isDarkMode ? "text-slate-400" : "text-slate-600";
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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Terms of Service</h1>
          <p className={`mt-2 text-sm ${muted}`}>Last updated: April 2026</p>

          <div className="mt-6 space-y-1 text-sm leading-7">
            <p className={p}>
              These Terms of Service (“Terms”) govern your access to and use of CineMatch’s website, mobile
              applications, and related services (the “Service”). By creating an account or using the Service, you agree
              to these Terms and our{" "}
              <Link href="/privacy" className="font-semibold underline underline-offset-2 hover:opacity-90">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the Service.
            </p>

            <h2 className={h2}>1. The Service</h2>
            <p className={p}>
              CineMatch helps you discover movies, save picks, compare tastes with friends, and manage shared
              watchlists. Movie information (such as titles, artwork, and descriptions) may be supplied by third-party
              databases. We may change, suspend, or discontinue features with reasonable notice where practicable.
            </p>

            <h2 className={h2}>2. Eligibility</h2>
            <p className={p}>
              You must be old enough to enter a binding contract where you live and at least 13 years old (or the minimum
              age in your jurisdiction). If you use the Service on behalf of an organization, you represent that you
              have authority to bind that organization.
            </p>

            <h2 className={h2}>3. Accounts</h2>
            <p className={p}>
              You are responsible for your account credentials and for activity under your account. Provide accurate
              information and keep it updated. Notify us promptly of unauthorized use. We may refuse registration,
              terminate accounts, or limit features to protect the Service or other users.
            </p>

            <h2 className={h2}>4. Acceptable use</h2>
            <p className={p}>You agree not to:</p>
            <ul className={ul}>
              <li>Violate law or infringe others’ rights (including privacy and intellectual property).</li>
              <li>Harass, abuse, spam, or impersonate others; misuse invites or friend-linking.</li>
              <li>
                Probe, scan, or test the vulnerability of the Service; interfere with or overload systems; or bypass
                security or access controls.
              </li>
              <li>Scrape, data-mine, or automate access beyond what we allow for normal personal use.</li>
              <li>Reverse engineer or attempt to extract source code except where law permits.</li>
              <li>Use the Service to distribute malware or harmful content.</li>
            </ul>

            <h2 className={h2}>5. Content and third-party data</h2>
            <p className={p}>
              You retain rights to content you submit (for example profile text or photos), and you grant us a worldwide,
              non-exclusive license to host, store, process, and display that content solely to operate and improve the
              Service. Movie catalog data may be subject to third-party terms (such as TMDB attribution requirements).
              Trailer and streaming availability links may point to third parties; we do not control those services.
            </p>

            <h2 className={h2}>6. Intellectual property</h2>
            <p className={p}>
              The Service, its branding, and our software are owned by CineMatch or our licensors. Except for the limited
              rights to use the Service as intended, no rights are granted to you. Do not remove notices or marks.
            </p>

            <h2 className={h2}>7. Disclaimers</h2>
            <p className={p}>
              THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
              WARRANTIES, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
              NON-INFRINGEMENT. We do not guarantee uninterrupted or error-free operation, accuracy of recommendations,
              or availability of any title on any streaming platform.
            </p>

            <h2 className={h2}>8. Limitation of liability</h2>
            <p className={p}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CINEMATCH AND ITS SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, OR GOODWILL, ARISING
              FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE
              GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) FIFTY
              U.S. DOLLARS (OR THE EQUIVALENT IN LOCAL CURRENCY), EXCEPT WHERE LAW DOES NOT ALLOW SUCH A CAP.
            </p>

            <h2 className={h2}>9. Indemnity</h2>
            <p className={p}>
              You will defend and indemnify CineMatch and its affiliates, officers, and employees against claims,
              damages, losses, and expenses (including reasonable legal fees) arising from your use of the Service, your
              content, or your violation of these Terms, to the extent permitted by law.
            </p>

            <h2 className={h2}>10. Termination</h2>
            <p className={p}>
              You may stop using the Service at any time. We may suspend or terminate access for breach of these Terms,
              risk to the Service, or legal reasons. Provisions that by nature should survive (including disclaimers,
              limitations, and indemnity) will survive termination.
            </p>

            <h2 className={h2}>11. Changes to these Terms</h2>
            <p className={p}>
              We may update these Terms. We will post the new version on this page and update the “Last updated” date.
              Continued use after changes become effective constitutes acceptance. If you do not agree, discontinue use
              of the Service.
            </p>

            <h2 className={h2}>12. Governing law and disputes</h2>
            <p className={p}>
              Unless mandatory consumer laws in your country say otherwise, these Terms are governed by the laws of the
              jurisdiction we designate for CineMatch (replace this with your chosen jurisdiction before production),
              excluding conflict-of-law rules. Courts in that jurisdiction have exclusive jurisdiction, except that
              consumers may have rights to sue in their home courts where required by law.
            </p>

            <h2 className={h2}>13. Contact</h2>
            <p className={p}>
              For questions about these Terms, contact us at the email address published for CineMatch support (replace
              with your production contact before launch).
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
