"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { Movie } from "@/lib/types";
import { useAppState } from "@/lib/app-state";

type ShareToast = { message: string; variant: "success" | "error" };

export default function PicksPage() {
  const { acceptedMovies, sharedMovies, removePick, isDarkMode } = useAppState();
  const [pendingRemoveMovieId, setPendingRemoveMovieId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<ShareToast | null>(null);
  const shareToastTimerRef = useRef<number | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);
  const [isTrailerVisible, setIsTrailerVisible] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [trailerError, setTrailerError] = useState<string | null>(null);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);

  const pendingRemoveMovie = useMemo(
    () =>
      pendingRemoveMovieId
        ? acceptedMovies.find((movie) => movie.id === pendingRemoveMovieId) ?? null
        : null,
    [acceptedMovies, pendingRemoveMovieId],
  );
  const selectedMovie = useMemo(
    () =>
      selectedMovieId
        ? acceptedMovies.find((movie) => movie.id === selectedMovieId) ?? null
        : null,
    [acceptedMovies, selectedMovieId],
  );

  useEffect(() => {
    if (!selectedMovie) {
      setIsTrailerVisible(false);
      setTrailerUrl(null);
      setTrailerError(null);
      setIsLoadingTrailer(false);
      return;
    }

    setTrailerUrl(selectedMovie.trailerUrl ?? null);
    setTrailerError(null);
    setIsLoadingTrailer(false);
    setIsTrailerVisible(false);
  }, [selectedMovie]);

  useEffect(() => {
    return () => {
      if (shareToastTimerRef.current) {
        window.clearTimeout(shareToastTimerRef.current);
      }
    };
  }, []);

  const showShareToast = (message: string, variant: ShareToast["variant"]) => {
    if (shareToastTimerRef.current) {
      window.clearTimeout(shareToastTimerRef.current);
    }
    setShareToast({ message, variant });
    shareToastTimerRef.current = window.setTimeout(() => {
      setShareToast(null);
    }, 3200);
  };

  const handleShareMovie = async (movieId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    const shareUrl = `${window.location.origin}/discover?movieId=${encodeURIComponent(movieId)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "CineMatch movie pick",
          text: "Check this movie in CineMatch",
          url: shareUrl,
        });
        showShareToast("Shared — your pick link is ready to send.", "success");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showShareToast("Link copied — paste it anywhere to share.", "success");
        return;
      }

      window.prompt("Copy this movie link", shareUrl);
      showShareToast("Copy the link from the dialog to share it.", "success");
    } catch {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          showShareToast("Link copied — paste it anywhere to share.", "success");
        } catch {
          showShareToast("Couldn’t share or copy the link. Try again.", "error");
        }
        return;
      }

      showShareToast("Couldn’t share or copy the link. Try again.", "error");
    }
  };

  const fetchTrailerForSelected = async () => {
    if (!selectedMovie || trailerUrl) {
      return;
    }

    setTrailerError(null);
    setIsLoadingTrailer(true);

    try {
      const response = await fetch(
        `/api/movies/trailer?movieId=${encodeURIComponent(selectedMovie.id)}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as {
        trailerUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.trailerUrl) {
        setTrailerError(
          payload.error ?? "We couldn’t find a playable trailer for this title.",
        );
        return;
      }

      setTrailerUrl(payload.trailerUrl);
    } catch {
      setTrailerError("We couldn’t load the trailer right now.");
    } finally {
      setIsLoadingTrailer(false);
    }
  };

  const handleOpenTrailer = async () => {
    setIsTrailerVisible(true);
    await fetchTrailerForSelected();
  };

  const detailsModal =
    selectedMovie && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-slate-950/48 backdrop-blur-[3px]">
            <button
              type="button"
              aria-label="Close movie details"
              className="absolute inset-0 cursor-default bg-transparent"
              onClick={() => {
                setSelectedMovieId(null);
                setIsTrailerVisible(false);
              }}
            />
            <div
              className={`ui-shell absolute inset-0 flex flex-col ${
                isDarkMode ? "bg-slate-950 text-white" : "bg-white text-slate-900"
              }`}
            >
              <div
                className={`ui-shell-header !border-b-black/6 !py-3 !pt-[max(1rem,env(safe-area-inset-top,0px))]`}
              >
                <p
                  className={`min-w-0 flex-1 truncate text-xs font-medium tracking-[0.01em] ${
                    isDarkMode ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  Movie details
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMovieId(null);
                    setIsTrailerVisible(false);
                  }}
                  aria-label="Close movie details"
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

              <div
                className={`ui-shell-body !px-5 pb-[max(2rem,env(safe-area-inset-bottom,0px))] ${
                  isDarkMode ? "bg-slate-950" : "bg-white"
                }`}
              >
                <div
                  className="relative overflow-hidden rounded-[18px] p-4 text-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
                  style={{
                    backgroundImage: selectedMovie.poster.imageUrl
                      ? `linear-gradient(145deg, rgba(30, 20, 50, 0.24), rgba(20, 16, 30, 0.66)), url(${selectedMovie.poster.imageUrl})`
                      : `linear-gradient(145deg, ${selectedMovie.poster.accentFrom}, ${selectedMovie.poster.accentTo})`,
                    backgroundSize: selectedMovie.poster.imageUrl ? "cover" : "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05),transparent_38%,rgba(15,23,42,0.46)_100%)]" />
                  <div className="relative flex min-h-[15.5rem] flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-violet-600/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                        {selectedMovie.mediaType === "series" ? "Series" : "Movie"}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white/88 backdrop-blur-md">
                          {selectedMovie.year}
                        </span>
                        <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white/88 backdrop-blur-md">
                          {selectedMovie.runtime}
                        </span>
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => void handleOpenTrailer()}
                        aria-label="Play trailer"
                        className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/25 bg-black/24 text-white shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:bg-black/34"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="ml-1 h-6 w-6"
                          aria-hidden="true"
                        >
                          <path d="m8 5 11 7-11 7V5Z" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-2 pt-4">
                      <p className="text-xs font-medium text-white/80">
                        {selectedMovie.genre.slice(0, 3).join(" • ")}
                      </p>
                      <h2 className="text-[1.8rem] font-semibold leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)]">
                        {selectedMovie.title}
                      </h2>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-4 grid grid-cols-3 gap-2 rounded-[24px] px-3 py-2.5 ${
                    isDarkMode
                      ? "border border-white/8 bg-white/6"
                      : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
                  }`}
                >
                  <div className="flex min-w-0 items-center justify-center gap-2">
                    <span className="text-base leading-none text-violet-500">★</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {selectedMovie.rating.toFixed(1)}
                      </p>
                      <p className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        IMDb rating
                      </p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center justify-center gap-2 border-x border-black/6">
                    <span className={`text-[1.1rem] leading-none ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>◷</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {selectedMovie.runtime}
                      </p>
                      <p className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Runtime
                      </p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center justify-center gap-2">
                    <span className="text-base leading-none text-emerald-500">☺</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {matchingScore(selectedMovie)}%
                      </p>
                      <p className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Match
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`mt-4 rounded-[22px] px-4 py-4 ${
                    isDarkMode
                      ? "bg-white/8"
                      : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
                  }`}
                >
                  <p className={`text-[11px] leading-5 ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}>
                    {selectedMovie.description}
                  </p>
                </div>
              </div>
            </div>

            {isTrailerVisible ? (
              <div
                className="ui-overlay z-[var(--z-modal)] bg-slate-950/38 backdrop-blur-[2px]"
                onClick={() => setIsTrailerVisible(false)}
              >
                <div
                  onClick={(event) => event.stopPropagation()}
                  className={`details-modal-shell ui-shell ui-shell--dialog-lg overflow-hidden rounded-[28px] border shadow-[0_16px_48px_rgba(15,23,42,0.2)] ${
                    isDarkMode
                      ? "border-white/10 bg-slate-950/96"
                      : "border-white/75 bg-white/96"
                  }`}
                >
                  <div className="ui-shell-header !border-b-black/6 !py-3">
                    <p
                      className={`min-w-0 flex-1 truncate text-[11px] font-medium tracking-[0.01em] ${
                        isDarkMode ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {selectedMovie.title}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsTrailerVisible(false)}
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
                            title={`${selectedMovie.title} trailer`}
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
                                onClick={() => void fetchTrailerForSelected()}
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
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className="space-y-4">
        <PageHeader
          eyebrow="Your picks"
          title="Accepted Movies"
          description="Everything you said yes to, ready for solo nights or shared watch plans."
        />

        <div className="grid grid-cols-2 gap-3">
          <SurfaceCard className="p-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center ${
                  isDarkMode ? "text-violet-200" : "text-violet-600"
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path
                    d="M7.75 4.75h8.5A2.75 2.75 0 0 1 19 7.5v11.75l-7-3.75-7 3.75V7.5A2.75 2.75 0 0 1 7.75 4.75Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className={`${isDarkMode ? "text-slate-50" : "text-slate-900"} text-3xl font-semibold`}>
                {acceptedMovies.length}
              </p>
            </div>
          </SurfaceCard>
          <SurfaceCard className="p-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center ${
                  isDarkMode ? "text-emerald-200" : "text-emerald-600"
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path
                    d="M12 18.5s-6.25-3.89-6.25-9a3.75 3.75 0 0 1 6.25-2.78A3.75 3.75 0 0 1 18.25 9.5c0 5.11-6.25 9-6.25 9Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className={`${isDarkMode ? "text-slate-50" : "text-slate-900"} text-3xl font-semibold`}>
                {sharedMovies.length}
              </p>
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-3">
          {acceptedMovies.map((movie) => {
            const matchingPartners = sharedMovies
              .filter((entry) => entry.movie.id === movie.id)
              .map((entry) => entry.partner.name);

            return (
              <SurfaceCard
                key={movie.id}
                className="space-y-4 p-4"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMovieId(movie.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedMovieId(movie.id);
                  }
                }}
              >
                <div className="flex items-stretch gap-3">
                  <div
                    className="min-h-[11.5rem] w-[5.7rem] shrink-0 self-stretch overflow-hidden rounded-[22px] shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
                    style={{
                      backgroundImage: movie.poster.imageUrl
                        ? `linear-gradient(145deg, rgba(30, 20, 50, 0.24), rgba(20, 16, 30, 0.66)), url(${movie.poster.imageUrl})`
                        : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="flex h-full flex-col justify-between bg-[linear-gradient(180deg,rgba(15,23,42,0.06),transparent_36%,rgba(15,23,42,0.5)_100%)] p-2.5 text-white">
                      <div className="flex justify-end">
                        <span className="rounded-full bg-black/26 px-2 py-1 text-[10px] font-semibold text-white/88 backdrop-blur-sm">
                          {movie.year}
                        </span>
                      </div>
                      <div className="flex justify-start">
                        <span className="rounded-full bg-black/26 px-2 py-1 text-[10px] font-semibold text-white/88 backdrop-blur-sm">
                          {movie.runtime}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                          <h2 className="min-w-0 text-base font-semibold text-slate-900 sm:flex-1 sm:truncate">
                            {movie.title}
                          </h2>
                          <span className="w-fit shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                            {movie.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-5 text-slate-500">
                      {movie.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {movie.genre.slice(0, 3).map((genre) => (
                        <span
                          key={genre}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                    {matchingPartners.length > 0 ? (
                      <div
                        className={`rounded-[20px] px-3 py-3 ${
                          isDarkMode
                            ? "border border-violet-400/20 bg-violet-500/12 text-violet-100"
                            : "border border-violet-200 bg-violet-50/85 text-violet-800"
                        }`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                          Shared Match
                        </p>
                        <p className="mt-1 text-[12px] font-semibold">
                          Both liked this with {matchingPartners.join(", ")}
                        </p>
                      </div>
                    ) : null}
                    <div className="flex justify-end pt-1">
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Share ${movie.title}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleShareMovie(movie.id);
                          }}
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                            isDarkMode
                              ? "border border-white/10 bg-white/8 text-slate-200 shadow-sm hover:bg-white/12"
                              : "border border-violet-200 bg-violet-50 text-violet-700 shadow-sm hover:bg-violet-100"
                          }`}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="ui-icon-md"
                          >
                            <path
                              d="M12.5 6.5 7.5 9.25m5 1.5-5 2.75M15 5.25a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM8.5 10a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0ZM15 14.75a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0Z"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${movie.title} from your picks`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setPendingRemoveMovieId(movie.id);
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 20 20"
                            fill="none"
                            className="ui-icon-md"
                          >
                            <path
                              d="M5.5 6.5h9m-7.5 0V5.75A1.75 1.75 0 0 1 8.75 4h2.5A1.75 1.75 0 0 1 13 5.75v.75m-6 0-.5 8A1.75 1.75 0 0 0 8.25 16h3.5a1.75 1.75 0 0 0 1.75-1.5l.5-8m-5.5 3v3m3-3v3"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </SurfaceCard>
            );
          })}
        </div>

        {acceptedMovies.length === 0 ? (
          <SurfaceCard className="space-y-3 text-center">
            <p className="text-lg font-semibold text-slate-900">No picks yet</p>
            <p className="text-sm leading-6 text-slate-500">
              Start in Discover and accept the movies that feel right.
            </p>
            <Link
              href="/discover"
              className="ui-btn ui-btn-primary"
            >
              Go to Discover
            </Link>
          </SurfaceCard>
        ) : null}
      </div>

      {pendingRemoveMovie ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/50 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close remove confirmation"
            onClick={() => setPendingRemoveMovieId(null)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-sm relative z-10 overflow-hidden rounded-[28px] border shadow-[0_30px_80px_rgba(15,23,42,0.28)] ${
              isDarkMode
                ? "border-white/10 bg-slate-950 text-white"
                : "border-white/80 bg-white text-slate-900"
            }`}
          >
            <div className="ui-shell-header !border-b-black/6">
              <h3 className="min-w-0 flex-1 text-lg font-semibold">Remove from your picks?</h3>
              <button
                type="button"
                onClick={() => setPendingRemoveMovieId(null)}
                aria-label="Close"
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
            <div className="ui-shell-body !pt-4">
              <p
                className={`text-sm leading-6 ${
                  isDarkMode ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Are you sure you want to remove{" "}
                <span className="font-semibold text-inherit">
                  {pendingRemoveMovie.title}
                </span>{" "}
                from your list?
              </p>
            </div>
            <div className="ui-shell-footer !pt-4">
              <button
                type="button"
                onClick={() => setPendingRemoveMovieId(null)}
                className="ui-btn ui-btn-secondary min-w-0 flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await removePick(pendingRemoveMovie.id);
                  setPendingRemoveMovieId(null);
                }}
                className="ui-btn ui-btn-danger min-w-0 flex-1"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {detailsModal}
      {shareToast && typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[var(--z-toast-anchor)] flex justify-center px-4">
              <div
                role="status"
                className={`pointer-events-auto max-w-md rounded-[22px] border px-4 py-3 text-center text-sm font-semibold shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl ${
                  shareToast.variant === "error"
                    ? isDarkMode
                      ? "border-rose-400/25 bg-slate-950/92 text-rose-100"
                      : "border-rose-200/90 bg-white/95 text-rose-800"
                    : isDarkMode
                      ? "border-white/10 bg-slate-950/92 text-white"
                      : "border-white/80 bg-white/95 text-slate-900"
                }`}
              >
                {shareToast.message}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function matchingScore(movie: Movie) {
  return Math.max(
    62,
    Math.min(98, Math.round(movie.rating * 13 + movie.genre.length * 4)),
  );
}
