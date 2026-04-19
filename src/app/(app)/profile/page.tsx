"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AchievementBadgesShowcase } from "@/components/achievement-badges-showcase";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { partitionAchievements } from "@/lib/achievement-utils";
import { useAppState } from "@/lib/app-state";
import type { ProProfileStyle } from "@/lib/types";
import { useEscapeToClose } from "@/lib/use-escape-to-close";

type SaveFeedback = "idle" | "saving" | "saved" | "error";

export default function ProfilePage() {
  const {
    currentUser,
    data,
    onboardingPreferences,
    acceptedMovies,
    linkedUsers,
    sharedMovies,
    watchedPickReviews,
    achievements,
    completeOnboarding,
    updateProfile,
    markPickWatched,
    isDarkMode,
    isReady,
    hasProAccess,
  } = useAppState();

  const earnedBadges = useMemo(
    () => partitionAchievements(achievements).completed,
    [achievements],
  );
  const recommendedWatchedPicks = useMemo(
    () => watchedPickReviews.filter((entry) => entry.recommended),
    [watchedPickReviews],
  );
  const notRecommendedWatchedPicks = useMemo(
    () => watchedPickReviews.filter((entry) => !entry.recommended),
    [watchedPickReviews],
  );
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [clearAvatarOnSave, setClearAvatarOnSave] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [removePhotoModalOpen, setRemovePhotoModalOpen] = useState(false);
  const [favoriteGenresDraft, setFavoriteGenresDraft] = useState<string[]>([]);
  const [dislikedGenresDraft, setDislikedGenresDraft] = useState<string[]>([]);
  const [mediaPreferenceDraft, setMediaPreferenceDraft] = useState<"movie" | "series" | "both">("both");
  const [isFavoriteGenresOpen, setIsFavoriteGenresOpen] = useState(false);
  const [isDislikedGenresOpen, setIsDislikedGenresOpen] = useState(false);
  const [isProStudioOpen, setIsProStudioOpen] = useState(false);
  const [watchedReviewTab, setWatchedReviewTab] = useState<"recommended" | "notRecommended">("recommended");
  const [editingWatchedMovieId, setEditingWatchedMovieId] = useState<string | null>(null);
  const editingWatchedEntry = useMemo(
    () =>
      editingWatchedMovieId
        ? watchedPickReviews.find((entry) => entry.movie.id === editingWatchedMovieId) ?? null
        : null,
    [editingWatchedMovieId, watchedPickReviews],
  );

  const sectionEyebrow = isDarkMode
    ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90"
    : "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600/90";

  useEscapeToClose(removePhotoModalOpen, () => setRemovePhotoModalOpen(false));
  useEscapeToClose(Boolean(editingWatchedEntry), () => setEditingWatchedMovieId(null));

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (saveFeedback !== "saved") {
      return;
    }
    const timer = window.setTimeout(() => {
      setSaveFeedback("idle");
      setSaveMessage("");
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [saveFeedback]);

  useEffect(() => {
    queueMicrotask(() => {
      setFavoriteGenresDraft(onboardingPreferences.favoriteGenres);
      setDislikedGenresDraft(onboardingPreferences.dislikedGenres);
      setMediaPreferenceDraft(onboardingPreferences.mediaPreference);
      setIsFavoriteGenresOpen(false);
      setIsDislikedGenresOpen(false);
    });
  }, [onboardingPreferences]);

  const profileGenres = useMemo(
    () =>
      Array.from(
        new Set(
          data.movies.flatMap((movie) =>
            movie.genre.filter((genre) => genre !== "Movie" && genre !== "Series"),
          ),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [data.movies],
  );

  if (!isReady) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <div
          className={`h-10 w-10 animate-spin rounded-full border-2 border-t-transparent ${
            isDarkMode ? "border-white/20 border-t-violet-300" : "border-slate-200 border-t-violet-600"
          }`}
          aria-hidden
        />
        <p className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Loading your profile…
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const activeAvatarPreview =
    clearAvatarOnSave && !avatarPreview
      ? undefined
      : avatarPreview ?? currentUser.avatarImageUrl;

  const canRemovePhoto =
    Boolean(currentUser.avatarImageUrl || avatarPreview) && !clearAvatarOnSave;

  const resetAvatarDraft = () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(undefined);
    setAvatarFile(null);
    setClearAvatarOnSave(false);
    setFavoriteGenresDraft(onboardingPreferences.favoriteGenres);
    setDislikedGenresDraft(onboardingPreferences.dislikedGenres);
    setMediaPreferenceDraft(onboardingPreferences.mediaPreference);
    setIsFavoriteGenresOpen(false);
    setIsDislikedGenresOpen(false);
  };

  const confirmRemovePhotoStaging = () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(undefined);
    setAvatarFile(null);
    setClearAvatarOnSave(true);
    setRemovePhotoModalOpen(false);
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setClearAvatarOnSave(false);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveFeedback("saving");
    setSaveMessage("");
    const formData = new FormData(event.currentTarget);

    const result = await updateProfile({
      name: String(formData.get("name") ?? currentUser.name).trim() || currentUser.name,
      bio: String(formData.get("bio") ?? ""),
      city: String(formData.get("city") ?? ""),
      avatarImageUrl: clearAvatarOnSave ? null : currentUser.avatarImageUrl,
      avatarFile: clearAvatarOnSave ? null : avatarFile,
      clearAvatar: clearAvatarOnSave,
    });

    if (!result.ok) {
      setSaveFeedback("error");
      setSaveMessage(result.message ?? "Something went wrong while saving.");
      return;
    }

    const cleanedFavoriteGenres = Array.from(
      new Set(
        favoriteGenresDraft
          .map((genre) => genre.trim())
          .filter((genre) => Boolean(genre) && !dislikedGenresDraft.includes(genre)),
      ),
    );
    const cleanedDislikedGenres = Array.from(
      new Set(
        dislikedGenresDraft
          .map((genre) => genre.trim())
          .filter((genre) => Boolean(genre) && !cleanedFavoriteGenres.includes(genre)),
      ),
    );

    await completeOnboarding({
      favoriteGenres: cleanedFavoriteGenres,
      dislikedGenres: cleanedDislikedGenres,
      mediaPreference: mediaPreferenceDraft,
      tasteProfile: onboardingPreferences.tasteProfile,
    });

    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(undefined);
    setAvatarFile(null);
    setClearAvatarOnSave(false);
    setIsEditing(false);
    setSaveFeedback("saved");
    setSaveMessage("Profile saved.");
  };

  const statShell = isDarkMode
    ? "border border-white/12 bg-white/8"
    : "border border-slate-200/80 bg-slate-50/95 shadow-sm";

  const inputClass = isDarkMode
    ? "w-full rounded-[20px] border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/10"
    : "w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white";

  const labelClass = isDarkMode ? "text-sm font-medium text-slate-200" : "text-sm font-medium text-slate-700";

  /** One shared accent system for shortcuts + primary profile actions */
  const actionGradient =
    "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-violet-900 shadow-[0_14px_36px_rgba(109,40,217,0.35)]";
  const actionGradientHover = "hover:shadow-[0_20px_48px_rgba(147,51,234,0.42)] hover:brightness-[1.04]";
  const actionRing = isDarkMode ? "ring-2 ring-fuchsia-300/30" : "ring-2 ring-violet-400/55";

  const profileStyleOptions = [
    { id: "classic", label: "Classic" },
    { id: "glass", label: "Glass" },
    { id: "neon", label: "Neon" },
  ] as const;
  const selectedProfileStyle: ProProfileStyle =
    currentUser.profileStyle ?? "classic";
  const proHeaderCardStyle = selectedProfileStyle === "glass"
    ? isDarkMode
      ? "ring-1 ring-cyan-300/35 bg-gradient-to-br from-slate-900/96 via-cyan-950/35 to-slate-900/95 shadow-[0_18px_48px_rgba(8,145,178,0.24)] backdrop-blur-xl"
      : "ring-1 ring-cyan-300/95 bg-gradient-to-br from-cyan-50 via-white to-sky-50 shadow-[0_16px_36px_rgba(8,145,178,0.2)] backdrop-blur-xl"
    : selectedProfileStyle === "neon"
      ? isDarkMode
        ? "ring-1 ring-fuchsia-300/40 bg-gradient-to-br from-slate-950 via-fuchsia-950/45 to-indigo-950/50 shadow-[0_22px_56px_rgba(126,34,206,0.34)]"
        : "ring-1 ring-fuchsia-300/90 bg-gradient-to-br from-fuchsia-50 via-white to-indigo-50 shadow-[0_20px_44px_rgba(147,51,234,0.26)]"
      : isDarkMode
        ? "ring-1 ring-white/12 bg-gradient-to-br from-slate-900/92 via-slate-900/96 to-slate-950/96 shadow-[0_14px_34px_rgba(15,23,42,0.26)]"
        : "ring-1 ring-slate-300/95 bg-gradient-to-br from-white via-slate-50 to-slate-100 shadow-[0_14px_32px_rgba(15,23,42,0.16)]";
  const proHeaderPatternClass = selectedProfileStyle === "glass"
    ? isDarkMode
      ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] opacity-80"
      : "bg-[linear-gradient(180deg,rgba(255,255,255,0.62),transparent)] opacity-90"
    : selectedProfileStyle === "neon"
      ? isDarkMode
        ? "bg-[linear-gradient(120deg,rgba(236,72,153,0.14),transparent_55%)] opacity-85"
        : "bg-[linear-gradient(120deg,rgba(217,70,239,0.18),transparent_55%)] opacity-85"
      : isDarkMode
        ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)] opacity-70"
        : "bg-[linear-gradient(180deg,rgba(255,255,255,0.45),transparent)] opacity-75";

  const proStylePreviewById: Record<ProProfileStyle, string> = {
    classic: isDarkMode
      ? "border-white/15 bg-transparent text-slate-200"
      : "border-slate-200/90 bg-transparent text-slate-700",
    glass: isDarkMode
      ? "border-cyan-300/35 bg-gradient-to-br from-slate-900/95 via-cyan-950/40 to-slate-900/95 text-cyan-100 backdrop-blur-2xl"
      : "border-cyan-200/90 bg-gradient-to-br from-white via-cyan-50/90 to-sky-50/85 text-cyan-700 backdrop-blur-xl",
    neon: isDarkMode
      ? "border-fuchsia-300/45 bg-gradient-to-br from-slate-950 via-fuchsia-950/45 to-indigo-950/55 text-fuchsia-100 shadow-[0_0_0_1px_rgba(232,121,249,0.24)]"
      : "border-fuchsia-300/75 bg-gradient-to-br from-white via-fuchsia-50/90 to-indigo-50/90 text-fuchsia-700",
  };
  const proStylePatternById: Record<ProProfileStyle, string> = {
    classic: isDarkMode
      ? ""
      : "",
    glass: isDarkMode
      ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.1),transparent)] opacity-80"
      : "bg-[linear-gradient(180deg,rgba(255,255,255,0.62),transparent)] opacity-88",
    neon: isDarkMode
      ? "bg-[linear-gradient(130deg,rgba(236,72,153,0.16),transparent_60%)] opacity-82"
      : "bg-[linear-gradient(130deg,rgba(217,70,239,0.16),transparent_60%)] opacity-78",
  };

  const proStudioSurface = isDarkMode
    ? "border-white/14 bg-gradient-to-br from-violet-950/55 to-slate-950/80 ring-1 ring-white/10"
    : "border-violet-200/90 bg-gradient-to-br from-white via-violet-50/80 to-fuchsia-50/50 ring-1 ring-violet-100/90 shadow-[0_12px_32px_rgba(109,40,217,0.12)]";
  const proStudioCardPatternClass = isDarkMode
    ? "bg-[radial-gradient(circle_at_16%_18%,rgba(168,85,247,0.22)_0_16%,transparent_36%),radial-gradient(circle_at_82%_76%,rgba(59,130,246,0.16)_0_14%,transparent_34%),linear-gradient(135deg,rgba(109,40,217,0.16),transparent)] opacity-85"
    : "bg-[radial-gradient(circle_at_16%_18%,rgba(168,85,247,0.14)_0_16%,transparent_36%),radial-gradient(circle_at_82%_76%,rgba(59,130,246,0.1)_0_14%,transparent_34%),linear-gradient(135deg,rgba(168,85,247,0.09),transparent)] opacity-90";
  const proStudioIconWrap = isDarkMode
    ? "bg-violet-500/25 text-violet-100 ring-2 ring-violet-400/35"
    : "bg-violet-600 text-white ring-2 ring-violet-300/60 shadow-sm";

  const handleSelectProfileStyle = async (style: ProProfileStyle) => {
    if (!hasProAccess || selectedProfileStyle === style) {
      return;
    }

    setSaveFeedback("saving");
    const result = await updateProfile({
      name: currentUser.name,
      bio: currentUser.bio,
      city: currentUser.city,
      profileStyle: style,
    });

    if (!result.ok) {
      setSaveFeedback("error");
      setSaveMessage(result.message ?? "Couldn’t apply profile style right now.");
      return;
    }

    setSaveFeedback("saved");
    setSaveMessage("Profile style updated.");
  };

  const shortcutTiles = [
    {
      href: "/linked",
      title: "Friends",
      subtitle: "Who you match with",
      accentBar: "bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500",
      surface: isDarkMode
        ? "border-white/14 bg-gradient-to-br from-violet-950/55 to-slate-950/80 ring-1 ring-white/10"
        : "border-violet-200/90 bg-gradient-to-br from-white via-violet-50/80 to-fuchsia-50/50 ring-1 ring-violet-100/90 shadow-[0_12px_32px_rgba(109,40,217,0.12)]",
      iconWrap: isDarkMode
        ? "bg-violet-500/25 text-violet-100 ring-2 ring-violet-400/35"
        : "bg-violet-600 text-white ring-2 ring-violet-300/60 shadow-sm",
      titleClass: isDarkMode ? "text-white" : "text-slate-900",
      subClass: isDarkMode ? "text-violet-200/85" : "text-violet-700/85",
      chevronClass: isDarkMode ? "text-violet-300/90" : "text-violet-500",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" strokeLinecap="round" />
          <path d="M17 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" strokeLinecap="round" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" strokeLinecap="round" />
          <path d="M13 19a4.5 4.5 0 0 1 7.5-3.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: "/connect",
      title: "Connect",
      subtitle: "Invite & link flow",
      accentBar: "bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500",
      surface: isDarkMode
        ? "border-cyan-400/15 bg-gradient-to-br from-slate-900/90 to-cyan-950/40 ring-1 ring-cyan-400/12"
        : "border-cyan-200/90 bg-gradient-to-br from-white via-sky-50/90 to-cyan-50/40 ring-1 ring-sky-100/90 shadow-[0_12px_32px_rgba(14,116,144,0.1)]",
      iconWrap: isDarkMode
        ? "bg-cyan-500/20 text-cyan-50 ring-2 ring-cyan-400/30"
        : "bg-cyan-600 text-white ring-2 ring-cyan-300/55 shadow-sm",
      titleClass: isDarkMode ? "text-white" : "text-slate-900",
      subClass: isDarkMode ? "text-cyan-100/85" : "text-cyan-800/90",
      chevronClass: isDarkMode ? "text-cyan-200/90" : "text-cyan-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      href: "/settings",
      title: "Settings",
      subtitle: "Theme & preferences",
      accentBar: "bg-gradient-to-r from-slate-500 via-slate-600 to-violet-600",
      surface: isDarkMode
        ? "border-white/12 bg-gradient-to-br from-slate-950/95 to-violet-950/35 ring-1 ring-white/8"
        : "border-slate-200/95 bg-gradient-to-br from-white via-slate-50/95 to-violet-50/35 ring-1 ring-slate-200/80 shadow-[0_10px_28px_rgba(15,23,42,0.08)]",
      iconWrap: isDarkMode
        ? "bg-white/12 text-slate-100 ring-2 ring-white/18"
        : "bg-slate-800 text-white ring-2 ring-slate-300/70 shadow-sm",
      titleClass: isDarkMode ? "text-white" : "text-slate-900",
      subClass: isDarkMode ? "text-slate-300" : "text-slate-600",
      chevronClass: isDarkMode ? "text-slate-400" : "text-slate-500",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
          <path d="m5.6 5.6 1.4 1.4" />
          <path d="M17 17l1.4 1.4" />
          <path d="m17 5.6-1.4 1.4" />
          <path d="M6.4 17 5 18.4" />
        </svg>
      ),
    },
  ];
  const activeWatchedEntries =
    watchedReviewTab === "recommended" ? recommendedWatchedPicks : notRecommendedWatchedPicks;

  const watchedReviewsEditorSection = (
    <div className="space-y-3">
      {watchedPickReviews.length === 0 ? (
        <div
          className={`rounded-xl px-4 py-3.5 text-center text-sm ${
            isDarkMode ? "bg-white/[0.04] text-slate-300" : "bg-slate-100/90 text-slate-600"
          }`}
        >
          No watched reviews yet.
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className={`grid grid-cols-2 gap-1.5 rounded-xl p-1 ${
              isDarkMode ? "bg-white/[0.06]" : "bg-slate-100/90"
            }`}
          >
            <button
              type="button"
              onClick={() => setWatchedReviewTab("recommended")}
              className={`min-w-0 rounded-xl px-2 py-2 text-[10px] font-semibold leading-tight transition sm:px-3 sm:text-xs ${
                watchedReviewTab === "recommended"
                  ? isDarkMode
                    ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/30"
                    : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                  : isDarkMode
                    ? "text-slate-300"
                    : "text-slate-600"
              }`}
            >
              <span className="block truncate">Recommended ({recommendedWatchedPicks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setWatchedReviewTab("notRecommended")}
              className={`min-w-0 rounded-xl px-2 py-2 text-[10px] font-semibold leading-tight transition sm:px-3 sm:text-xs ${
                watchedReviewTab === "notRecommended"
                  ? isDarkMode
                    ? "bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/30"
                    : "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                  : isDarkMode
                    ? "text-slate-300"
                    : "text-slate-600"
              }`}
            >
              <span className="block truncate">Not recommended ({notRecommendedWatchedPicks.length})</span>
            </button>
          </div>

          <div className={`divide-y overflow-hidden rounded-xl ${
            isDarkMode ? "divide-white/10 bg-white/[0.04]" : "divide-slate-200/80 bg-slate-50/80"
          }`}>
            {activeWatchedEntries.length === 0 ? (
              <p className={`px-3 py-3 text-xs ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                No movies in this tab yet.
              </p>
            ) : (
              activeWatchedEntries.map((entry) => (
                <div
                  key={`${watchedReviewTab}-${entry.movie.id}`}
                  className={`px-3 py-2.5 text-xs ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{entry.movie.title}</p>
                      <p className={`${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                        {new Date(entry.watchedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingWatchedMovieId(entry.movie.id)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                        watchedReviewTab === "recommended"
                          ? isDarkMode
                            ? "bg-emerald-500/20 text-emerald-100"
                            : "bg-emerald-100 text-emerald-700"
                          : isDarkMode
                            ? "bg-rose-500/20 text-rose-100"
                            : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {removePhotoModalOpen ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/45 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setRemovePhotoModalOpen(false)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto max-w-md overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
              isDarkMode ? "border-white/12 bg-slate-950 text-slate-100" : "border-slate-200/90 bg-white text-slate-900"
            }`}
          >
            <div className={`ui-shell-header ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}>
              <p className="min-w-0 flex-1 text-lg font-semibold text-inherit">Remove profile photo?</p>
              <button
                type="button"
                onClick={() => setRemovePhotoModalOpen(false)}
                aria-label="Close"
                className={`ui-shell-close ${
                  isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="ui-shell-body !pt-4">
              <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Removing your photo cannot be undone from here without uploading a new image. It will be removed
                when you save your profile.
              </p>
            </div>
            <div className="ui-shell-footer !pt-4">
              <button
                type="button"
                onClick={() => setRemovePhotoModalOpen(false)}
                className="ui-btn ui-btn-secondary min-w-0 flex-1"
              >
                Keep photo
              </button>
              <button type="button" onClick={confirmRemovePhotoStaging} className="ui-btn ui-btn-danger min-w-0 flex-1">
                Remove photo
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editingWatchedEntry ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/45 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close watched review editor"
            onClick={() => setEditingWatchedMovieId(null)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto w-full max-w-[min(92vw,30rem)] overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
              isDarkMode ? "border-white/12 bg-slate-950 text-slate-100" : "border-slate-200/90 bg-white text-slate-900"
            }`}
          >
            <div className={`ui-shell-header ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}>
              <p className="min-w-0 flex-1 text-lg font-semibold text-inherit">Edit recommendation</p>
              <button
                type="button"
                onClick={() => setEditingWatchedMovieId(null)}
                aria-label="Close"
                className={`ui-shell-close ${
                  isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div className="ui-shell-body !pt-4">
              <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Update your recommendation for{" "}
                <span className="font-semibold text-inherit">{editingWatchedEntry.movie.title}</span>.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={async () => {
                    await markPickWatched(editingWatchedEntry.movie.id, false);
                    setEditingWatchedMovieId(null);
                  }}
                  className={`min-h-12 rounded-[16px] border px-3 py-3 text-left transition ${
                    isDarkMode
                      ? "border-rose-400/30 bg-rose-500/12 text-rose-100 hover:bg-rose-500/20"
                      : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  <p className="text-sm font-semibold">Not recommended</p>
                  <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-rose-100/80" : "text-rose-600/85"}`}>
                    Keep this title in your watched list, marked as not recommended.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await markPickWatched(editingWatchedEntry.movie.id, true);
                    setEditingWatchedMovieId(null);
                  }}
                  className={`min-h-12 rounded-[16px] border px-3 py-3 text-left transition ${
                    isDarkMode
                      ? "border-emerald-400/30 bg-emerald-500/14 text-emerald-100 hover:bg-emerald-500/24"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  <p className="text-sm font-semibold">Recommend</p>
                  <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-emerald-100/80" : "text-emerald-700/85"}`}>
                    Mark this movie as a recommendation for your profile.
                  </p>
                </button>
              </div>
            </div>
            <div className="ui-shell-footer !pt-3">
              <button
                type="button"
                onClick={() => setEditingWatchedMovieId(null)}
                className="ui-btn ui-btn-secondary min-w-0 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {saveFeedback === "saved" || saveFeedback === "error" ? (
        <div
          className={`fixed inset-x-4 top-[max(1rem,env(safe-area-inset-top))] z-[var(--z-banner)] mx-auto max-w-md ${
            saveFeedback === "saved" ? "achievement-toast-pop" : ""
          }`}
          role="status"
          aria-live="polite"
        >
          <div
            className={`rounded-[24px] border px-4 py-3 shadow-[0_20px_50px_rgba(15,23,42,0.2)] backdrop-blur-xl ${
              saveFeedback === "saved"
                ? isDarkMode
                  ? "border-emerald-400/30 bg-slate-950/94 text-emerald-50"
                  : "border-emerald-200/90 bg-white text-emerald-900"
                : isDarkMode
                  ? "border-rose-400/35 bg-slate-950/94 text-rose-50"
                  : "border-rose-200 bg-white text-rose-900"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{saveMessage}</p>
              {saveFeedback === "error" ? (
                <button
                  type="button"
                  onClick={() => {
                    setSaveFeedback("idle");
                    setSaveMessage("");
                  }}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isDarkMode ? "bg-white/12 text-white" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  Dismiss
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <PageHeader
        eyebrow="You"
        title="Profile"
        description="Badges, your snapshot, and shortcuts."
      />

      <SurfaceCard
        className={`fade-up-enter discover-toolbar-enter relative overflow-hidden space-y-6 !p-5 sm:!p-6 ${proHeaderCardStyle}`}
        style={{ animationDelay: "0ms" }}
      >
        <span className={`pointer-events-none absolute inset-0 ${proHeaderPatternClass}`} aria-hidden />
        <form className="relative z-10 space-y-6" onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="profile-avatar-pop relative shrink-0">
                <div className="ring-violet-400/35 animate-[discoverHeroReveal_0.45s_ease-out_both] rounded-full ring-2 ring-offset-2 ring-offset-transparent [animation-delay:40ms] sm:ring-offset-4">
                  <AvatarBadge
                    initials={currentUser.avatar}
                    imageUrl={activeAvatarPreview}
                    sizeClassName="h-16 w-16"
                    textClassName="text-lg font-semibold"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {currentUser.name}
                  </h2>
                  {hasProAccess ? (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
                        isDarkMode
                          ? "border border-amber-300/35 bg-amber-400/20 text-amber-100"
                          : "border border-amber-300 bg-amber-100 text-amber-800"
                      }`}
                    >
                      PRO
                    </span>
                  ) : null}
                </div>
                <p className={`truncate text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  {currentUser.email}
                </p>
              </div>
            </div>
            {isEditing ? (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetAvatarDraft();
                    setSaveFeedback("idle");
                    setSaveMessage("");
                    setRemovePhotoModalOpen(false);
                    setIsEditing(false);
                  }}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                    isDarkMode ? "bg-white/10 text-slate-100 hover:bg-white/15" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveFeedback === "saving"}
                  className={`auth-primary-glow rounded-full px-4 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-65 ${actionGradient} ${actionGradientHover} ${actionRing}`}
                >
                  {saveFeedback === "saving" ? "Saving..." : "Save"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                aria-label="Edit profile"
                className={`auth-primary-glow flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition active:scale-95 ${actionGradient} ${actionGradientHover} ${actionRing}`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-1 space-y-8 sm:space-y-9">
            {isEditing ? (
              <div className="space-y-8 sm:space-y-9">
                <section className="space-y-4">
                  <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Basic info
                  </p>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex shrink-0 flex-col items-center gap-3">
                    <div className="relative">
                      <AvatarBadge
                        initials={currentUser.avatar}
                        imageUrl={activeAvatarPreview}
                        sizeClassName="h-20 w-20"
                        textClassName="text-xl font-semibold"
                      />
                      {canRemovePhoto ? (
                        <button
                          type="button"
                          onClick={() => setRemovePhotoModalOpen(true)}
                          aria-label="Remove profile photo"
                          title="Remove profile photo"
                          className={`absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full border-2 shadow-[0_6px_16px_rgba(0,0,0,0.2)] transition hover:scale-105 active:scale-95 ${
                            isDarkMode
                              ? "border-slate-950 bg-rose-500 text-white hover:bg-rose-400"
                              : "border-white bg-rose-500 text-white hover:bg-rose-600"
                          }`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                            <path d="M3 6h18" strokeLinecap="round" />
                            <path d="M8 6V4h8v2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                    <label
                      className={`auth-primary-glow inline-flex cursor-pointer rounded-full px-4 py-2.5 text-xs font-bold text-white transition active:scale-[0.98] ${actionGradient} ${actionGradientHover} ${actionRing}`}
                    >
                      Choose photo
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                    </label>
                    {clearAvatarOnSave ? (
                      <p className={`max-w-[12rem] text-center text-[11px] font-medium ${isDarkMode ? "text-amber-200" : "text-amber-800"}`}>
                        Photo will be removed when you save.
                      </p>
                    ) : null}
                  </div>
                  {avatarPreview ? (
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Crop preview
                      </p>
                      <div
                        className={`relative mx-auto aspect-square w-full max-w-[11rem] overflow-hidden rounded-[28px] shadow-inner sm:mx-0 ${
                          isDarkMode ? "ring-2 ring-violet-400/25" : "ring-2 ring-violet-200/80"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- user-selected blob preview */}
                        <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                      </div>
                      <p className={`text-[11px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Shown as a circle in the app; center the subject when you pick a photo.
                      </p>
                    </div>
                  ) : null}
                </div>

                <label className={`block space-y-2 ${labelClass}`}>
                  Username
                  <input name="name" defaultValue={currentUser.name} className={inputClass} />
                </label>
                <label className={`block space-y-2 ${labelClass}`}>
                  City
                  <input name="city" defaultValue={currentUser.city} className={inputClass} />
                </label>
                <label className={`block space-y-2 ${labelClass}`}>
                  Bio
                  <textarea name="bio" defaultValue={currentUser.bio} rows={4} className={inputClass} />
                </label>
                </section>

                <div className={`h-px ${isDarkMode ? "bg-white/10" : "bg-slate-200/90"}`} aria-hidden />

                <section className="space-y-3">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Watched reviews
                    </p>
                    <p className={`mt-1 text-[11px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      From Picks after you mark a title watched.
                    </p>
                  </div>
                  {watchedReviewsEditorSection}
                </section>

                <div className={`h-px ${isDarkMode ? "bg-white/10" : "bg-slate-200/90"}`} aria-hidden />

                <section className="space-y-3">
                  <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Discovery preferences
                  </p>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsFavoriteGenresOpen((current) => !current)}
                      className={`flex w-full items-center justify-between rounded-[16px] border px-3.5 py-3 text-left text-sm font-semibold transition ${
                        isDarkMode ? "border-white/12 bg-white/8 text-slate-100" : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <span>
                        Select genres you like
                        <span className={`ml-2 text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                          ({favoriteGenresDraft.length} selected)
                        </span>
                      </span>
                      <span aria-hidden>{isFavoriteGenresOpen ? "−" : "+"}</span>
                    </button>
                    {isFavoriteGenresOpen ? (
                      <div className="flex flex-wrap gap-2">
                        {profileGenres.map((genre) => {
                          const active = favoriteGenresDraft.includes(genre);
                          return (
                            <button
                              key={`fav-${genre}`}
                              type="button"
                              onClick={() =>
                                setFavoriteGenresDraft((current) =>
                                  current.includes(genre)
                                    ? current.filter((entry) => entry !== genre)
                                    : [...current, genre],
                                )
                              }
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                active
                                  ? "bg-violet-600 text-white"
                                  : isDarkMode
                                    ? "border border-white/12 bg-white/8 text-slate-200"
                                    : "border border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              {genre}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsDislikedGenresOpen((current) => !current)}
                      className={`flex w-full items-center justify-between rounded-[16px] border px-3.5 py-3 text-left text-sm font-semibold transition ${
                        isDarkMode ? "border-white/12 bg-white/8 text-slate-100" : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <span>
                        Select genres you dislike
                        <span className={`ml-2 text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                          ({dislikedGenresDraft.length} selected)
                        </span>
                      </span>
                      <span aria-hidden>{isDislikedGenresOpen ? "−" : "+"}</span>
                    </button>
                    {isDislikedGenresOpen ? (
                      <div className="flex flex-wrap gap-2">
                        {profileGenres.map((genre) => {
                          const active = dislikedGenresDraft.includes(genre);
                          return (
                            <button
                              key={`dislike-${genre}`}
                              type="button"
                              onClick={() =>
                                setDislikedGenresDraft((current) =>
                                  current.includes(genre)
                                    ? current.filter((entry) => entry !== genre)
                                    : [...current, genre],
                                )
                              }
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                active
                                  ? "bg-rose-600 text-white"
                                  : isDarkMode
                                    ? "border border-white/12 bg-white/8 text-slate-200"
                                    : "border border-slate-200 bg-white text-slate-700"
                              }`}
                            >
                              {genre}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                      Prefer to discover
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "both", label: "Both" },
                        { id: "movie", label: "Movies" },
                        { id: "series", label: "Series" },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setMediaPreferenceDraft(option.id as "movie" | "series" | "both")}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            mediaPreferenceDraft === option.id
                              ? "bg-violet-600 text-white"
                              : isDarkMode
                                ? "border border-white/12 bg-white/8 text-slate-200"
                                : "border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="space-y-5 pt-0.5">
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    City
                  </p>
                  <p className={`mt-1.5 truncate text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                    {currentUser.city}
                  </p>
                </div>
                <div className={`h-px ${isDarkMode ? "bg-white/10" : "bg-slate-200/90"}`} aria-hidden />
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    Bio
                  </p>
                  <p className={`mt-1.5 text-sm leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {currentUser.bio}
                  </p>
                </div>
              </div>
            )}
          </div>
        </form>
        {!isEditing ? (
          <div className="grid grid-cols-3 gap-2 pt-2 sm:gap-3">
          {[
            { value: acceptedMovies.length, label: "Picks", href: "/picks" },
            {
              value: linkedUsers.filter((user) => user.status === "accepted").length,
              label: "Friends",
              href: "/shared",
            },
            {
              value: sharedMovies.filter((movie) => movie.watched).length,
              label: "Watched",
              href: "/picks",
            },
          ].map((stat, index) => (
            <Link
              key={stat.label}
              href={stat.href}
              className={`discover-toolbar-enter rounded-[22px] px-2 py-3 text-center transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99] sm:px-3 sm:py-4 ${statShell}`}
              style={{ animationDelay: `${80 + index * 70}ms` }}
            >
              <p className={`text-xl font-semibold tabular-nums sm:text-2xl ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {stat.value}
              </p>
              <p
                className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] sm:text-xs ${
                  isDarkMode ? "text-slate-400" : "text-slate-400"
                }`}
              >
                {stat.label}
              </p>
            </Link>
          ))}
          </div>
        ) : null}
      </SurfaceCard>

      <SurfaceCard
        className={`discover-toolbar-enter relative overflow-hidden !p-0 ${proStudioSurface}`}
        style={{ animationDelay: "95ms" }}
      >
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500" aria-hidden />
        <span className={`pointer-events-none absolute inset-0 ${proStudioCardPatternClass}`} aria-hidden />
        <button
          type="button"
          onClick={() => setIsProStudioOpen((current) => !current)}
          aria-expanded={isProStudioOpen}
          className="relative z-10 flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${proStudioIconWrap}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6" strokeWidth="1.75" aria-hidden>
                <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" />
                <path d="M7.5 6.5 10 4h4l2.5 2.5" strokeLinecap="round" />
                <path d="m10 11 5 2.8-5 2.8v-5.6Z" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className={sectionEyebrow}>Profile themes</p>
              <p className={`mt-0.5 text-[15px] font-bold leading-tight tracking-tight sm:text-base ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Profile themes
              </p>
              <p className={`mt-0.5 text-[11px] font-semibold leading-snug sm:text-xs ${isDarkMode ? "text-violet-200/85" : "text-violet-700/85"}`}>
                Choose a balanced look for both light and dark mode
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full whitespace-nowrap px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
                hasProAccess
                  ? isDarkMode
                    ? "bg-emerald-500/18 text-emerald-100 ring-1 ring-emerald-400/30"
                    : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200/80"
                  : isDarkMode
                    ? "bg-white/10 text-slate-300 ring-1 ring-white/12"
                    : "bg-slate-100 text-slate-600 ring-1 ring-slate-200/90"
              }`}
            >
              {hasProAccess ? "Pro active" : "Pro required"}
            </span>
            <span className={`text-base ${isDarkMode ? "text-slate-300" : "text-slate-500"}`} aria-hidden>
              {isProStudioOpen ? "−" : "+"}
            </span>
          </div>
        </button>

        {isProStudioOpen ? (
          <div className={`relative z-10 space-y-3 border-t px-4 pb-4 pt-3 sm:px-5 sm:pb-5 ${isDarkMode ? "border-white/10" : "border-violet-200/70"}`}>
            {!hasProAccess ? (
              <div
                className={`rounded-[16px] border px-4 py-3 text-sm ${
                  isDarkMode
                    ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                Unlock this section with Pro to apply public profile styles visible to friends.
                <Link href="/settings" className="ml-2 font-semibold underline underline-offset-2">
                  Open subscription settings
                </Link>
              </div>
            ) : (
              <>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Profile style
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {profileStyleOptions.map((styleOption) => {
                    const selected = selectedProfileStyle === styleOption.id;
                    return (
                      <button
                        key={styleOption.id}
                        type="button"
                        onClick={() => void handleSelectProfileStyle(styleOption.id)}
                        className={`relative overflow-hidden rounded-[16px] border px-3 py-3 text-left transition ${proStylePreviewById[styleOption.id]} ${
                          selected
                            ? isDarkMode
                              ? "ring-2 ring-violet-300/45"
                              : "ring-2 ring-violet-400/55"
                            : ""
                        }`}
                      >
                        <span className={`pointer-events-none absolute inset-0 ${proStylePatternById[styleOption.id]}`} aria-hidden />
                        <span
                          className={`pointer-events-none absolute right-2 top-2 text-[10px] font-bold uppercase tracking-[0.14em] ${
                            isDarkMode ? "text-white/75" : "text-slate-700/75"
                          }`}
                          aria-hidden
                        >
                          {styleOption.id === "classic"
                            ? "Clear"
                            : styleOption.id === "glass"
                              ? "Soft"
                              : "Vivid"}
                        </span>
                        <div className="relative">
                        <p className="text-sm font-bold">{styleOption.label}</p>
                        <p className={`mt-1 text-[11px] ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                          {styleOption.id === "classic"
                            ? "Sharp readability with neutral surfaces and clear hierarchy"
                            : styleOption.id === "glass"
                              ? "Gentle highlights and softer cards for a calm look"
                              : "Higher contrast accents for strong visibility and energy"}
                        </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Friends see this style on your profile card.
                </p>
              </>
            )}
          </div>
        ) : null}
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {shortcutTiles.map((tile, index) => (
          <Link
            key={tile.href}
            href={tile.href}
            className={`discover-toolbar-enter group relative flex min-h-[5.85rem] overflow-hidden rounded-[22px] transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99] sm:min-h-[6.1rem] sm:rounded-[24px] ${tile.surface}`}
            style={{ animationDelay: `${index * 75}ms` }}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-transparent" aria-hidden />
            <div className="flex w-full items-center gap-3 px-4 py-4 sm:gap-3.5 sm:px-5 sm:py-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition group-hover:scale-[1.04] sm:h-12 sm:w-12 ${tile.iconWrap}`}
              >
                {tile.icon}
              </span>
              <div className="min-w-0 flex-1 text-left">
                <p className={`text-[15px] font-bold leading-tight tracking-tight sm:text-base ${tile.titleClass}`}>
                  {tile.title}
                </p>
                <p className={`mt-0.5 text-[11px] font-semibold leading-snug sm:text-xs ${tile.subClass}`}>
                  {tile.subtitle}
                </p>
              </div>
              <span
                className={`shrink-0 text-lg font-light transition group-hover:translate-x-0.5 sm:text-xl ${tile.chevronClass}`}
                aria-hidden
              >
                →
              </span>
            </div>
          </Link>
        ))}
      </div>

      <SurfaceCard className="discover-toolbar-enter space-y-4 !p-5 sm:!p-6" style={{ animationDelay: "120ms" }}>
        <AchievementBadgesShowcase earned={earnedBadges} isDarkMode={isDarkMode} variant="self" />
      </SurfaceCard>
    </div>
  );
}
