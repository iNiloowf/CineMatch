"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ModalPortal } from "@/components/modal-portal";
import { MovieDetailsModal } from "@/components/movie-details-modal";
import { PageHeader } from "@/components/page-header";
import { PicksMovieRow } from "@/components/picks-movie-row";
import { AppRouteEmptyCard } from "@/components/app-route-status";
import { SurfaceCard } from "@/components/surface-card";
import {
  shouldVirtualizeList,
  VirtualScrollList,
} from "@/components/virtual-scroll-list";
import { useAppState } from "@/lib/app-state";
import { useSegmentedPillDrag } from "@/lib/use-segmented-pill-drag";

type ShareToast = { message: string; variant: "success" | "error" };

function picksTabFromSearchParam(tab: string | null): "queue" | "watched" {
  return tab === "watched" ? "watched" : "queue";
}

export default function PicksPage() {
  const searchParams = useSearchParams();
  const {
    data,
    currentUserId,
    acceptedMovies,
    sharedMovies,
    removePick,
    markPickWatched,
    unmarkPickWatched,
    watchedPickReviews,
    isDarkMode,
  } = useAppState();
  const [pendingRemoveMovieId, setPendingRemoveMovieId] = useState<string | null>(null);
  const [pendingWatchedMovieId, setPendingWatchedMovieId] = useState<string | null>(null);
  const [picksListTab, setPicksListTab] = useState<"queue" | "watched">(() =>
    picksTabFromSearchParam(searchParams.get("tab")),
  );
  const prevPicksListTabRef = useRef(picksListTab);
  const picksTabPanelRef = useRef<HTMLDivElement | null>(null);
  const [shareToast, setShareToast] = useState<ShareToast | null>(null);
  const shareToastTimerRef = useRef<number | null>(null);
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

  const reduceMotion = useMemo(() => {
    if (!currentUserId) {
      return false;
    }
    return data.settings[currentUserId]?.reduceMotion ?? false;
  }, [currentUserId, data.settings]);

  const picksListPillIndex = picksListTab === "queue" ? 0 : 1;
  const onPicksListTabCommit = useCallback((index: number) => {
    setPicksListTab(index === 0 ? "queue" : "watched");
  }, []);

  const picksPillDrag = useSegmentedPillDrag({
    panelRef: picksTabPanelRef,
    tabCount: 2,
    activeIndex: picksListPillIndex,
    enabled: acceptedMovies.length > 0,
    reduceMotion,
    trackPaddingPx: 8,
    activeSlotSelector: '[data-picks-pill-tab="true"][data-picks-tab-active="true"]',
    onIndexCommit: onPicksListTabCommit,
  });

  useLayoutEffect(() => {
    prevPicksListTabRef.current = picksListTab;
  }, [picksListTab]);

  useEffect(() => {
    setPicksListTab(picksTabFromSearchParam(searchParams.get("tab")));
  }, [searchParams]);

  const pendingRemoveMovie = useMemo(
    () =>
      pendingRemoveMovieId
        ? acceptedMovies.find((movie) => movie.id === pendingRemoveMovieId) ?? null
        : null,
    [acceptedMovies, pendingRemoveMovieId],
  );
  const pendingWatchedMovie = useMemo(
    () =>
      pendingWatchedMovieId
        ? acceptedMovies.find((movie) => movie.id === pendingWatchedMovieId) ?? null
        : null,
    [acceptedMovies, pendingWatchedMovieId],
  );
  const selectedMovie = useMemo(
    () =>
      selectedMovieId
        ? acceptedMovies.find((movie) => movie.id === selectedMovieId) ?? null
        : null,
    [acceptedMovies, selectedMovieId],
  );

  const partnerNamesByPickId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of sharedMovies) {
      const list = map.get(entry.movie.id) ?? [];
      list.push(entry.partner.name);
      map.set(entry.movie.id, list);
    }
    return map;
  }, [sharedMovies]);

  const watchedMovieIdSet = useMemo(
    () => new Set(watchedPickReviews.map((entry) => entry.movie.id)),
    [watchedPickReviews],
  );

  const queueMovies = useMemo(
    () => acceptedMovies.filter((movie) => !watchedMovieIdSet.has(movie.id)),
    [acceptedMovies, watchedMovieIdSet],
  );

  const queueCount = queueMovies.length;
  const watchedCount = watchedPickReviews.length;

  const mutualPickCount = useMemo(
    () => new Set(sharedMovies.map((entry) => entry.movie.id)).size,
    [sharedMovies],
  );
  useEffect(() => {
    return () => {
      if (shareToastTimerRef.current) {
        window.clearTimeout(shareToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const anyOpen = Boolean(
      selectedMovieId || pendingRemoveMovieId || pendingWatchedMovieId,
    );
    if (!anyOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      if (pendingRemoveMovieId) {
        setPendingRemoveMovieId(null);
        return;
      }
      if (pendingWatchedMovieId) {
        setPendingWatchedMovieId(null);
        return;
      }
      if (selectedMovieId) {
        setSelectedMovieId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedMovieId, pendingRemoveMovieId, pendingWatchedMovieId]);

  useLayoutEffect(() => {
    if (!pendingWatchedMovieId && !pendingRemoveMovieId) {
      return;
    }
    const el = document.getElementById("main-content");
    if (!el) {
      return;
    }
    const previous = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = previous;
    };
  }, [pendingWatchedMovieId, pendingRemoveMovieId]);

  const showShareToast = useCallback((message: string, variant: ShareToast["variant"]) => {
    if (shareToastTimerRef.current) {
      window.clearTimeout(shareToastTimerRef.current);
    }
    setShareToast({ message, variant });
    shareToastTimerRef.current = window.setTimeout(() => {
      setShareToast(null);
    }, 3200);
  }, []);

  const handleShareMovie = useCallback(async (movieId: string) => {
    if (typeof window === "undefined") {
      return;
    }

    const shareUrl = `${window.location.origin}/discover?movieId=${encodeURIComponent(movieId)}`;
    const title =
      acceptedMovies.find((m) => m.id === movieId)?.title ??
      data.movies.find((m) => m.id === movieId)?.title ??
      "this title";

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${title} · CineMatch`,
          text: `Open in CineMatch to swipe on “${title}”.`,
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
  }, [acceptedMovies, data.movies, showShareToast]);

  const openPickDetails = useCallback((movieId: string) => {
    setSelectedMovieId(movieId);
  }, []);

  const requestRemovePick = useCallback((movieId: string) => {
    setSelectedMovieId(null);
    setPendingRemoveMovieId(movieId);
  }, []);
  const requestMarkWatched = useCallback((movieId: string) => {
    setSelectedMovieId(null);
    setPendingWatchedMovieId(movieId);
  }, []);

  const handleUnwatch = useCallback(
    (movieId: string) => {
      void unmarkPickWatched(movieId);
    },
    [unmarkPickWatched],
  );

  const detailsModal = (
    <MovieDetailsModal
      movie={selectedMovie}
      isDarkMode={isDarkMode}
      onClose={() => setSelectedMovieId(null)}
      closeOnGestureMove
      footer={() =>
        selectedMovie ? (
          <>
            <button
              type="button"
              className={`min-h-11 w-full rounded-md border px-3 py-2.5 text-[11px] font-semibold transition sm:rounded-[10px] sm:px-3.5 sm:text-xs ${
                isDarkMode
                  ? "border-white/20 bg-slate-900/95 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-slate-800/95 active:bg-slate-800"
                  : "border-slate-300/80 bg-white/50 text-slate-800 shadow-sm backdrop-blur-xl hover:bg-white/70"
              }`}
              onClick={() => void handleShareMovie(selectedMovie.id)}
            >
              Share link
            </button>
          </>
        ) : null
      }
    />
  );

  const prevPicksListTab = prevPicksListTabRef.current;
  let picksListTabAnimate = false;
  let picksListTabDir: "forward" | "back" | null = null;
  if (prevPicksListTab !== picksListTab) {
    picksListTabAnimate = true;
    const tabIndex = (tab: "queue" | "watched") => (tab === "queue" ? 0 : 1);
    const fromIdx = tabIndex(prevPicksListTab);
    const toIdx = tabIndex(picksListTab);
    if (fromIdx !== toIdx) {
      picksListTabDir = toIdx > fromIdx ? "forward" : "back";
    }
  }

  const picksListTabPanelClass = !picksListTabAnimate
    ? "tab-route-surface"
    : picksListTabDir === "forward"
      ? "tab-route-surface tab-route-enter tab-route-enter--forward"
      : picksListTabDir === "back"
        ? "tab-route-surface tab-route-enter tab-route-enter--back"
        : "tab-route-surface tab-route-enter tab-route-enter--fade";

  return (
    <>
      <div className="app-screen-stack">
        <div className="fade-up-enter">
          <PageHeader
            eyebrow="Your picks"
            title="Accepted Movies"
            description="Everything you said yes to, ready for solo nights or shared watch plans."
          />
        </div>

        {acceptedMovies.length > 0 ? (
          <div
            ref={picksTabPanelRef}
            data-picks-pill-panel="true"
            data-pill-dragging={picksPillDrag.isDragging ? "true" : undefined}
            onTouchStart={picksPillDrag.onTouchStart}
            className={`fade-up-enter relative flex overflow-hidden rounded-[var(--radius-lg)] border p-1 ${
              picksPillDrag.isDragging ? "touch-none" : "touch-manipulation"
            } ${
              isDarkMode
                ? "border-white/10 bg-white/[0.06]"
                : "border-slate-200/90 bg-slate-100"
            }`}
            role="tablist"
            aria-label="Picks lists"
            style={{ animationDelay: "24ms" }}
          >
            <span
              aria-hidden
              className={`pointer-events-none absolute bottom-1 left-1 top-1 z-0 rounded-[10px] will-change-transform motion-reduce:will-change-auto ${
                isDarkMode
                  ? "bg-gradient-to-b from-violet-500/92 via-violet-600 to-violet-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_24px_rgba(109,40,217,0.32)]"
                  : "bg-gradient-to-b from-violet-400 via-violet-500 to-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_22px_rgba(109,40,217,0.22)]"
              }`}
              style={picksPillDrag.pillTransformStyle}
            />
            <button
              type="button"
              role="tab"
              aria-selected={picksListTab === "queue"}
              data-picks-pill-tab="true"
              data-picks-tab-active={picksPillDrag.visualHighlightIndex === 0 ? true : undefined}
              onClick={(e) => {
                if (picksPillDrag.onSegmentClick(e)) {
                  return;
                }
                setPicksListTab("queue");
              }}
              className={`picks-tab-label relative z-10 flex min-h-10 min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] px-2 py-1.5 text-center transition-[transform,color] duration-300 ease-out motion-reduce:transition-colors motion-reduce:duration-150 ${
                picksPillDrag.visualHighlightIndex === 0
                  ? "text-white"
                  : isDarkMode
                    ? "text-slate-400 active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:text-slate-200"
                    : "text-slate-500 active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:text-slate-800"
              }`}
            >
              <span className="text-sm font-semibold leading-tight">
                To watch
                <span className="ml-1 tabular-nums font-semibold opacity-80">({queueCount})</span>
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={picksListTab === "watched"}
              data-picks-pill-tab="true"
              data-picks-tab-active={picksPillDrag.visualHighlightIndex === 1 ? true : undefined}
              onClick={(e) => {
                if (picksPillDrag.onSegmentClick(e)) {
                  return;
                }
                setPicksListTab("watched");
              }}
              className={`picks-tab-label relative z-10 flex min-h-10 min-w-0 flex-1 flex-col items-center justify-center rounded-[10px] px-2 py-1.5 text-center transition-[transform,color] duration-300 ease-out motion-reduce:transition-colors motion-reduce:duration-150 ${
                picksPillDrag.visualHighlightIndex === 1
                  ? "text-white"
                  : isDarkMode
                    ? "text-slate-400 active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:text-slate-200"
                    : "text-slate-500 active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:text-slate-800"
              }`}
            >
              <span className="text-sm font-semibold leading-tight">
                Watched
                <span className="ml-1 tabular-nums font-semibold opacity-80">({watchedCount})</span>
              </span>
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <SurfaceCard
            className="picks-stat-enter p-4 sm:p-5"
            style={{ animationDelay: "40ms" }}
            interactive={false}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                isDarkMode ? "text-violet-300/90" : "text-violet-600/90"
              }`}
            >
              Saved
            </p>
            <div className="mt-1 flex items-end gap-3">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                  isDarkMode ? "bg-violet-500/18 text-violet-100" : "bg-violet-100 text-violet-700"
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M7.75 4.75h8.5A2.75 2.75 0 0 1 19 7.5v11.75l-7-3.75-7 3.75V7.5A2.75 2.75 0 0 1 7.75 4.75Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className={`${isDarkMode ? "text-slate-50" : "text-slate-900"} text-3xl font-bold tabular-nums`}>
                {acceptedMovies.length}
              </p>
            </div>
          </SurfaceCard>
          <SurfaceCard
            className="picks-stat-enter p-4 sm:p-5"
            style={{ animationDelay: "40ms" }}
            interactive={false}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                isDarkMode ? "text-emerald-300/90" : "text-emerald-700/90"
              }`}
            >
              Also shared
            </p>
            <div className="mt-1 flex items-end gap-3">
              <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                  isDarkMode ? "bg-emerald-500/16 text-emerald-100" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path
                    d="M12 18.5s-6.25-3.89-6.25-9a3.75 3.75 0 0 1 6.25-2.78A3.75 3.75 0 0 1 18.25 9.5c0 5.11-6.25 9-6.25 9Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p className={`${isDarkMode ? "text-slate-50" : "text-slate-900"} text-3xl font-bold tabular-nums`}>
                {mutualPickCount}
              </p>
            </div>
          </SurfaceCard>
        </div>

        {acceptedMovies.length > 0 ? (
          <div className="space-y-3">
            <div
              className={`${picksListTabPanelClass} min-w-0 space-y-3 overflow-x-clip sm:space-y-3.5`}
              data-picks-list-tab={picksListTab}
            >
              {picksListTab === "queue" ? (
                queueMovies.length > 0 ? (
                  queueMovies.map((movie, index) => (
                    <PicksMovieRow
                      key={movie.id}
                      movie={movie}
                      listIndex={index}
                      matchingPartners={partnerNamesByPickId.get(movie.id) ?? []}
                      isDarkMode={isDarkMode}
                      onOpenDetails={openPickDetails}
                      onShare={handleShareMovie}
                      onMarkWatched={requestMarkWatched}
                      onRequestRemove={requestRemovePick}
                    />
                  ))
                ) : (
                  <SurfaceCard className="space-y-2 px-4 py-5 text-center sm:px-5">
                    <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      Everything here is marked watched
                    </p>
                    <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Open the Watched tab to review titles or mark them as not watched yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setPicksListTab("watched")}
                      className="ui-btn ui-btn-secondary mt-1 w-full sm:mx-auto sm:w-auto"
                    >
                      Go to Watched
                    </button>
                  </SurfaceCard>
                )
              ) : watchedPickReviews.length > 0 ? (
                shouldVirtualizeList(watchedPickReviews.length) ? (
                  <VirtualScrollList count={watchedPickReviews.length} estimateItemSize={128}>
                    {(index) => {
                      const entry = watchedPickReviews[index]!;
                      return (
                        <PicksMovieRow
                          key={`${entry.movie.id}-${entry.watchedAt}`}
                          variant="watched"
                          movie={entry.movie}
                          watchedRecommended={entry.recommended}
                          listIndex={index}
                          matchingPartners={partnerNamesByPickId.get(entry.movie.id) ?? []}
                          isDarkMode={isDarkMode}
                          onOpenDetails={openPickDetails}
                          onShare={handleShareMovie}
                          onMarkWatched={requestMarkWatched}
                          onRequestRemove={requestRemovePick}
                          onUnwatch={handleUnwatch}
                        />
                      );
                    }}
                  </VirtualScrollList>
                ) : (
                  watchedPickReviews.map((entry, index) => (
                    <PicksMovieRow
                      key={`${entry.movie.id}-${entry.watchedAt}`}
                      variant="watched"
                      movie={entry.movie}
                      watchedRecommended={entry.recommended}
                      listIndex={index}
                      matchingPartners={partnerNamesByPickId.get(entry.movie.id) ?? []}
                      isDarkMode={isDarkMode}
                      onOpenDetails={openPickDetails}
                      onShare={handleShareMovie}
                      onMarkWatched={requestMarkWatched}
                      onRequestRemove={requestRemovePick}
                      onUnwatch={handleUnwatch}
                    />
                  ))
                )
              ) : (
                <SurfaceCard className="space-y-2 px-4 py-5 text-center sm:px-5">
                  <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    No watched titles yet
                  </p>
                  <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Mark a pick as watched from the To watch tab — it will show up here.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPicksListTab("queue")}
                    className="ui-btn ui-btn-secondary mt-1 w-full sm:mx-auto sm:w-auto"
                  >
                    Back to To watch
                  </button>
                </SurfaceCard>
              )}
            </div>
          </div>
        ) : null}

        {acceptedMovies.length === 0 ? (
          <AppRouteEmptyCard
            title="No picks yet"
            description="Start in Discover and accept the movies that feel right."
            isDarkMode={isDarkMode}
            tone="comfortable"
            className="fade-up-enter space-y-3 text-center"
            style={{ animationDelay: "160ms" }}
            primaryAction={{ label: "Go to Discover", href: "/discover" }}
          />
        ) : null}
      </div>

      <ModalPortal open={Boolean(pendingRemoveMovie)}>
        {pendingRemoveMovie ? (
            <div className="ui-overlay z-[var(--z-modal)] bg-slate-950/50 backdrop-blur-md">
              <button
                type="button"
                aria-label="Close remove confirmation"
                onClick={() => setPendingRemoveMovieId(null)}
                className="absolute inset-0 cursor-default bg-transparent"
              />
              <div
                className={`ui-shell ui-shell--dialog-sm relative z-10 flex max-h-[min(92dvh,26rem)] flex-col overflow-hidden rounded-[28px] border shadow-[0_30px_80px_rgba(15,23,42,0.28)] ${
                  isDarkMode
                    ? "border-white/10 bg-slate-950 text-white"
                    : "border-white/80 bg-white text-slate-900"
                }`}
              >
                <span className="ui-modal-accent-bar" aria-hidden />
                <div className="ui-shell-header !border-b-black/6 shrink-0">
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
                <div className="ui-shell-body !min-h-0 !flex-1 !overflow-y-auto !pt-4">
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
                <div className={`ui-shell-footer !pt-4 shrink-0 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
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
      </ModalPortal>
      <ModalPortal open={Boolean(pendingWatchedMovie)}>
        {pendingWatchedMovie ? (
            <div className="ui-overlay z-[var(--z-modal)] bg-slate-950/50 backdrop-blur-md">
              <button
                type="button"
                aria-label="Close watched confirmation"
                onClick={() => setPendingWatchedMovieId(null)}
                className="absolute inset-0 cursor-default bg-transparent"
              />
              <div
                className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto flex w-[min(100%,22rem)] max-w-[calc(100dvi-2rem)] flex-col overflow-hidden rounded-[28px] border shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:w-full ${
                  isDarkMode
                    ? "border-white/10 bg-slate-950 text-white"
                    : "border-white/80 bg-white text-slate-900"
                }`}
              >
                <span className="ui-modal-accent-bar" aria-hidden />
                <div className={`ui-shell-header shrink-0 ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}>
                  <div className="min-w-0 flex-1 pr-2">
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-violet-300/90" : "text-violet-600/90"}`}>
                      Your take
                    </p>
                    <h3 id="picks-watched-dialog-title" className="mt-1 line-clamp-2 text-base font-semibold leading-snug sm:text-lg">
                      {pendingWatchedMovie.title}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPendingWatchedMovieId(null)}
                    aria-label="Close"
                    className={`ui-shell-close shrink-0 ${
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
                    className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                    id="picks-watched-dialog-desc"
                  >
                    Would you recommend this to a friend?
                  </p>
                </div>
                <div
                  className={`ui-shell-footer !flex-col !gap-2 !pt-4 sm:!flex-row sm:!gap-3 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}
                  role="group"
                  aria-labelledby="picks-watched-dialog-title"
                  aria-describedby="picks-watched-dialog-desc"
                >
                  <button
                    type="button"
                    onClick={async () => {
                      await markPickWatched(pendingWatchedMovie.id, false);
                      setPendingWatchedMovieId(null);
                    }}
                    className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400/80 sm:min-w-0 sm:flex-1 ${
                      isDarkMode
                        ? "border-red-500/45 bg-red-950/25 text-red-200/95 hover:border-red-400/55 hover:bg-red-950/45"
                        : "border-red-300/90 bg-red-50/40 text-red-800 hover:border-red-400 hover:bg-red-50/90"
                    }`}
                  >
                    Not for me
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await markPickWatched(pendingWatchedMovie.id, true);
                      setPendingWatchedMovieId(null);
                    }}
                    className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-sm font-semibold transition active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400/80 sm:min-w-0 sm:flex-1 ${
                      isDarkMode
                        ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-200/95 hover:border-emerald-400/50 hover:bg-emerald-950/40"
                        : "border-emerald-300/90 bg-emerald-50/50 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50"
                    }`}
                  >
                    Recommend
                  </button>
                </div>
              </div>
            </div>
        ) : null}
      </ModalPortal>
      {detailsModal}
      {shareToast && typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[var(--z-toast-anchor)] flex justify-center px-4">
              <div
                role="status"
                className={`discover-toolbar-enter pointer-events-auto max-w-md rounded-[22px] border px-4 py-3 text-center text-sm font-semibold shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl ${
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

