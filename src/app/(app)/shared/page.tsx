"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useEscapeToClose } from "@/lib/use-escape-to-close";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { AppRouteEmptyCard } from "@/components/app-route-status";
import { entryKey, mutualChipClass, ratingChipClass, SharedPartnerMovieCard } from "@/components/shared-partner-movie-card";
import { SurfaceCard } from "@/components/surface-card";
import {
  shouldVirtualizeList,
  VirtualScrollList,
} from "@/components/virtual-scroll-list";
import { useAppState } from "@/lib/app-state";
import type { SharedMovieView } from "@/lib/types";

export default function SharedWatchlistPage() {
  const { sharedMovieGroups, toggleWatched, toggleSharedMovie, isDarkMode, hasProAccess } = useAppState();
  const [openPartnerId, setOpenPartnerId] = useState<string | null>(null);
  const [detailsMovie, setDetailsMovie] = useState<SharedMovieView | null>(null);

  const closeDetails = useCallback(() => {
    setDetailsMovie(null);
  }, []);

  useEscapeToClose(Boolean(detailsMovie), closeDetails);

  return (
    <>
      <div className="space-y-4">
        <PageHeader
          eyebrow="Together"
          title="Shared Watchlist"
          description="Open each person to see what you matched on together."
        />

        <div className="shared-ui-copy space-y-4 px-0.5 sm:space-y-5 sm:px-1">
        {sharedMovieGroups.length === 0 ? (
          <AppRouteEmptyCard
            title="No linked people yet"
            description="Link with someone and their name will show up here right away."
            isDarkMode={isDarkMode}
            primaryAction={{ label: "Connect", href: "/connect" }}
          />
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

                    {shouldVirtualizeList(group.movies.length) ? (
                      <VirtualScrollList
                        count={group.movies.length}
                        estimateItemSize={280}
                        className="max-h-[min(72vh,36rem)] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                      >
                        {(index) => {
                          const entry = group.movies[index]!;
                          const key = entryKey(entry);
                          return (
                            <SharedPartnerMovieCard
                              key={key}
                              entry={entry}
                              isDarkMode={isDarkMode}
                              hasProAccess={hasProAccess}
                              onOpenDetails={() => setDetailsMovie(entry)}
                              toggleSharedMovie={toggleSharedMovie}
                              toggleWatched={toggleWatched}
                            />
                          );
                        }}
                      </VirtualScrollList>
                    ) : (
                      group.movies.map((entry) => {
                        const key = entryKey(entry);

                        return (
                          <SharedPartnerMovieCard
                            key={key}
                            entry={entry}
                            isDarkMode={isDarkMode}
                            hasProAccess={hasProAccess}
                            onOpenDetails={() => setDetailsMovie(entry)}
                            toggleSharedMovie={toggleSharedMovie}
                            toggleWatched={toggleWatched}
                          />
                        );
                      })
                    )}
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
