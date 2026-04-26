"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ModalPortal } from "@/components/modal-portal";
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
import { formatRuntimeForDisplay } from "@/lib/format-runtime-display";
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

      <ModalPortal open={Boolean(detailsMovie)}>
        {detailsMovie ? (
            <div
              className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-slate-950/48 backdrop-blur-[3px]"
            >
              <button
                type="button"
                aria-label="Close details"
                onClick={closeDetails}
                className="absolute inset-0 z-0 cursor-default bg-transparent"
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="shared-details-movie-title"
                className={`details-modal-shell shared-ui-copy ui-shell pointer-events-auto absolute inset-x-0 bottom-0 top-0 z-10 mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col shadow-[0_24px_80px_rgba(15,23,42,0.2)] ${
                  isDarkMode ? "bg-slate-950 text-white" : "bg-white text-slate-900"
                }`}
              >
                <span className="ui-modal-accent-bar" aria-hidden />
                <div
                  className={`ui-shell-header !border-b-black/6 !py-3 !pt-[max(1rem,env(safe-area-inset-top,0px))] shrink-0 ${
                    isDarkMode ? "bg-slate-950" : "bg-white"
                  }`}
                >
                  <p
                    className={`min-w-0 flex-1 truncate text-xs font-medium tracking-[0.01em] ${
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
                  className={`ui-shell-body !flex !min-h-0 !flex-1 !flex-col !overflow-hidden !px-0 !pb-0 !pt-0 ${
                    isDarkMode ? "bg-slate-950" : "bg-white"
                  }`}
                >
                  <div
                    className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4"
                    style={{
                      paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))",
                    }}
                  >
                    <p
                      className={`mb-3 flex items-center gap-2 text-[11px] font-semibold ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      <span aria-hidden className="select-none">
                        ↓
                      </span>
                      Scroll for your match and synopsis.
                    </p>

                    <div
                      className="relative overflow-hidden rounded-[18px] p-4 text-white shadow-[0_12px_32px_rgba(15,23,42,0.14)]"
                      style={{
                        backgroundImage: detailsMovie.movie.poster.imageUrl
                          ? undefined
                          : `linear-gradient(145deg, ${detailsMovie.movie.poster.accentFrom}, ${detailsMovie.movie.poster.accentTo})`,
                        backgroundSize: detailsMovie.movie.poster.imageUrl ? undefined : "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <PosterBackdrop
                        imageUrl={detailsMovie.movie.poster.imageUrl}
                        profile="hero"
                        objectFit="cover"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.05),transparent_38%,rgba(15,23,42,0.46)_100%)]" />
                      <div className="relative flex min-h-[12rem] flex-col justify-between sm:min-h-[13rem]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="rounded-full bg-violet-600/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                            {detailsMovie.movie.mediaType === "series" ? "Series" : "Movie"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white/88 backdrop-blur-md">
                              {detailsMovie.movie.year}
                            </span>
                            <span className="rounded-full bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-white/88 backdrop-blur-md">
                              {formatRuntimeForDisplay(detailsMovie.movie.runtime)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2 pt-6">
                          {detailsMovie.movie.genre.length > 0 ? (
                            <p className="text-xs font-medium text-white/90">
                              {detailsMovie.movie.genre.slice(0, 3).join(" • ")}
                            </p>
                          ) : null}
                          <h2
                            id="shared-details-movie-title"
                            className="text-[1.65rem] font-semibold leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.55)] sm:text-[1.8rem]"
                          >
                            {detailsMovie.movie.title}
                          </h2>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-3 sm:mt-5">
                      <Link
                        href={`/friends/${detailsMovie.partner.id}`}
                        className="shrink-0 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-violet-400/80"
                        onClick={closeDetails}
                      >
                        <AvatarBadge
                          initials={detailsMovie.partner.avatar}
                          imageUrl={detailsMovie.partner.avatarImageUrl}
                          sizeClassName="h-10 w-10"
                          textClassName="text-sm font-semibold"
                        />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${mutualChipClass(isDarkMode)}`}
                        >
                          Shared match
                        </span>
                        <p
                          className={`mt-1.5 text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}
                        >
                          with {detailsMovie.partner.name}
                        </p>
                        <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                          Tap the avatar to open their profile
                        </p>
                      </div>
                    </div>

                    <div
                      className={`mt-4 flex items-start justify-between gap-3 sm:mt-5 ${
                        isDarkMode ? "border-b border-white/8 pb-4" : "border-b border-slate-200/90 pb-4"
                      }`}
                    >
                      <p className={`min-w-0 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                        You both accepted this in Discover.
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${ratingChipClass(isDarkMode)}`}
                      >
                        ★ {detailsMovie.movie.rating.toFixed(1)}
                      </span>
                    </div>

                    {detailsMovie.movie.genre.length > 3 ? (
                      <p
                        className={`mt-3 text-[11px] leading-relaxed ${
                          isDarkMode ? "text-slate-500" : "text-slate-500"
                        }`}
                      >
                        {detailsMovie.movie.genre.join(" · ")}
                      </p>
                    ) : null}

                    <div
                      className={`relative mt-4 rounded-[22px] px-4 py-4 ${
                        isDarkMode ? "bg-white/10" : "border border-slate-200/90 bg-slate-50/95 shadow-sm"
                      }`}
                    >
                      <p
                        className={`text-[11px] leading-5 ${
                          isDarkMode ? "text-slate-200" : "text-slate-600"
                        }`}
                      >
                        {detailsMovie.movie.description}
                      </p>
                    </div>

                    <div
                      className={`pointer-events-none sticky bottom-0 z-[1] -mx-1 mt-2 h-8 bg-gradient-to-t ${
                        isDarkMode ? "from-slate-950" : "from-white"
                      } to-transparent`}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>
            </div>
        ) : null}
      </ModalPortal>
    </>
  );
}
