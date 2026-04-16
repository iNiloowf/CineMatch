"use client";

import { useState } from "react";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import type { SharedMovieView } from "@/lib/types";

function getProgressCopy(progress: number, watched: boolean) {
  if (watched || progress >= 100) {
    return "Finished together";
  }

  if (progress >= 75) {
    return "Almost movie night";
  }

  if (progress >= 40) {
    return "Halfway there";
  }

  if (progress > 0) {
    return "Getting started";
  }

  return "Ready to plan";
}

function TogglePill({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onChange(!checked)}
      className={`flex min-w-0 flex-1 items-center justify-between gap-2.5 rounded-[18px] px-3.5 py-3 text-[12px] font-semibold transition ${
        checked
          ? "bg-violet-600 text-white shadow-[0_14px_28px_rgba(124,58,237,0.22)]"
          : "bg-white text-slate-700"
      }`}
    >
      <span className="min-w-0 flex-1 pr-1.5 leading-none">{label}</span>
      <span
        className={`inline-flex h-6 w-10 shrink-0 items-center rounded-full p-1 transition ${
          checked ? "bg-white/25" : "bg-slate-200"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full transition ${
            checked
              ? "translate-x-4 bg-white"
              : "translate-x-0 bg-white shadow-sm"
          }`}
        />
      </span>
    </button>
  );
}

export default function SharedWatchlistPage() {
  const {
    sharedMovieGroups,
    toggleWatched,
    toggleSharedMovie,
    isDarkMode,
  } =
    useAppState();
  const [openPartnerId, setOpenPartnerId] = useState<string | null>(null);
  const [detailsMovie, setDetailsMovie] = useState<SharedMovieView | null>(null);

  return (
    <>
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
                    <p className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      {group.partner.name}
                    </p>
                    <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {group.movies.length > 0
                        ? `${group.movies.filter((movie) => movie.shared).length} titles you both picked`
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
                    <div className={`rounded-[24px] px-4 py-4 text-sm leading-6 ${
                      isDarkMode ? "bg-white/8 text-slate-300" : "bg-slate-50 text-slate-500"
                    }`}>
                      You are connected with {group.partner.name}, but you have not accepted the same movie yet.
                    </div>
                  ) : null}

                  {group.movies.map((entry) => (
                    <div
                      key={`${entry.partner.id}-${entry.movie.id}`}
                      className={`rounded-[28px] border px-4 py-4 ${
                        isDarkMode
                          ? "border-white/10 bg-white/8 shadow-[0_18px_38px_rgba(0,0,0,0.22)]"
                          : "border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,241,255,0.88))] shadow-[0_16px_34px_rgba(148,163,184,0.08)]"
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <AvatarBadge
                            initials={group.partner.avatar}
                            imageUrl={group.partner.avatarImageUrl}
                            sizeClassName="h-9 w-9"
                            textClassName="text-xs font-semibold"
                          />
                          <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
                            Both picked this
                          </span>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
                          {getProgressCopy(entry.progress, entry.watched)}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-lg font-semibold text-slate-900">
                            {entry.movie.title}
                          </h3>
                          <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                            Matched with {entry.partner.name}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700 shadow-sm">
                          {entry.movie.rating.toFixed(1)}
                        </span>
                      </div>

                      <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {entry.movie.year} • {entry.movie.runtime} •{" "}
                        {entry.movie.genre.join(" • ")}
                      </p>

                      <div className={`shared-description-card mt-3 rounded-[20px] px-4 py-3 ${
                        isDarkMode ? "bg-black/20" : "bg-white/75"
                      }`}>
                        <p className={`line-clamp-3 text-sm leading-6 ${
                          isDarkMode ? "text-slate-200" : "text-slate-600"
                        }`}>
                          {entry.movie.description}
                        </p>
                        <button
                          type="button"
                          onClick={() => setDetailsMovie(entry)}
                          className={`mt-2 text-sm font-semibold ${
                            isDarkMode ? "text-violet-300" : "text-violet-600"
                          }`}
                        >
                          More
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        <TogglePill
                          label="Keep in shared list"
                          checked={entry.shared}
                          onChange={async (checked) =>
                            await toggleSharedMovie(
                              entry.partner.id,
                              entry.movie.id,
                              checked,
                            )
                          }
                        />
                        <TogglePill
                          label="Watched together"
                          checked={entry.watched}
                          onChange={async (checked) =>
                            await toggleWatched(
                              entry.partner.id,
                              entry.movie.id,
                              checked,
                            )
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </SurfaceCard>
          ))}
        </div>
      </div>

      {detailsMovie ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close details"
            onClick={() => setDetailsMovie(null)}
            className="absolute inset-0"
          />
          <div className={`shared-details-modal relative z-10 max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-[30px] p-4 shadow-[0_30px_90px_rgba(15,23,42,0.28)] ${
            isDarkMode ? "border border-white/10 bg-slate-950" : "bg-white"
          }`}>
            <button
              type="button"
              aria-label="Close details"
              onClick={() => setDetailsMovie(null)}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div
              className="h-52 rounded-[24px] bg-cover bg-center"
              style={{
                backgroundImage: detailsMovie.movie.poster.imageUrl
                  ? `url(${detailsMovie.movie.poster.imageUrl})`
                  : `linear-gradient(135deg, ${detailsMovie.movie.poster.accentFrom}, ${detailsMovie.movie.poster.accentTo})`,
              }}
            />

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <AvatarBadge
                  initials={detailsMovie.partner.avatar}
                  imageUrl={detailsMovie.partner.avatarImageUrl}
                  sizeClassName="h-9 w-9"
                  textClassName="text-xs font-semibold"
                />
                <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
                  Mutual match
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {detailsMovie.movie.title}
                  </h3>
                  <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {detailsMovie.movie.year} • {detailsMovie.movie.runtime} • with {detailsMovie.partner.name}
                  </p>
                </div>
                <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  {detailsMovie.movie.rating.toFixed(1)}
                </span>
              </div>

              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {detailsMovie.movie.genre.join(" • ")}
              </p>

              <p className={`shared-details-description text-sm leading-7 ${
                isDarkMode ? "text-slate-200" : "text-slate-600"
              }`}>
                {detailsMovie.movie.description}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
