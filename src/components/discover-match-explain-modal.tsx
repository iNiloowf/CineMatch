"use client";

import { useEscapeToClose } from "@/lib/use-escape-to-close";
import type { DiscoverSwipeMatchExplanation } from "@/lib/match-score";

type DiscoverMatchExplainModalProps = {
  explanation: DiscoverSwipeMatchExplanation | null;
  isDarkMode: boolean;
  onClose: () => void;
};

export function DiscoverMatchExplainModal({
  explanation,
  isDarkMode,
  onClose,
}: DiscoverMatchExplainModalProps) {
  useEscapeToClose(Boolean(explanation), onClose);

  if (!explanation) {
    return null;
  }

  return (
    <div className="ui-overlay z-[calc(var(--z-modal-backdrop)+2)] bg-slate-950/50 backdrop-blur-md">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-transparent"
      />
      <div
        className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto flex max-h-[min(88dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
          isDarkMode
            ? "border-white/12 bg-slate-950 text-slate-100"
            : "border-slate-200/90 bg-white text-slate-900"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discover-match-explain-title"
      >
        <span className="ui-modal-accent-bar" aria-hidden />
        <div
          className={`ui-shell-header shrink-0 ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}
        >
          <div className="min-w-0 flex-1 pr-2">
            <p id="discover-match-explain-title" className="text-base font-semibold leading-snug text-inherit">
              {explanation.headline}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`ui-shell-close shrink-0 ${
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
        <div
          className={`ui-shell-body !min-h-0 !flex-1 !overflow-y-auto !pt-3 pb-1 text-[14px] leading-relaxed ${
            isDarkMode ? "text-slate-200" : "text-slate-700"
          }`}
        >
          <ul className="list-disc space-y-2.5 pl-4 marker:text-violet-500">
            {explanation.bullets.map((line, index) => (
              <li
                key={`${index}-${line.slice(0, 24)}`}
                className="[&_strong]:font-semibold [&_strong]:text-inherit"
              >
                <MatchExplainLine text={line} />
              </li>
            ))}
          </ul>
        </div>
        <div
          className={`shrink-0 border-t px-4 py-3 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}
        >
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/** Renders a line that may contain **bold** segments (markdown-lite). */
function MatchExplainLine({ text }: { text: string }) {
  const segments = text.split(/\*\*/);
  if (segments.length === 1) {
    return <>{text}</>;
  }
  return (
    <>
      {segments.map((segment, index) =>
        index % 2 === 1 ? (
          <strong key={`${index}-${segment}`}>{segment}</strong>
        ) : (
          <span key={`${index}-${segment}`}>{segment}</span>
        ),
      )}
    </>
  );
}
