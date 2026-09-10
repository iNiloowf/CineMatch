import Link from "next/link";

const supportEmail =
  process.env.SUPPORT_EMAIL?.trim() || "support@cinematch.ca";

export default function AccountDeletionPage() {
  const mailto = `mailto:${supportEmail}?subject=${encodeURIComponent(
    "CineMatch account deletion request",
  )}&body=${encodeURIComponent(
    "Please delete my CineMatch account and associated personal data.\n\nAccount email:\n\nAdditional notes:\n",
  )}`;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f7ff_0%,#eff3ff_100%)] px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
            CineMatch
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Request account deletion
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Use this page to ask us to delete your CineMatch account and related
            personal data.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
            <section>
              <h2 className="text-base font-semibold text-slate-900">
                How to request deletion
              </h2>
              <ol className="mt-2 list-decimal space-y-2 pl-5">
                <li>
                  Email us at{" "}
                  <a className="underline underline-offset-2" href={mailto}>
                    {supportEmail}
                  </a>{" "}
                  with the subject{" "}
                  <span className="font-medium">
                    CineMatch account deletion request
                  </span>
                  .
                </li>
                <li>
                  Include the email address on your CineMatch account so we can
                  verify it is you.
                </li>
                <li>
                  Or, while signed in, open{" "}
                  <Link className="underline underline-offset-2" href="/settings">
                    Settings
                  </Link>{" "}
                  and send a support ticket asking for account deletion.
                </li>
              </ol>
              <p className="mt-4">
                <a
                  className="inline-flex rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
                  href={mailto}
                >
                  Email deletion request
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">
                What we delete
              </h2>
              <p className="mt-2">
                When we process your request, we delete or de-identify personal
                account data associated with your profile where required, including
                account identifiers, profile information you provided, and related
                app data stored for your account (such as picks, swipes, and
                settings), subject to legal retention needs.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">Timing</h2>
              <p className="mt-2">
                We aim to complete verified deletion requests within 30 days. Some
                encrypted backups or legal records may remain for a limited period
                where required by law, then are removed according to our retention
                schedule.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-slate-900">
                Privacy Policy
              </h2>
              <p className="mt-2">
                More detail is in our{" "}
                <Link className="underline underline-offset-2" href="/privacy">
                  Privacy Policy
                </Link>
                .
              </p>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
