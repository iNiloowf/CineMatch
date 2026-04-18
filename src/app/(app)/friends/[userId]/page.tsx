"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AchievementBadgesShowcase } from "@/components/achievement-badges-showcase";
import { AvatarBadge } from "@/components/avatar-badge";
import { MovieDetailsModal } from "@/components/movie-details-modal";
import { PageHeader } from "@/components/page-header";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { SurfaceCard } from "@/components/surface-card";
import {
  computeAchievements,
  getSavedMoviesForUser,
} from "@/lib/achievements";
import { partitionAchievements } from "@/lib/achievement-utils";
import { shareMovieDeepLink } from "@/lib/share-movie-link";
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
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null);

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

  const selectedMovie = useMemo(
    () => savedMovies.find((movie) => movie.id === selectedMovieId) ?? null,
    [savedMovies, selectedMovieId],
  );
  const partnerGenreInsights = useMemo(() => {
    const likedCounts = new Map<string, number>();
    const dislikedCounts = new Map<string, number>();
    const movieById = new Map(data.movies.map((movie) => [movie.id, movie]));

    for (const swipe of data.swipes) {
      if (swipe.userId !== userId) {
        continue;
      }

      const movie = movieById.get(swipe.movieId);
      if (!movie) {
        continue;
      }

      const targetCounts =
        swipe.decision === "accepted" ? likedCounts : dislikedCounts;

      for (const genre of movie.genre) {
        targetCounts.set(genre, (targetCounts.get(genre) ?? 0) + 1);
      }
    }

    const toSortedEntries = (counts: Map<string, number>) =>
      Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count }));

    return {
      liked: toSortedEntries(likedCounts),
      disliked: toSortedEntries(dislikedCounts),
    };
  }, [data.movies, data.swipes, userId]);

  const sectionEyebrow = isDarkMode
    ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90"
    : "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600/90";
  const partnerProfileStyle = partner?.profileStyle ?? "classic";
  const friendHeaderStyleClass =
    partnerProfileStyle === "glass"
      ? isDarkMode
        ? "border-b border-white/10 bg-gradient-to-br from-violet-950/50 via-slate-950/40 to-fuchsia-950/20 backdrop-blur-xl"
        : "border-b border-cyan-200/80 bg-white/75 backdrop-blur-xl"
      : partnerProfileStyle === "neon"
        ? isDarkMode
          ? "border-b border-fuchsia-300/25 bg-gradient-to-br from-slate-950 via-violet-950/60 to-fuchsia-950/45"
          : "border-b border-fuchsia-300/70 bg-gradient-to-br from-fuchsia-100 via-violet-100 to-indigo-100"
        : isDarkMode
          ? "border-b border-white/10 bg-slate-950"
          : "border-b border-slate-200/90 bg-white";
  const friendHeaderPatternClass =
    partnerProfileStyle === "glass"
      ? isDarkMode
        ? "bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.24)_0_7%,transparent_24%),radial-gradient(circle_at_82%_72%,rgba(255,255,255,0.14)_0_8%,transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] opacity-85"
        : "bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.86)_0_7%,transparent_24%),radial-gradient(circle_at_82%_72%,rgba(255,255,255,0.75)_0_8%,transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.6),transparent)] opacity-90"
      : partnerProfileStyle === "neon"
        ? isDarkMode
          ? "bg-[repeating-linear-gradient(45deg,rgba(236,72,153,0.2)_0_6px,transparent_6px_14px),repeating-linear-gradient(-45deg,rgba(59,130,246,0.18)_0_5px,transparent_5px_13px)] opacity-85"
          : "bg-[repeating-linear-gradient(45deg,rgba(236,72,153,0.18)_0_6px,transparent_6px_14px),repeating-linear-gradient(-45deg,rgba(99,102,241,0.16)_0_5px,transparent_5px_13px)] opacity-80"
        : isDarkMode
          ? "bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0_2px,transparent_2px_12px)] opacity-70"
          : "bg-[repeating-linear-gradient(90deg,rgba(100,116,139,0.12)_0_2px,transparent_2px_12px)] opacity-65";

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

  const handleShareMovie = useCallback(async (movieId: string) => {
    const msg = await shareMovieDeepLink(movieId);
    setAddMessage(msg);
    window.setTimeout(() => setAddMessage(null), 2400);
  }, []);

  if (!isReady) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <div
          className={`h-10 w-10 animate-spin rounded-full border-2 border-t-transparent ${
            isDarkMode ? "border-white/20 border-t-violet-300" : "border-slate-200 border-t-violet-600"
          }`}
          aria-hidden
        />
        <p className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Loading…
        </p>
      </div>
    );
  }

  if (!currentUserId || !userId || !partner || !linkEntry) {
    return (
      <div className="space-y-4">
        <PageHeader eyebrow="Friends" title="Profile unavailable" description="" />
        <SurfaceCard className="fade-up-enter space-y-3 px-5 py-6 text-center">
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

  const inMineSelected = selectedMovie ? myAcceptedIds.has(selectedMovie.id) : false;

  return (
    <div className="space-y-5 pb-2">
      {selectedMovie ? (
        <MovieDetailsModal
          movie={selectedMovie}
          isDarkMode={isDarkMode}
          onClose={() => setSelectedMovieId(null)}
          contextLabel={`${partner.name}’s pick`}
          footer={({ openTrailer }) => (
            <>
              <button
                type="button"
                className="ui-btn ui-btn-primary min-h-12 w-full flex-1 sm:min-w-0"
                onClick={() => void handleShareMovie(selectedMovie.id)}
              >
                Share link
              </button>
              <button
                type="button"
                className="ui-btn ui-btn-secondary min-h-12 w-full flex-1 sm:min-w-0"
                onClick={() => void openTrailer()}
              >
                Watch trailer
              </button>
              {linkEntry.status === "accepted" && !inMineSelected ? (
                <button
                  type="button"
                  className={`ui-btn min-h-12 w-full flex-1 sm:min-w-0 ${
                    isDarkMode
                      ? "border-violet-400/35 bg-violet-500/18 text-violet-50 hover:bg-violet-500/26"
                      : "border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100"
                  }`}
                  onClick={() => {
                    void handleAddPick(selectedMovie.id);
                    setSelectedMovieId(null);
                  }}
                >
                  Add to my picks
                </button>
              ) : null}
            </>
          )}
        />
      ) : null}

      <div className="fade-up-enter flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition hover:brightness-110 active:scale-[0.98] ${
            isDarkMode
              ? "bg-white/10 text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:bg-white/14"
              : "bg-white text-slate-800 shadow-md ring-1 ring-slate-200/90 hover:bg-slate-50"
          }`}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
      </div>

      <div className="fade-up-enter" style={{ animationDelay: "45ms" }}>
        <PageHeader
          eyebrow="Friend profile"
          title={partner.name}
          description={
            linkEntry.status === "accepted"
              ? "Badges, saved picks — tap a title for full details."
              : "Pending link — saved picks appear when you’re both active."
          }
        />
      </div>

      <SurfaceCard
        className="fade-up-enter !p-0 overflow-hidden shadow-[0_16px_48px_rgba(109,40,217,0.08)] transition-transform duration-300 hover:shadow-[0_20px_56px_rgba(109,40,217,0.12)]"
        style={{ animationDelay: "80ms" }}
      >
        <div
          className={`relative flex items-center gap-4 px-5 py-5 sm:px-6 sm:py-6 ${friendHeaderStyleClass}`}
        >
          <span className={`pointer-events-none absolute inset-0 ${friendHeaderPatternClass}`} aria-hidden />
          <div className="profile-avatar-pop relative shrink-0">
            <div
              className={`rounded-full p-0.5 ${isDarkMode ? "bg-gradient-to-br from-violet-400/50 to-fuchsia-500/30" : "bg-gradient-to-br from-violet-400 to-fuchsia-400"}`}
            >
              <AvatarBadge
                initials={partner.avatar}
                imageUrl={partner.avatarImageUrl}
                sizeClassName="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]"
                textClassName="text-xl font-bold"
              />
            </div>
          </div>
          <div className="relative min-w-0 flex-1">
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
            className={`px-5 py-4 text-sm leading-6 sm:px-6 ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {partner.bio}
          </p>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        className="fade-up-enter space-y-4 !p-5 sm:!p-6"
        style={{ animationDelay: "110ms" }}
      >
        <AchievementBadgesShowcase earned={earnedBadges} isDarkMode={isDarkMode} variant="friend" />
      </SurfaceCard>

      <SurfaceCard className="fade-up-enter space-y-4" style={{ animationDelay: "130ms" }}>
        <div className="space-y-1">
          <p className={sectionEyebrow}>Taste profile</p>
          <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Genres they like most
          </p>
          <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Based on their swipes and saved picks.
          </p>
        </div>

        {partnerGenreInsights.liked.length === 0 ? (
          <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            No genre signal yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {partnerGenreInsights.liked.slice(0, 10).map((genre) => (
              <span
                key={`liked-${genre.name}`}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isDarkMode
                    ? "border border-emerald-400/25 bg-emerald-500/12 text-emerald-100"
                    : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                {genre.name} ({genre.count})
              </span>
            ))}
          </div>
        )}

        <div className={`h-px w-full ${isDarkMode ? "bg-white/10" : "bg-slate-200/90"}`} />

        <div className="space-y-1">
          <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            Genres they skip
          </p>
          <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Based on rejected swipes (if available).
          </p>
        </div>

        {partnerGenreInsights.disliked.length === 0 ? (
          <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Not enough rejected-swipe data yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {partnerGenreInsights.disliked.slice(0, 10).map((genre) => (
              <span
                key={`disliked-${genre.name}`}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isDarkMode
                    ? "border border-rose-400/25 bg-rose-500/12 text-rose-100"
                    : "border border-rose-200 bg-rose-50 text-rose-800"
                }`}
              >
                {genre.name} ({genre.count})
              </span>
            ))}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard className="fade-up-enter space-y-4" style={{ animationDelay: "150ms" }}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className={sectionEyebrow}>Saved picks</p>
            <p
              className={`mt-1 text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}
            >
              Tap a movie for details
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
            {savedMovies.map((movie, index) => {
              const inMine = myAcceptedIds.has(movie.id);

              return (
                <li
                  key={movie.id}
                  className="discover-toolbar-enter"
                  style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                >
                  <div
                    className={`flex items-center gap-3 overflow-hidden rounded-[18px] border transition duration-200 ${
                      isDarkMode
                        ? "border-white/10 bg-white/[0.03] hover:border-violet-400/25 hover:bg-white/[0.06]"
                        : "border-slate-200/80 bg-white hover:border-violet-200 hover:shadow-sm"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMovieId(movie.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition active:scale-[0.99]"
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
                    </button>
                    {linkEntry.status === "accepted" ? (
                      <button
                        type="button"
                        disabled={inMine || addingId === movie.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleAddPick(movie.id);
                        }}
                        className={`mr-2 shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                          inMine
                            ? isDarkMode
                              ? "bg-white/8 text-slate-400"
                              : "bg-slate-100 text-slate-500"
                            : "ui-btn ui-btn-primary !min-h-0 px-3 py-1.5"
                        }`}
                      >
                        {inMine ? "Yours" : addingId === movie.id ? "Adding…" : "Add"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SurfaceCard>
    </div>
  );
}
