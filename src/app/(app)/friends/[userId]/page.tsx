"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AchievementBadgesShowcase } from "@/components/achievement-badges-showcase";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { SurfaceCard } from "@/components/surface-card";
import {
  computeAchievements,
  getSavedMoviesForUser,
} from "@/lib/achievements";
import { partitionAchievements } from "@/lib/achievement-utils";
import { useAppState } from "@/lib/app-state";

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = typeof params.userId === "string" ? params.userId : "";
  const {
    data,
    currentUserId,
    linkedUsers,
    swipeMovie,
    isDarkMode,
    isReady,
  } = useAppState();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addMessage, setAddMessage] = useState<string | null>(null);

  const linkEntry = useMemo(
    () => linkedUsers.find((entry) => entry.user.id === userId),
    [linkedUsers, userId],
  );

  const partner = linkEntry?.user ?? null;
  const myAcceptedIds = useMemo(
    () =>
      new Set(
        currentUserId
          ? data.swipes
              .filter(
                (swipe) =>
                  swipe.userId === currentUserId && swipe.decision === "accepted",
              )
              .map((swipe) => swipe.movieId)
          : [],
      ),
    [currentUserId, data.swipes],
  );

  const achievements = useMemo(
    () => (userId ? computeAchievements(data, userId) : []),
    [data, userId],
  );

  const earnedBadges = useMemo(
    () => partitionAchievements(achievements).completed,
    [achievements],
  );

  const savedMovies = useMemo(
    () => (userId ? getSavedMoviesForUser(data, userId) : []),
    [data, userId],
  );

  const sectionEyebrow = isDarkMode
    ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90"
    : "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600/90";

  if (!isReady) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <div
          className={`h-10 w-10 animate-spin rounded-full border-2 border-t-transparent ${
            isDarkMode ? "border-white/20 border-t-violet-300" : "border-slate-200 border-t-violet-600"
          }`}
          aria-hidden
        />
      </div>
    );
  }

  if (!currentUserId || !userId || !partner || !linkEntry) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Friends" title="Profile unavailable" description="" />
        <SurfaceCard className="space-y-3 px-5 py-6 text-center">
          <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            This person isn’t in your linked friends, or the link isn’t available yet.
          </p>
          <Link href="/linked" className="ui-btn ui-btn-primary inline-flex justify-center">
            Back to friends
          </Link>
        </SurfaceCard>
      </div>
    );
  }

  const handleAddPick = async (movieId: string) => {
    if (!currentUserId) {
      return;
    }
    setAddMessage(null);
    setAddingId(movieId);
    try {
      await swipeMovie(movieId, "accepted");
      setAddMessage("Added to your picks.");
      window.setTimeout(() => setAddMessage(null), 2200);
    } catch {
      setAddMessage("Couldn’t add that title. Try again.");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            isDarkMode ? "bg-white/10 text-slate-200 hover:bg-white/14" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Back
        </button>
      </div>

      <PageHeader
        eyebrow="Friend profile"
        title={partner.name}
        description={
          linkEntry.status === "accepted"
            ? "Their badges and saved picks — add titles to your list if you want."
            : "Pending link — saved picks appear when you’re both active."
        }
      />

      <SurfaceCard className="!p-0 overflow-hidden">
        <div
          className={`flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5 ${
            isDarkMode
              ? "border-b border-white/10 bg-gradient-to-br from-violet-950/40 to-white/[0.04]"
              : "border-b border-violet-100/90 bg-gradient-to-br from-violet-50/90 via-white to-sky-50/30"
          }`}
        >
          <AvatarBadge
            initials={partner.avatar}
            imageUrl={partner.avatarImageUrl}
            sizeClassName="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
            textClassName="text-xl font-bold"
          />
          <div className="min-w-0 flex-1">
            <p className={sectionEyebrow}>Linked friend</p>
            <p
              className={`mt-1 truncate text-lg font-bold sm:text-xl ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              {partner.name}
            </p>
            <p className={`mt-0.5 truncate text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              {partner.email}
            </p>
            {partner.city ? (
              <p className={`mt-1 text-xs font-medium ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                {partner.city}
              </p>
            ) : null}
          </div>
        </div>
        {partner.bio ? (
          <p
            className={`px-5 py-3 text-sm leading-6 sm:px-6 ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {partner.bio}
          </p>
        ) : null}
      </SurfaceCard>

      <SurfaceCard className="space-y-4 !p-5 sm:!p-6">
        <AchievementBadgesShowcase earned={earnedBadges} isDarkMode={isDarkMode} variant="friend" />
      </SurfaceCard>

      <SurfaceCard className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className={sectionEyebrow}>Saved picks</p>
            <p
              className={`mt-1 text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              Movies they kept from Discover
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-700"
            }`}
          >
            {savedMovies.length} title{savedMovies.length === 1 ? "" : "s"}
          </span>
        </div>

        {addMessage ? (
          <p
            className={`rounded-[14px] px-3 py-2 text-center text-xs font-medium ${
              isDarkMode ? "bg-violet-500/15 text-violet-100" : "bg-violet-50 text-violet-800"
            }`}
            role="status"
          >
            {addMessage}
          </p>
        ) : null}

        {savedMovies.length === 0 ? (
          <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            No saved picks yet — when they accept movies in Discover, they’ll show up here.
          </p>
        ) : (
          <ul className="space-y-2">
            {savedMovies.map((movie) => {
              const inMine = myAcceptedIds.has(movie.id);

              return (
                <li
                  key={movie.id}
                  className={`flex items-center gap-3 rounded-[18px] border px-3 py-2.5 ${
                    isDarkMode ? "border-white/10 bg-white/[0.03]" : "border-slate-200/80 bg-white"
                  }`}
                >
                  <div
                    className={`relative h-14 w-10 shrink-0 overflow-hidden rounded-lg ${
                      isDarkMode ? "bg-slate-800" : "bg-slate-100"
                    }`}
                  >
                    <PosterBackdrop imageUrl={movie.poster.imageUrl} profile="search" />
                    {!movie.poster.imageUrl ? (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-400">
                        CM
                      </div>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}
                    >
                      {movie.title}
                    </p>
                    <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {movie.year}
                      {inMine ? " · In your picks" : ""}
                    </p>
                  </div>
                  {linkEntry.status === "accepted" ? (
                    <button
                      type="button"
                      disabled={inMine || addingId === movie.id}
                      onClick={() => void handleAddPick(movie.id)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                        inMine
                          ? isDarkMode
                            ? "bg-white/8 text-slate-400"
                            : "bg-slate-100 text-slate-500"
                          : "ui-btn ui-btn-primary !min-h-0 px-3 py-1.5"
                      }`}
                    >
                      {inMine ? "Yours" : addingId === movie.id ? "Adding…" : "Add to mine"}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SurfaceCard>
    </div>
  );
}
