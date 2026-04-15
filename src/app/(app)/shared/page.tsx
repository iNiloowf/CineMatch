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
                    You share with {group.partner.name}
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
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {entry.movie.title}
                        </h3>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
                        {entry.movie.rating.toFixed(1)}
                      </span>
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
                      <button
                        type="button"
                        onClick={async () =>
                          await removeSharedMovie(entry.partner.id, entry.movie.id)
                        }
                        className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
                      >
                        Remove
                      </button>
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
