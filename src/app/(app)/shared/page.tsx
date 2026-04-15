"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";

export default function SharedWatchlistPage() {
  const { sharedMovieGroups, toggleWatched, removeSharedMovie } = useAppState();
  const [openPartnerId, setOpenPartnerId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Together"
        title="Shared Watchlist"
        description="Open each person to see what you matched on together."
      />

      {sharedMovieGroups.length === 0 ? (
        <SurfaceCard className="space-y-2 text-center">
          <p className="text-lg font-semibold text-slate-900">No linked people yet</p>
          <p className="text-sm leading-6 text-slate-500">
            Link with someone and their name will show up here right away.
          </p>
        </SurfaceCard>
      ) : null}

      <div className="space-y-5">
        {sharedMovieGroups.map((group) => (
          <SurfaceCard key={group.partner.id} className="space-y-5">
            <button
              type="button"
              onClick={() =>
                setOpenPartnerId((current) =>
                  current === group.partner.id ? null : group.partner.id,
                )
              }
              className="flex w-full items-center justify-between gap-4 text-left"
            >
              <div className="flex items-center gap-3">
                <AvatarBadge
                  initials={group.partner.avatar}
                  imageUrl={group.partner.avatarImageUrl}
                />
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {group.partner.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {group.movies.length > 0
                      ? `${group.movies.length} movie${group.movies.length === 1 ? "" : "s"} matched`
                      : "No shared picks yet"}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                {openPartnerId === group.partner.id ? "Close" : "Open"}
              </span>
            </button>

            {openPartnerId === group.partner.id ? (
              <div className="expand-soft space-y-5 pt-4">
                {group.movies.length === 0 ? (
                  <div className="rounded-[24px] bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
                    You are connected with {group.partner.name}, but you have not accepted the same movie yet.
                  </div>
                ) : null}

                {group.movies.map((entry) => (
                  <div
                    key={`${entry.partner.id}-${entry.movie.id}`}
                    className="rounded-[24px] bg-slate-50 px-4 py-4 hover:-translate-y-0.5 hover:bg-slate-100/90"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-slate-900">
                          <span>{entry.movie.title}</span>
                          <span className="ml-2 inline-flex rounded-full bg-white px-3 py-1 align-middle text-xs font-semibold text-violet-700 shadow-sm">
                            {entry.movie.rating.toFixed(1)}
                          </span>
                        </h3>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${entry.movie.title} from shared list with ${entry.partner.name}`}
                        onClick={async () =>
                          await removeSharedMovie(entry.partner.id, entry.movie.id)
                        }
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
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

                    <div
                      className={`details-soft ${
                        entry.watched
                          ? "details-soft-closed"
                          : "details-soft-open"
                      }`}
                    >
                      <p className="mt-2 text-sm text-slate-500">
                        {entry.movie.year} • {entry.movie.runtime} •{" "}
                        {entry.movie.genre.join(" • ")}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {entry.movie.description}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <label className="flex flex-1 items-center justify-between rounded-[20px] bg-white px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">
                          Watched together
                        </p>
                        <input
                          type="checkbox"
                          checked={entry.watched}
                          onChange={async (event) =>
                            await toggleWatched(
                              entry.partner.id,
                              entry.movie.id,
                              event.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
