"use client";

import Link from "next/link";

type BodyProps = {
  isDarkMode: boolean;
  /** In modals, open cross-links in a new tab so the dialog flow is not lost. */
  crossLinkTarget?: "_self" | "_blank";
};

export function PrivacyPolicyDocumentBody({
  isDarkMode,
  crossLinkTarget = "_self",
}: BodyProps) {
  const p = isDarkMode ? "text-slate-300" : "text-slate-700";
  const muted = isDarkMode ? "text-slate-400" : "text-slate-600";
  const strong = isDarkMode ? "font-semibold text-slate-100" : "font-semibold text-slate-900";
  const h2 = `mt-8 text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`;
  const ul = `mt-2 list-inside list-disc space-y-1.5 ${p}`;
  const linkRel = crossLinkTarget === "_blank" ? "noopener noreferrer" : undefined;

  return (
    <div className="space-y-1 text-sm leading-7">
      <p className={p}>
        This Privacy Policy describes how CineMatch (“we,” “us,” or “our”) handles personal information when you use our
        website, mobile apps, and related services (together, the “Service”). By using the Service, you agree to this
        policy together with our{" "}
        <Link
          href="/terms"
          target={crossLinkTarget === "_blank" ? "_blank" : undefined}
          rel={linkRel}
          className="font-semibold underline underline-offset-2 hover:opacity-90"
        >
          Terms of Service
        </Link>
        .
      </p>

      <h2 className={h2}>1. Who we are</h2>
      <p className={p}>
        CineMatch is a movie discovery and social watchlist product. Depending on how you access the Service, data may
        be processed by us and by trusted infrastructure providers described below.
      </p>

      <h2 className={h2}>2. Information we collect</h2>
      <p className={p}>We collect information that falls into these categories:</p>
      <ul className={ul}>
        <li>
          <span className={strong}>Account and profile.</span> Name, email address, password (stored in hashed form by
          our authentication provider), profile details you choose to add (such as display name, city, or profile
          photo), and app settings (for example appearance or notification preferences).
        </li>
        <li>
          <span className={strong}>Usage and activity.</span> Actions you take in the app, such as movies you save,
          swipe or match activity, items on your lists, friend connections and invites, and timestamps needed to sync
          your account across devices.
        </li>
        <li>
          <span className={strong}>Technical data.</span> IP address, device or browser type, approximate region from
          IP, diagnostic logs, and security-related identifiers. We use these to operate, secure, and improve the
          Service.
        </li>
        <li>
          <span className={strong}>Support communications.</span> Information you send when you contact us (for example
          email content).
        </li>
      </ul>
      <p className={`mt-3 ${muted}`}>
        Movie metadata (titles, posters, descriptions) is provided by third-party databases such as TMDB. That content
        is not “your” personal data, but viewing or saving titles may be associated with your account as usage activity.
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
        required (for example optional communications or non-essential cookies, if we use them); and legal obligations
        where applicable.
      </p>

      <h2 className={h2}>5. Sharing and subprocessors</h2>
      <p className={p}>
        We do not sell your personal information. We share data only as needed to run the Service, including with:
      </p>
      <ul className={ul}>
        <li>
          <span className={strong}>Supabase</span> (or equivalent) for authentication, database storage, and file
          storage for assets such as profile images, under their terms and security practices.
        </li>
        <li>
          <span className={strong}>Hosting and infrastructure</span> providers that serve our application and API.
        </li>
        <li>
          <span className={strong}>Movie data providers</span> (e.g. TMDB) for catalog content; requests may include
          technical identifiers required by those APIs.
        </li>
      </ul>
      <p className={`mt-3 ${p}`}>
        We may also disclose information if required by law, to protect rights and safety, or as part of a merger or
        acquisition (with notice where appropriate).
      </p>

      <h2 className={h2}>6. Retention</h2>
      <p className={p}>
        We keep personal information only as long as needed for the purposes above: for example, while your account is
        active, plus a reasonable period afterward for backups, legal compliance, and dispute resolution. You may
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
        contact us using the details in the “Contact” section. You may also lodge a complaint with a data protection
        authority in your country.
      </p>

      <h2 className={h2}>9. International transfers</h2>
      <p className={p}>
        Our providers may process data in the United States and other countries. Where required, we use appropriate
        safeguards (such as standard contractual clauses) for transfers from the EEA, UK, or Switzerland.
      </p>

      <h2 className={h2}>10. Children</h2>
      <p className={p}>
        The Service is not directed at children under 13 (or the age required in your jurisdiction). We do not knowingly
        collect personal information from children. If you believe we have, contact us and we will take steps to delete
        it.
      </p>

      <h2 className={h2}>11. Cookies and similar technologies</h2>
      <p className={p}>
        We may use cookies or local storage as needed for sessions, preferences, and security. If we add analytics or
        marketing cookies, we will describe them here and, where required, ask for your consent before non-essential
        cookies run.
      </p>

      <h2 className={h2}>12. Changes</h2>
      <p className={p}>
        We may update this Privacy Policy from time to time. We will post the new version on this page and update the
        “Last updated” date. For material changes, we may provide additional notice (for example in-app or by email).
      </p>

      <h2 className={h2}>13. Contact</h2>
      <p className={p}>
        For privacy questions or requests, contact us at the support or legal email address published for CineMatch
        (replace this sentence with your real contact email before production). You may also use in-app support if
        available.
      </p>
    </div>
  );
}

export function TermsOfServiceDocumentBody({
  isDarkMode,
  crossLinkTarget = "_self",
}: BodyProps) {
  const p = isDarkMode ? "text-slate-300" : "text-slate-700";
  const h2 = `mt-8 text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`;
  const ul = `mt-2 list-inside list-disc space-y-1.5 ${p}`;
  const linkRel = crossLinkTarget === "_blank" ? "noopener noreferrer" : undefined;

  return (
    <div className="space-y-1 text-sm leading-7">
      <p className={p}>
        These Terms of Service (“Terms”) govern your access to and use of CineMatch’s website, mobile applications, and
        related services (the “Service”). By creating an account or using the Service, you agree to these Terms and our{" "}
        <Link
          href="/privacy"
          target={crossLinkTarget === "_blank" ? "_blank" : undefined}
          rel={linkRel}
          className="font-semibold underline underline-offset-2 hover:opacity-90"
        >
          Privacy Policy
        </Link>
        . If you do not agree, do not use the Service.
      </p>

      <h2 className={h2}>1. The Service</h2>
      <p className={p}>
        CineMatch helps you discover movies, save picks, compare tastes with friends, and manage shared watchlists.
        Movie information (such as titles, artwork, and descriptions) may be supplied by third-party databases. We may
        change, suspend, or discontinue features with reasonable notice where practicable.
      </p>

      <h2 className={h2}>2. Eligibility</h2>
      <p className={p}>
        You must be old enough to enter a binding contract where you live and at least 13 years old (or the minimum age
        in your jurisdiction). If you use the Service on behalf of an organization, you represent that you have
        authority to bind that organization.
      </p>

      <h2 className={h2}>3. Accounts</h2>
      <p className={p}>
        You are responsible for your account credentials and for activity under your account. Provide accurate
        information and keep it updated. Notify us promptly of unauthorized use. We may refuse registration, terminate
        accounts, or limit features to protect the Service or other users.
      </p>

      <h2 className={h2}>4. Acceptable use</h2>
      <p className={p}>You agree not to:</p>
      <ul className={ul}>
        <li>Violate law or infringe others’ rights (including privacy and intellectual property).</li>
        <li>Harass, abuse, spam, or impersonate others; misuse invites or friend-linking.</li>
        <li>
          Probe, scan, or test the vulnerability of the Service; interfere with or overload systems; or bypass security
          or access controls.
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
        Trailer and streaming availability links may point to third parties; we do not control those services. Depending
        on your discovery activity and the source catalog, trailers or recommendations for mature / 18+ titles may
        appear in the app.
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
        NON-INFRINGEMENT. We do not guarantee uninterrupted or error-free operation, accuracy of recommendations, or
        availability of any title on any streaming platform.
      </p>

      <h2 className={h2}>8. Limitation of liability</h2>
      <p className={p}>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, CINEMATCH AND ITS SUPPLIERS WILL NOT BE LIABLE FOR ANY INDIRECT,
        INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM
        YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE IS LIMITED TO THE GREATER OF
        (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE TWELVE MONTHS BEFORE THE CLAIM OR (B) FIFTY U.S. DOLLARS (OR
        THE EQUIVALENT IN LOCAL CURRENCY), EXCEPT WHERE LAW DOES NOT ALLOW SUCH A CAP.
      </p>

      <h2 className={h2}>9. Indemnity</h2>
      <p className={p}>
        You will defend and indemnify CineMatch and its affiliates, officers, and employees against claims, damages,
        losses, and expenses (including reasonable legal fees) arising from your use of the Service, your content, or
        your violation of these Terms, to the extent permitted by law.
      </p>

      <h2 className={h2}>10. Termination</h2>
      <p className={p}>
        You may stop using the Service at any time. We may suspend or terminate access for breach of these Terms, risk
        to the Service, or legal reasons. Provisions that by nature should survive (including disclaimers,
        limitations, and indemnity) will survive termination.
      </p>

      <h2 className={h2}>11. Changes to these Terms</h2>
      <p className={p}>
        We may update these Terms. We will post the new version on this page and update the “Last updated” date.
        Continued use after changes become effective constitutes acceptance. If you do not agree, discontinue use of the
        Service.
      </p>

      <h2 className={h2}>12. Governing law and disputes</h2>
      <p className={p}>
        Unless mandatory consumer laws in your country say otherwise, these Terms are governed by the laws of the
        jurisdiction we designate for CineMatch (replace this with your chosen jurisdiction before production),
        excluding conflict-of-law rules. Courts in that jurisdiction have exclusive jurisdiction, except that consumers
        may have rights to sue in their home courts where required by law.
      </p>

      <h2 className={h2}>13. Contact</h2>
      <p className={p}>
        For questions about these Terms, contact us at the email address published for CineMatch support (replace with
        your production contact before launch).
      </p>
    </div>
  );
}
