"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useEscapeToClose } from "@/lib/use-escape-to-close";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import type { SharedMovieView } from "@/lib/types";

const DESCRIPTION_COLLAPSE_AT = 160;

function entryKey(entry: SharedMovieView) {
  return `${entry.linkId}-${entry.movie.id}`;
}

function mutualChipClass(isDarkMode: boolean) {
  return isDarkMode
    ? "border border-violet-400/25 bg-violet-500/14 text-violet-100 ring-1 ring-violet-400/22"
    : "border border-violet-200/90 bg-violet-50/95 text-violet-900 ring-1 ring-violet-200/75";
}

function partnerChipClass(isDarkMode: boolean) {
  return isDarkMode
    ? "border border-white/12 bg-white/10 text-slate-200 ring-1 ring-white/10"
    : "border border-slate-200/90 bg-slate-100 text-slate-700 ring-1 ring-slate-200/80";
}

function ratingChipClass(isDarkMode: boolean) {
  return isDarkMode
    ? "border border-violet-400/20 bg-violet-500/18 text-violet-100 ring-1 ring-violet-400/25"
    : "border border-violet-200/80 bg-violet-100 text-violet-800 ring-1 ring-violet-200/80";
}

function TogglePill({
  label,
  checked,
  locked,
  isDarkMode,
  onChange,
}: {
  label: string;
  checked: boolean;
  locked?: boolean;
  isDarkMode: boolean;
  onChange: (checked: boolean) => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => void onChange(!checked)}
      className={`flex w-full items-center justify-between gap-2.5 rounded-[16px] border px-3 py-2.5 text-left text-[11px] font-semibold transition ${
        checked
          ? "border-violet-500/40 bg-violet-600 text-white shadow-[0_4px_14px_rgba(109,40,217,0.22)]"
          : isDarkMode
            ? "border-white/14 bg-slate-900/85 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            : "border-slate-200/95 bg-white text-slate-800 shadow-sm"
      }`}
    >
      <span className="min-w-0 flex flex-1 items-center gap-2 pr-1.5 leading-snug">
        <span>{label}</span>
        {locked ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-4 w-4 shrink-0"
            aria-hidden="true"
          >
            <path d="M7.5 10V8a4.5 4.5 0 1 1 9 0v2" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="5.5" y="10" width="13" height="10" rx="2.5" strokeWidth="1.8" />
          </svg>
        ) : null}
      </span>
      <span
        className={`inline-flex h-6 w-10 shrink-0 items-center rounded-full p-1 transition ${
          checked ? "bg-white/25" : isDarkMode ? "bg-slate-600 ring-1 ring-white/12" : "bg-slate-200"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full shadow-sm transition ${
            checked ? "translate-x-4 bg-white" : isDarkMode ? "translate-x-0 bg-slate-200" : "translate-x-0 bg-white"
          }`}
        />
      </span>
    </button>
  );
}

export default function SharedWatchlistPage() {
  const { sharedMovieGroups, toggleWatched, toggleSharedMovie, isDarkMode, hasProAccess } = useAppState();
  const [openPartnerId, setOpenPartnerId] = useState<string | null>(null);
  const [detailsMovie, setDetailsMovie] = useState<SharedMovieView | null>(null);
  const [expandedDescription, setExpandedDescription] = useState<Record<string, boolean>>({});

  const closeDetails = useCallback(() => {
    setDetailsMovie(null);
  }, []);

  useEscapeToClose(Boolean(detailsMovie), closeDetails);

  const toggleDescription = useCallback((key: string) => {
    setExpandedDescription((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <>
      <div className="space-y-4">
        <PageHeader
          eyebrow="Together"
          title="Shared Watchlist"
          description="Open each person to see what you matched on together."
        />

        <div className="shared-ui-copy space-y-4 sm:space-y-5">
        {sharedMovieGroups.length === 0 ? (
          <SurfaceCard className="space-y-2 text-center">
            <p className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              No linked people yet
            </p>
            <p className={`text-xs leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
              Link with someone and their name will show up here right away.
            </p>
          </SurfaceCard>
        ) : null}

        <div className="space-y-4 sm:space-y-5">
          {sharedMovieGroups.map((group) => {
            const isOpen = openPartnerId === group.partner.id;
            return (
              <SurfaceCard key={group.partner.id} className="!p-0 overflow-hidden">
                <div
                  className={`flex w-full min-h-[3.25rem] items-stretch gap-2 px-2 py-2 sm:min-h-14 sm:px-3 sm:py-3 ${
                    isDarkMode
                      ? "border-b border-white/12 bg-gradient-to-r from-white/[0.09] to-white/[0.03]"
                      : "border-b border-slate-200/95 bg-gradient-to-r from-slate-50 to-white"
                  }`}
                >
                  <Link
                    href={`/friends/${group.partner.id}`}
                    className="flex shrink-0 items-center self-center rounded-full p-1 outline-none ring-offset-2 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-violet-400/80"
                    aria-label={`${group.partner.name} — profile and saved picks`}
                  >
                    <AvatarBadge
                      initials={group.partner.avatar}
                      imageUrl={group.partner.avatarImageUrl}
                    />
                  </Link>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Collapse" : "Expand"} ${group.partner.name}`}
                    onClick={() =>
                      setOpenPartnerId((current) => (current === group.partner.id ? null : group.partner.id))
                    }
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[18px] px-2 py-2 text-left transition sm:px-3"
                  >
                    <div className="min-w-0">
                      <p className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {group.partner.name}
                      </p>
                      <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {group.movies.length > 0
                          ? `${group.movies.filter((movie) => movie.shared).length} titles you both picked`
                          : "No shared picks yet"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${mutualChipClass(isDarkMode)}`}
                    >
                      {isOpen ? "Hide" : "Show"}
                    </span>
                  </button>
                </div>

                {isOpen ? (
                  <div
                    className={`space-y-4 px-3 py-4 sm:px-4 sm:py-5 ${
                      isDarkMode ? "bg-slate-950/50" : "bg-[linear-gradient(180deg,rgba(248,250,252,0.65),rgba(255,255,255,0.98))]"
                    }`}
                  >
                    {group.movies.length === 0 ? (
                      <div
                        className={`rounded-[20px] border px-4 py-3.5 text-xs leading-relaxed ${
                          isDarkMode
                            ? "border-white/10 bg-white/[0.05] text-slate-300"
                            : "border-slate-200/90 bg-white text-slate-600"
                        }`}
                      >
                        You are connected with {group.partner.name}, but you have not accepted the same movie yet.
                      </div>
                    ) : null}

                    {group.movies.map((entry) => {
                      const key = entryKey(entry);
                      const desc = entry.movie.description;
                      const needsMore = desc.length > DESCRIPTION_COLLAPSE_AT;
                      const expanded = Boolean(expandedDescription[key]);

                      return (
                        <div
                          key={key}
                          className={`overflow-hidden rounded-[22px] border shadow-sm ${
                            isDarkMode
                              ? "border-white/12 bg-white/[0.05]"
                              : "border-slate-200/90 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
                          }`}
                        >
                          <div className="relative h-[8.5rem] w-full overflow-hidden sm:h-36">
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundImage: entry.movie.poster.imageUrl
                                  ? undefined
                                  : `linear-gradient(145deg, ${entry.movie.poster.accentFrom}, ${entry.movie.poster.accentTo})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            >
                              <PosterBackdrop
                                imageUrl={entry.movie.poster.imageUrl}
                                profile="list"
                                objectFit="cover"
                              />
                            </div>
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),transparent_40%,rgba(15,23,42,0.75)_100%)]" />
                            <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2 sm:left-4 sm:right-4">
                              <span className="rounded-full bg-black/35 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/95 ring-1 ring-white/15 backdrop-blur-sm">
                                {entry.movie.mediaType === "series" ? "Series" : "Movie"}
                              </span>
                              <div className="flex shrink-0 gap-1.5">
                                <span className="rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white/92 ring-1 ring-white/15 backdrop-blur-sm">
                                  {entry.movie.year}
                                </span>
                                <span className="rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white/92 ring-1 ring-white/15 backdrop-blur-sm">
                                  {entry.movie.runtime}
                                </span>
                              </div>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                              <h3 className="line-clamp-2 text-[0.9375rem] font-bold leading-tight text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)] sm:text-base">
                                {entry.movie.title}
                              </h3>
                            </div>
                          </div>

                          <div className="space-y-3 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${mutualChipClass(isDarkMode)}`}
                              >
                                Shared match
                              </span>
                              <span
                                className={`max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-semibold ${partnerChipClass(isDarkMode)}`}
                              >
                                You & {entry.partner.name}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${ratingChipClass(isDarkMode)}`}
                              >
                                ★ {entry.movie.rating.toFixed(1)}
                              </span>
                            </div>

                            <p className={`text-xs leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                              Both of you said yes to this title.
                            </p>

                            <p className={`text-[11px] font-medium ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                              {entry.movie.genre.join(" • ")}
                            </p>

                            <div
                              className={`rounded-[18px] border px-3 py-3 sm:px-3.5 sm:py-3.5 ${
                                isDarkMode
                                  ? "border-white/10 bg-black/30"
                                  : "border-slate-200/90 bg-slate-50/95"
                              }`}
                            >
                              <p
                                className={`text-xs leading-relaxed ${
                                  !expanded && needsMore ? "line-clamp-3" : ""
                                } ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}
                              >
                                {desc}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                                {needsMore ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleDescription(key)}
                                    className={`shared-detail-link min-h-9 underline-offset-2 hover:underline ${
                                      isDarkMode ? "text-violet-300" : "text-violet-700"
                                    }`}
                                  >
                                    {expanded ? "Show less" : "Show more"}
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => setDetailsMovie(entry)}
                                  className={`shared-detail-link min-h-9 underline-offset-2 hover:underline ${
                                    isDarkMode ? "text-slate-300" : "text-slate-600"
                                  }`}
                                >
                                  Full details
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2.5 pt-0.5">
                              <TogglePill
                                label={hasProAccess ? "Keep in shared list" : "Keep in shared list (Pro)"}
                                checked={entry.shared}
                                locked={!hasProAccess}
                                isDarkMode={isDarkMode}
                                onChange={async (checked) => {
                                  if (!hasProAccess) {
                                    return;
                                  }
                                  await toggleSharedMovie(entry.partner.id, entry.movie.id, checked);
                                }}
                              />
                              <TogglePill
                                label="Watched together"
                                checked={entry.watched}
                                isDarkMode={isDarkMode}
                                onChange={async (checked) => {
                                  await toggleWatched(entry.partner.id, entry.movie.id, checked);
                                }}
                              />
                              {!hasProAccess ? (
                                <div
                                  className={`rounded-[14px] border px-3 py-2 text-[11px] leading-relaxed ${
                                    isDarkMode
                                      ? "border-violet-400/25 bg-violet-500/10 text-violet-100"
                                      : "border-violet-200/90 bg-violet-50 text-violet-700"
                                  }`}
                                >
                                  <p>
                                    Only “Keep in shared list” is Pro. “Watched together” is free for
                                    everyone.
                                  </p>
                                  <Link href="/settings" className="ui-btn ui-btn-primary mt-2 !px-3 !py-1.5 !text-[11px]">
                                    Buy Pro
                                  </Link>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </SurfaceCard>
            );
          })}
        </div>
        </div>
      </div>

      {detailsMovie ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/55 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close details"
            onClick={closeDetails}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`shared-details-modal shared-ui-copy ui-shell ui-shell--dialog-md relative z-10 flex max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem))] flex-col overflow-hidden rounded-[30px] shadow-[0_16px_48px_rgba(15,23,42,0.16)] ${
              isDarkMode ? "border border-white/10 bg-slate-950" : "bg-white"
            }`}
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div className="ui-shell-header !border-b-black/6 shrink-0">
              <p
                className={`min-w-0 flex-1 text-[11px] font-medium tracking-[0.01em] ${
                  isDarkMode ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Mutual match details
              </p>
              <button
                type="button"
                aria-label="Close details"
                onClick={closeDetails}
                className={`ui-shell-close ${
                  isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
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

            <div className="ui-shell-body !min-h-0 !flex-1 !overflow-y-auto !pt-4">
              <div
                className="relative h-52 overflow-hidden rounded-[24px]"
                style={{
                  backgroundImage: detailsMovie.movie.poster.imageUrl
                    ? undefined
                    : `linear-gradient(135deg, ${detailsMovie.movie.poster.accentFrom}, ${detailsMovie.movie.poster.accentTo})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <PosterBackdrop
                  imageUrl={detailsMovie.movie.poster.imageUrl}
                  profile="hero"
                  objectFit="cover"
                />
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/friends/${detailsMovie.partner.id}`}
                    className="shrink-0 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-violet-400/80"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <AvatarBadge
                      initials={detailsMovie.partner.avatar}
                      imageUrl={detailsMovie.partner.avatarImageUrl}
                      sizeClassName="h-9 w-9"
                      textClassName="text-xs font-semibold"
                    />
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${mutualChipClass(isDarkMode)}`}
                  >
                    Shared match
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      {detailsMovie.movie.title}
                    </h3>
                    <p className={`mt-1 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                      {detailsMovie.movie.year} • {detailsMovie.movie.runtime} • with {detailsMovie.partner.name}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums ${ratingChipClass(isDarkMode)}`}>
                    ★ {detailsMovie.movie.rating.toFixed(1)}
                  </span>
                </div>

                <p className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                  {detailsMovie.movie.genre.join(" • ")}
                </p>

                <p
                  className={`text-xs leading-relaxed ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}
                >
                  {detailsMovie.movie.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
