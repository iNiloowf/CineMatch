"use client";

import type { Movie } from "@/lib/types";

export type MovieTrailerModalProps = {
  movie: Movie;
  isDarkMode: boolean;
  isInteractionLocked: boolean;
  trailerUrl: string | null;
  isLoadingTrailer: boolean;
  trailerError: string | null;
  runtimeLabel: string;
  onClose: () => void;
  onRetryTrailer: () => void;
  onAccept: () => void;
  onReject: () => void;
};

export function MovieTrailerModal({
  movie,
  isDarkMode,
  isInteractionLocked,
  trailerUrl,
  isLoadingTrailer,
  trailerError,
  runtimeLabel,
  onClose,
  onRetryTrailer,
  onAccept,
  onReject,
}: MovieTrailerModalProps) {
  return (
    <div
      className="ui-overlay z-[var(--z-modal)] bg-slate-950/40 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`details-modal-shell ui-shell ui-shell--dialog-lg overflow-hidden rounded-[28px] border shadow-[0_16px_48px_rgba(15,23,42,0.2)] ${
          isDarkMode ? "border-white/10 bg-slate-950/96" : "border-white/75 bg-white/96"
        }`}
      >
        <span className="ui-modal-accent-bar" aria-hidden />
        <div className="ui-shell-header !border-b-black/6 !py-3">
          <p
            className={`min-w-0 flex-1 truncate text-[11px] font-medium tracking-[0.01em] ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {movie.title}
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
                  title={`${movie.title} trailer`}
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
                      onClick={() => void onRetryTrailer()}
                      className="ui-btn ui-btn-primary text-xs"
                    >
                      Try again
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          <div
            className={`mt-4 rounded-[22px] px-3 py-3 ${
              isDarkMode
                ? "border border-white/14 bg-white/10"
                : "border border-slate-200/80 bg-slate-50/90"
            }`}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none text-violet-500">★</span>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {movie.rating.toFixed(1)}
                  </p>
                  <p
                    className={`text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}
                  >
                    IMDb rating
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[1.1rem] leading-none ${
                    isDarkMode ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  ◷
                </span>
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      isDarkMode ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {runtimeLabel}
                  </p>
                  <p
                    className={`text-[10px] ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}
                  >
                    Runtime
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onReject}
                disabled={isInteractionLocked}
                className={`rounded-[20px] px-4 py-3 text-xs font-semibold transition ${
                  isDarkMode
                    ? "border border-white/10 bg-white/8 text-slate-200 hover:bg-white/12"
                    : "border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="text-sm leading-none">×</span>
                  <span>Reject</span>
                </span>
              </button>
              <button
                type="button"
                onClick={onAccept}
                disabled={isInteractionLocked}
                className="rounded-[20px] bg-violet-600 px-4 py-3 text-xs font-semibold text-white shadow-[0_4px_14px_rgba(109,40,217,0.2)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-80"
              >
                <span className="inline-flex items-center gap-2">
                  <span className="text-sm leading-none">♡</span>
                  <span>Accept</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
