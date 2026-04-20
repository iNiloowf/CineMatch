"use client";

import {
  PrivacyPolicyDocumentBody,
  TermsOfServiceDocumentBody,
} from "@/components/legal-policy-document-bodies";
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
        className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto flex max-h-[min(92dvh,40rem)] w-full max-w-xl flex-col overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
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
          className={`ui-shell-header shrink-0 ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold text-inherit">
              {variant === "privacy" ? "Privacy Policy" : "Terms of Service"}
            </p>
            <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Last updated: April 2026
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
        <div className="ui-shell-body !min-h-0 !flex-1 !overflow-y-auto !pt-4 pb-2 text-sm">
          {variant === "privacy" ? (
            <PrivacyPolicyDocumentBody isDarkMode={isDarkMode} crossLinkTarget="_blank" />
          ) : (
            <TermsOfServiceDocumentBody isDarkMode={isDarkMode} crossLinkTarget="_blank" />
          )}
        </div>
        <div className={`ui-shell-footer shrink-0 ${isDarkMode ? "!border-t-white/10" : "!border-t-slate-100"} !pt-3`}>
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
