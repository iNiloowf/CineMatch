"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { MovieDetailsModal } from "@/components/movie-details-modal";
import { useEscapeToClose } from "@/lib/use-escape-to-close";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { AppRouteEmptyCard } from "@/components/app-route-status";
import { entryKey, mutualChipClass, SharedPartnerMovieCard } from "@/components/shared-partner-movie-card";
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
      <div className="app-screen-stack">
        <PageHeader
          eyebrow="Together"
          title="Shared Watchlist"
          description="Open each person to see what you matched on together."
        />

        <div className="shared-ui-copy space-y-[var(--app-section-gap)] sm:space-y-[var(--app-section-gap-lg)]">
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
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[18px] px-2 py-2 text-left transition sm:gap-3 sm:px-3"
                  >
                    <div className="min-w-0 flex-1 text-left">
                      <p
                        className={`truncate text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}
                        title={group.partner.name}
                      >
                        {group.partner.name}
                      </p>
                      <p
                        className={`truncate text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                        title={
                          group.movies.length > 0
                            ? `${group.movies.filter((movie) => movie.shared).length} titles you both picked`
                            : "No shared picks yet"
                        }
                      >
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

      <MovieDetailsModal
        movie={detailsMovie?.movie ?? null}
        isDarkMode={isDarkMode}
        onClose={closeDetails}
        contextLabel={detailsMovie ? `Shared match with ${detailsMovie.partner.name}` : undefined}
        footer={({ openTrailer }) =>
          detailsMovie ? (
            <>
              <Link
                href={`/friends/${detailsMovie.partner.id}`}
                className="ui-btn ui-btn-primary min-h-12 w-full flex-1 sm:min-w-0"
                onClick={closeDetails}
              >
                View {detailsMovie.partner.name}
              </Link>
              <button
                type="button"
                className="ui-btn ui-btn-secondary min-h-12 w-full flex-1 sm:min-w-0"
                onClick={() => void openTrailer()}
              >
                Watch trailer
              </button>
            </>
          ) : null
        }
      />
    </>
  );
}
