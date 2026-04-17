"use client";

type Variant = "loading" | "empty" | "error";

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
  const shell = isDarkMode
    ? "border-white/10 bg-white/6 text-slate-100"
    : "border-slate-200/90 bg-slate-50/95 text-slate-900";

  return (
    <div className={`space-y-3 rounded-[22px] border px-4 py-5 text-center ${shell}`}>
      {variant === "loading" ? (
        <p
          className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
        >
          {title}
        </p>
      ) : (
        <>
          <h3 className="text-base font-semibold leading-snug">{title}</h3>
          {description ? (
            <p
              className={`text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
            >
              {description}
            </p>
          ) : null}
        </>
      )}
      {(onRetry && variant !== "loading") || secondaryAction || tertiaryAction ? (
        <div className="flex flex-col flex-wrap gap-2 sm:flex-row sm:justify-center">
          {onRetry && variant !== "loading" ? (
            <button type="button" onClick={onRetry} className="ui-btn ui-btn-primary">
              {retryLabel}
            </button>
          ) : null}
          {secondaryAction ? (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="ui-btn ui-btn-secondary"
            >
              {secondaryAction.label}
            </button>
          ) : null}
          {tertiaryAction ? (
            <button
              type="button"
              onClick={tertiaryAction.onClick}
              className="ui-btn ui-btn-ghost"
            >
              {tertiaryAction.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
