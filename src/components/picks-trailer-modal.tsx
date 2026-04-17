"use client";

type PicksTrailerModalProps = {
  title: string;
  isDarkMode: boolean;
  trailerUrl: string | null;
  isLoadingTrailer: boolean;
  trailerError: string | null;
  onClose: () => void;
  onRetry: () => void;
};

export function PicksTrailerModal({
  title,
  isDarkMode,
  trailerUrl,
  isLoadingTrailer,
  trailerError,
  onClose,
  onRetry,
}: PicksTrailerModalProps) {
  return (
    <div
      className="ui-overlay z-[var(--z-modal)] bg-slate-950/38 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`details-modal-shell ui-shell ui-shell--dialog-lg overflow-hidden rounded-[28px] border shadow-[0_16px_48px_rgba(15,23,42,0.2)] ${
          isDarkMode ? "border-white/10 bg-slate-950/96" : "border-white/75 bg-white/96"
        }`}
      >
        <div className="ui-shell-header !border-b-black/6 !py-3">
          <p
            className={`min-w-0 flex-1 truncate text-[11px] font-medium tracking-[0.01em] ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trailer"
            className={`ui-shell-close ${
              isDarkMode ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="ui-icon-md ui-icon-stroke"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="ui-shell-body !p-4 !pt-3">
          <div className="overflow-hidden rounded-[24px] bg-black shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
            <div className="relative aspect-video w-full bg-black">
              {trailerUrl ? (
                <iframe
                  src={trailerUrl}
                  title={`${title} trailer`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
                  <p className="max-w-xs text-sm font-medium leading-6">
                    {isLoadingTrailer
                      ? "Loading trailer…"
                      : trailerError ?? "Trailer unavailable for this title."}
                  </p>
                  {!isLoadingTrailer && !trailerUrl ? (
                    <button
                      type="button"
                      onClick={() => void onRetry()}
                      className="ui-btn ui-btn-primary text-xs"
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
