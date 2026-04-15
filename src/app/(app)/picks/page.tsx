"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";

export default function PicksPage() {
  const { acceptedMovies, sharedMovies, removePick, isDarkMode } = useAppState();
  const [pendingRemoveMovieId, setPendingRemoveMovieId] = useState<string | null>(null);

  const pendingRemoveMovie = useMemo(
    () =>
      pendingRemoveMovieId
        ? acceptedMovies.find((movie) => movie.id === pendingRemoveMovieId) ?? null
        : null,
    [acceptedMovies, pendingRemoveMovieId],
  );

  return (
    <>
      <div className="space-y-4">
        <PageHeader
          eyebrow="Your picks"
          title="Accepted Movies"
          description="Everything you said yes to, ready for solo nights or shared watch plans."
        />

        <div className="grid grid-cols-2 gap-3">
          <SurfaceCard className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Saved</p>
            <p className="text-3xl font-semibold text-slate-900">
              {acceptedMovies.length}
            </p>
          </SurfaceCard>
          <SurfaceCard className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Shared</p>
            <p className="text-3xl font-semibold text-slate-900">
              {sharedMovies.length}
            </p>
          </SurfaceCard>
        </div>

        <div className="space-y-3">
          {acceptedMovies.map((movie) => {
            const matchingPartners = sharedMovies
              .filter((entry) => entry.movie.id === movie.id)
              .map((entry) => entry.partner.name);

            return (
              <SurfaceCard key={movie.id} className="space-y-5 p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="h-24 w-[4.8rem] shrink-0 overflow-hidden rounded-[22px] shadow-[0_12px_28px_rgba(107,70,193,0.22)]"
                    style={{
                      backgroundImage: movie.poster.imageUrl
                        ? `linear-gradient(145deg, rgba(30, 20, 50, 0.24), rgba(20, 16, 30, 0.66)), url(${movie.poster.imageUrl})`
                        : `linear-gradient(145deg, ${movie.poster.accentFrom}, ${movie.poster.accentTo})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-semibold text-slate-900">
                          {movie.title}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {movie.year} • {movie.runtime}
                        </p>
                      </div>
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                        {movie.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm leading-5 text-slate-500">
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
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-4">
                  <p className="min-w-0 text-xs leading-5 text-slate-500">
                    {matchingPartners.length > 0
                      ? `Also matched with ${matchingPartners.join(", ")}`
                      : "No shared match yet."}
                  </p>
                  <button
                    type="button"
                    aria-label={`Remove ${movie.title} from your picks`}
                    onClick={() => setPendingRemoveMovieId(movie.id)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-4 w-4"
                    >
                      <path
                        d="M5.5 6.5h9m-7.5 0V5.75A1.75 1.75 0 0 1 8.75 4h2.5A1.75 1.75 0 0 1 13 5.75v.75m-6 0-.5 8A1.75 1.75 0 0 0 8.25 16h3.5a1.75 1.75 0 0 0 1.75-1.5l.5-8m-5.5 3v3m3-3v3"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
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
              className="inline-flex rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
            >
              Go to Discover
            </Link>
          </SurfaceCard>
        ) : null}
      </div>

      {pendingRemoveMovie ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close remove confirmation"
            onClick={() => setPendingRemoveMovieId(null)}
            className="absolute inset-0"
          />
          <div
            className={`relative z-10 w-full max-w-sm rounded-[28px] border p-5 shadow-[0_30px_80px_rgba(15,23,42,0.28)] ${
              isDarkMode
                ? "border-white/10 bg-slate-950 text-white"
                : "border-white/80 bg-white text-slate-900"
            }`}
          >
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">
                Remove from your picks?
              </h3>
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

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingRemoveMovieId(null)}
                className={`flex-1 rounded-[20px] px-4 py-3 text-sm font-semibold ${
                  isDarkMode
                    ? "bg-white/8 text-slate-200"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await removePick(pendingRemoveMovie.id);
                  setPendingRemoveMovieId(null);
                }}
                className="flex-1 rounded-[20px] bg-rose-500 px-4 py-3 text-sm font-semibold text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
