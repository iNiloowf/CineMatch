"use client";

import { useEscapeToClose } from "@/lib/use-escape-to-close";

export type LegalPolicyModalVariant = "privacy" | "terms" | null;

type LegalPolicyModalProps = {
  variant: LegalPolicyModalVariant;
  isDarkMode: boolean;
  onClose: () => void;
};

export function LegalPolicyModal({ variant, isDarkMode, onClose }: LegalPolicyModalProps) {
  useEscapeToClose(Boolean(variant), onClose);

  if (!variant) {
    return null;
  }

  return (
    <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/45 backdrop-blur-md">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-transparent"
      />
      <div
        className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto max-w-xl overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
          isDarkMode
            ? "border-white/12 bg-slate-950 text-slate-100"
            : "border-slate-200/90 bg-white text-slate-900"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={variant === "privacy" ? "Privacy Policy" : "Terms of Service"}
      >
        <span className="ui-modal-accent-bar" aria-hidden />
        <div
          className={`ui-shell-header ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-inherit">
              {variant === "privacy" ? "Privacy Policy" : "Terms of Service"}
            </p>
            <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {variant === "privacy"
                ? "Simple summary for CineMatch users."
                : "Basic usage terms for CineMatch."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`ui-shell-close ${
              isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="ui-icon-md ui-icon-stroke"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="ui-shell-body space-y-3 !pt-4 text-sm leading-6">
          {variant === "privacy" ? (
            <>
              <p>
                We collect only the data needed to run CineMatch: account info, profile details,
                movie interactions, and support tickets.
              </p>
              <p>
                Your data is used for app features (matching, shared watchlists, support) and is
                stored in Supabase.
              </p>
              <p>
                You can request account or data deletion by contacting support from the app.
              </p>
            </>
          ) : (
            <>
              <p>
                By using CineMatch, you agree to use the app lawfully and avoid abuse, spam, or
                attempts to access other users’ private data.
              </p>
              <p>
                Features may change over time. We can suspend access for misuse or violations.
              </p>
              <p>
                The service is provided as-is, and we aim for reliability but cannot guarantee
                uninterrupted availability.
              </p>
            </>
          )}
        </div>
        <div className="ui-shell-footer !pt-3">
          <button
            type="button"
            onClick={onClose}
            className="ui-btn ui-btn-primary w-full justify-center"
          >
            I agree
          </button>
        </div>
      </div>
    </div>
  );
}
