"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { defaultSettings } from "@/lib/mock-data";
import { applyTrailerAutoplayPreference } from "@/lib/trailer-embed-url";
import { useFocusTrap } from "@/lib/use-focus-trap";
import { ModalPortal } from "@/components/modal-portal";

type PicksTrailerModalProps = {
  title: string;
  isDarkMode: boolean;
  trailerUrl: string | null;
  isLoadingTrailer: boolean;
  trailerError: string | null;
  onClose: () => void;
  onRetry: () => void;
  /** When true, render above a parent modal (e.g. movie details). */
  variant?: "default" | "nested";
};

export function PicksTrailerModal({
  title,
  isDarkMode,
  trailerUrl,
  isLoadingTrailer,
  trailerError,
  onClose,
  onRetry,
  variant = "default",
}: PicksTrailerModalProps) {
  const [playerReady, setPlayerReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, panelRef);
  const { currentUserId, data } = useAppState();
  const autoplayTrailers = useMemo(() => {
    if (!currentUserId) {
      return defaultSettings.autoplayTrailers;
    }
    return { ...defaultSettings, ...data.settings[currentUserId] }.autoplayTrailers;
  }, [currentUserId, data.settings]);
  const trailerSrc = useMemo(
    () => applyTrailerAutoplayPreference(trailerUrl, autoplayTrailers),
    [trailerUrl, autoplayTrailers],
  );

  useEffect(() => {
    setPlayerReady(false);
    if (!trailerUrl) {
      return;
    }
    const fallback = window.setTimeout(() => {
      setPlayerReady(true);
    }, 12000);
    return () => window.clearTimeout(fallback);
  }, [trailerUrl]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const showFetchState = isLoadingTrailer && !trailerUrl;
  const showPlayerLoading = Boolean(trailerUrl) && !playerReady && !trailerError;

  const zClass =
    variant === "nested" ? "z-[var(--z-modal-nested)]" : "z-[var(--z-modal)]";

  return (
    <ModalPortal open>
    <div
      className={`ui-overlay ${zClass} bg-slate-950/38 backdrop-blur-[2px]`}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="picks-trailer-modal-title"
        onClick={(event) => event.stopPropagation()}
        className={`details-modal-shell ui-shell ui-shell--dialog-lg flex max-h-[min(92dvh,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-[28px] border shadow-[0_16px_48px_rgba(15,23,42,0.2)] ${
          isDarkMode ? "border-white/10 bg-slate-950/96" : "border-white/75 bg-white/96"
        }`}
      >
        <span className="ui-modal-accent-bar" aria-hidden />
        <div className="ui-shell-header !border-b-black/6 !py-3 shrink-0">
          <p
            id="picks-trailer-modal-title"
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
        <div className="ui-shell-body !flex !min-h-0 !flex-1 !flex-col !overflow-hidden !p-4 !pt-3">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-black shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
            <div className="relative aspect-video w-full min-h-[12rem] flex-1 bg-black sm:min-h-0">
              {trailerUrl ? (
                <>
                  <iframe
                    src={trailerSrc ?? trailerUrl}
                    title={`${title} trailer`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onLoad={() => setPlayerReady(true)}
                    className="h-full w-full border-0"
                  />
                  {showPlayerLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/82 px-6 text-center text-white backdrop-blur-[2px]">
                      <div
                        className="h-11 w-11 animate-spin rounded-full border-2 border-white/25 border-t-violet-300"
                        aria-hidden
                      />
                      <div>
                        <p className="text-sm font-semibold leading-6">Loading player…</p>
                        <p className="mt-2 max-w-xs text-xs font-medium leading-5 text-white/75">
                          On slow networks the trailer can take a few extra seconds. If it stays blank, try
                          closing and opening again.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-white">
                  {showFetchState ? (
                    <>
                      <div className="flex w-full max-w-xs flex-col gap-3" aria-busy="true" aria-live="polite">
                        <div className="ui-skeleton-shimmer h-3 w-[60%] rounded-full bg-white/10" />
                        <div className="ui-skeleton-shimmer h-3 w-[85%] rounded-full bg-white/10" />
                        <div className="ui-skeleton-shimmer h-3 w-[40%] rounded-full bg-white/10" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold leading-6">Fetching trailer…</p>
                        <p className="mt-2 max-w-xs text-xs font-medium leading-5 text-white/75">
                          Looking for a playable source. This step may take longer on slow or spotty
                          connections.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="max-w-xs text-sm font-medium leading-6">
                        {trailerError ?? "Trailer unavailable for this title."}
                      </p>
                      <button type="button" onClick={() => void onRetry()} className="ui-btn ui-btn-primary text-xs">
                        Try again
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
