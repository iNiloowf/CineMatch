"use client";

type Variant = "loading" | "empty" | "error" | "success";

type NetworkStatusBlockProps = {
  variant: Variant;
  isDarkMode: boolean;
  title: string;
  description?: string;
  retryLabel?: string;
  onRetry?: () => void;
  secondaryAction?: { label: string; onClick: () => void };
  tertiaryAction?: { label: string; onClick: () => void };
};

function StatusIcon({ variant, isDarkMode }: { variant: Variant; isDarkMode: boolean }) {
  const stroke = isDarkMode ? "rgba(248,250,252,0.92)" : "currentColor";
  const muted = isDarkMode ? "rgba(148,163,184,0.95)" : "currentColor";

  if (variant === "loading") {
    return (
      <div
        className={`mx-auto size-9 shrink-0 rounded-full border-2 border-t-transparent animate-spin ${
          isDarkMode ? "border-white/18 border-t-violet-300" : "border-slate-200 border-t-violet-600"
        }`}
        aria-hidden
      />
    );
  }

  if (variant === "error") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="mx-auto size-9 shrink-0" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke={muted} strokeWidth="1.6" />
        <path
          d="M12 8v5"
          stroke={isDarkMode ? "#fda4af" : "#e11d48"}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="12" cy="16.5" r="1" fill={isDarkMode ? "#fda4af" : "#e11d48"} />
      </svg>
    );
  }

  if (variant === "success") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="mx-auto size-9 shrink-0" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke={muted} strokeWidth="1.6" />
        <path
          d="M8 12.5 10.8 15 16 9.5"
          stroke={isDarkMode ? "#6ee7b7" : "#059669"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="mx-auto size-9 shrink-0" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke={stroke} strokeWidth="1.6" />
      <path d="m20 20-4.2-4.2" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M8 11h5.5"
        stroke={isDarkMode ? "#c4b5fd" : "#7c3aed"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NetworkStatusBlock({
  variant,
  isDarkMode,
  title,
  description,
  retryLabel = "Try again",
  onRetry,
  secondaryAction,
  tertiaryAction,
}: NetworkStatusBlockProps) {
  const shellBase = isDarkMode
    ? "border-white/16 bg-white/10 text-slate-100"
    : "border-slate-200/90 bg-slate-50/95 text-slate-900";

  const accent =
    variant === "error"
      ? isDarkMode
        ? "ring-1 ring-rose-400/25 border-rose-400/35"
        : "ring-1 ring-rose-200/90 border-rose-200"
      : variant === "success"
        ? isDarkMode
          ? "ring-1 ring-emerald-400/22 border-emerald-400/30"
          : "ring-1 ring-emerald-200/90 border-emerald-200"
        : variant === "empty"
          ? isDarkMode
            ? "ring-1 ring-violet-400/18 border-violet-400/28"
            : "ring-1 ring-violet-200/80 border-violet-200/90"
          : isDarkMode
            ? "ring-1 ring-white/10 border-white/14"
            : "ring-1 ring-slate-200/60 border-slate-200/80";

  return (
    <div
      className={`space-y-3 rounded-[22px] border px-4 py-5 text-center ${shellBase} ${accent}`}
    >
      <div className="flex flex-col items-center gap-2">
        <StatusIcon variant={variant} isDarkMode={isDarkMode} />
        {variant === "loading" ? (
          <p
            className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}
          >
            {title}
          </p>
        ) : (
          <h3 className="text-base font-semibold leading-snug">{title}</h3>
        )}
      </div>
      {description && variant !== "loading" ? (
        <p
          className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}
        >
          {description}
        </p>
      ) : null}
      {(onRetry && variant !== "loading") || secondaryAction || tertiaryAction ? (
        <div className="flex w-full max-[420px]:flex-col max-[420px]:gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
          {onRetry && variant !== "loading" ? (
            <button
              type="button"
              onClick={onRetry}
              className="ui-btn ui-btn-primary min-h-[44px] max-[420px]:w-full sm:min-h-0 sm:w-auto"
            >
              {retryLabel}
            </button>
          ) : null}
          {secondaryAction ? (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="ui-btn ui-btn-secondary min-h-[44px] max-[420px]:w-full sm:min-h-0 sm:w-auto"
            >
              {secondaryAction.label}
            </button>
          ) : null}
          {tertiaryAction ? (
            <button
              type="button"
              onClick={tertiaryAction.onClick}
              className="ui-btn ui-btn-ghost min-h-[44px] max-[420px]:w-full sm:min-h-0 sm:w-auto"
            >
              {tertiaryAction.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
