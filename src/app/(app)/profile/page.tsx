"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AchievementBadgesShowcase } from "@/components/achievement-badges-showcase";
import { AvatarBadge } from "@/components/avatar-badge";
import { MovieDetailsModal } from "@/components/movie-details-modal";
import { ModalPortal } from "@/components/modal-portal";
import { PageHeader } from "@/components/page-header";
import { PosterBackdrop } from "@/components/poster-backdrop";
import { AppRouteLoading } from "@/components/app-route-status";
import { SurfaceCard } from "@/components/surface-card";
import { partitionAchievements } from "@/lib/achievement-utils";
import { DEFAULT_PROFILE_AVATAR_PRESETS } from "@/lib/default-profile-avatar-presets";
import { DISCOVER_REJECT_HIDE_WINDOW_MS, FAVORITE_GENRE_LIMIT } from "@/lib/discover-constants";
import { shareOrCopyInviteMessage } from "@/lib/invite-link-utils";
import { useAppState } from "@/lib/app-state";
import type { FavoriteMovieSummary, Movie, ProProfileStyle } from "@/lib/types";
import { useEscapeToClose } from "@/lib/use-escape-to-close";

type SaveFeedback = "idle" | "saving" | "saved" | "error";

export default function ProfilePage() {
  const {
    currentUser,
    currentUserId,
    data,
    discoverVisibilityTimestamp,
    onboardingPreferences,
    acceptedMovies,
    linkedUsers,
    sharedMovies,
    watchedPickReviews,
    achievements,
    completeOnboarding,
    createInviteLink,
    updateProfile,
    markPickWatched,
    registerMovies,
    swipeMovie,
    undoSwipe,
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
  /** Distinct titles marked watched from Picks (solo) plus titles marked watched on Shared — overlap counted once. */
  const profileWatchedTotal = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of watchedPickReviews) {
      ids.add(entry.movie.id);
    }
    for (const row of sharedMovies) {
      if (row.watched) {
        ids.add(row.movie.id);
      }
    }
    return ids.size;
  }, [watchedPickReviews, sharedMovies]);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [clearAvatarOnSave, setClearAvatarOnSave] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [removePhotoModalOpen, setRemovePhotoModalOpen] = useState(false);
  const [avatarPresetModalOpen, setAvatarPresetModalOpen] = useState(false);
  const [favoriteGenresDraft, setFavoriteGenresDraft] = useState<string[]>([]);
  const [dislikedGenresDraft, setDislikedGenresDraft] = useState<string[]>([]);
  const [mediaPreferenceDraft, setMediaPreferenceDraft] = useState<"movie" | "series" | "both">("both");
  const [isFavoriteGenresOpen, setIsFavoriteGenresOpen] = useState(false);
  const [isDislikedGenresOpen, setIsDislikedGenresOpen] = useState(false);
  const [favoriteMovieDraft, setFavoriteMovieDraft] = useState<FavoriteMovieSummary | null>(null);
  const [favoriteMovieSearchQuery, setFavoriteMovieSearchQuery] = useState("");
  const [favoriteMovieSearchResults, setFavoriteMovieSearchResults] = useState<Movie[]>([]);
  const [favoriteMovieSearchState, setFavoriteMovieSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [favoriteMovieSearchMessage, setFavoriteMovieSearchMessage] = useState("");
  const [profileHeaderMovieDraft, setProfileHeaderMovieDraft] = useState<FavoriteMovieSummary | null>(null);
  const [headerBgSearchQuery, setHeaderBgSearchQuery] = useState("");
  const [headerBgSearchResults, setHeaderBgSearchResults] = useState<Movie[]>([]);
  const [headerBgSearchState, setHeaderBgSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [headerBgSearchMessage, setHeaderBgSearchMessage] = useState("");
  const [editSectionsOpen, setEditSectionsOpen] = useState({
    basicInfo: false,
    headerBackground: false,
    watchedReviews: false,
    discoveryPreferences: false,
    discoverSkips: false,
  });
  const [isProStudioOpen, setIsProStudioOpen] = useState(false);
  /** Applies Pro Studio style immediately while save runs (server round-trip was slow). */
  const [optimisticProfileStyle, setOptimisticProfileStyle] = useState<ProProfileStyle | null>(null);
  const [discoverSkipsModalOpen, setDiscoverSkipsModalOpen] = useState(false);
  const [discoverSkipDetailMovie, setDiscoverSkipDetailMovie] = useState<Movie | null>(null);
  const [watchedReviewTab, setWatchedReviewTab] = useState<"recommended" | "notRecommended">("recommended");
  const [editingWatchedMovieId, setEditingWatchedMovieId] = useState<string | null>(null);
  const [copyInviteBusy, setCopyInviteBusy] = useState(false);
  const editingWatchedEntry = useMemo(
    () =>
      editingWatchedMovieId
        ? watchedPickReviews.find((entry) => entry.movie.id === editingWatchedMovieId) ?? null
        : null,
    [editingWatchedMovieId, watchedPickReviews],
  );

  useEscapeToClose(removePhotoModalOpen, () => setRemovePhotoModalOpen(false));
  useEscapeToClose(avatarPresetModalOpen, () => setAvatarPresetModalOpen(false));
  useEscapeToClose(Boolean(editingWatchedEntry), () => setEditingWatchedMovieId(null));
  useEscapeToClose(discoverSkipsModalOpen && !discoverSkipDetailMovie, () => setDiscoverSkipsModalOpen(false));
  useEscapeToClose(Boolean(discoverSkipDetailMovie), () => setDiscoverSkipDetailMovie(null));

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
      setFavoriteGenresDraft(onboardingPreferences.favoriteGenres.slice(0, FAVORITE_GENRE_LIMIT));
      setDislikedGenresDraft(onboardingPreferences.dislikedGenres);
      setMediaPreferenceDraft(onboardingPreferences.mediaPreference);
      setFavoriteMovieDraft(currentUser?.favoriteMovie ?? null);
      setFavoriteMovieSearchQuery("");
      setFavoriteMovieSearchResults([]);
      setFavoriteMovieSearchState("idle");
      setFavoriteMovieSearchMessage("");
      setProfileHeaderMovieDraft(currentUser?.profileHeaderMovie ?? null);
      setHeaderBgSearchQuery("");
      setHeaderBgSearchResults([]);
      setHeaderBgSearchState("idle");
      setHeaderBgSearchMessage("");
      setEditSectionsOpen({
        basicInfo: false,
        headerBackground: false,
        watchedReviews: false,
        discoveryPreferences: false,
        discoverSkips: false,
      });
      setIsFavoriteGenresOpen(false);
      setIsDislikedGenresOpen(false);
    });
  }, [currentUser?.favoriteMovie, currentUser?.profileHeaderMovie, onboardingPreferences]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const trimmed = favoriteMovieSearchQuery.trim();
    if (trimmed.length < 2) {
      setFavoriteMovieSearchResults([]);
      setFavoriteMovieSearchState("idle");
      setFavoriteMovieSearchMessage("");
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setFavoriteMovieSearchState("loading");
      setFavoriteMovieSearchMessage("");
      try {
        const response = await fetch(
          `/api/movies?source=tmdb&query=${encodeURIComponent(trimmed)}${currentUserId ? `&userId=${encodeURIComponent(currentUserId)}` : ""}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!active) {
          return;
        }
        if (!response.ok) {
          setFavoriteMovieSearchState("error");
          setFavoriteMovieSearchResults([]);
          setFavoriteMovieSearchMessage("Couldn’t search movies right now.");
          return;
        }
        const payload = (await response.json()) as { movies?: Movie[] };
        const movies = (payload.movies ?? []).filter((movie) => movie.mediaType === "movie");
        registerMovies(movies);
        setFavoriteMovieSearchResults(movies);
        setFavoriteMovieSearchState("idle");
        setFavoriteMovieSearchMessage(
          movies.length === 0 ? "No matches found. Try another title." : "",
        );
      } catch {
        if (!active) {
          return;
        }
        setFavoriteMovieSearchState("error");
        setFavoriteMovieSearchResults([]);
        setFavoriteMovieSearchMessage("Couldn’t search movies right now.");
      }
    }, 260);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [favoriteMovieSearchQuery, isEditing, currentUserId, registerMovies]);

  useEffect(() => {
    if (!isEditing) {
      return;
    }

    const trimmed = headerBgSearchQuery.trim();
    if (trimmed.length < 2) {
      setHeaderBgSearchResults([]);
      setHeaderBgSearchState("idle");
      setHeaderBgSearchMessage("");
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setHeaderBgSearchState("loading");
      setHeaderBgSearchMessage("");
      try {
        const response = await fetch(
          `/api/movies?source=tmdb&query=${encodeURIComponent(trimmed)}${currentUserId ? `&userId=${encodeURIComponent(currentUserId)}` : ""}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!active) {
          return;
        }
        if (!response.ok) {
          setHeaderBgSearchState("error");
          setHeaderBgSearchResults([]);
          setHeaderBgSearchMessage("Couldn’t search movies right now.");
          return;
        }
        const payload = (await response.json()) as { movies?: Movie[] };
        const movies = payload.movies ?? [];
        registerMovies(movies);
        setHeaderBgSearchResults(movies);
        setHeaderBgSearchState("idle");
        setHeaderBgSearchMessage(
          movies.length === 0 ? "No matches found. Try another title." : "",
        );
      } catch {
        if (!active) {
          return;
        }
        setHeaderBgSearchState("error");
        setHeaderBgSearchResults([]);
        setHeaderBgSearchMessage("Couldn’t search movies right now.");
      }
    }, 260);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [headerBgSearchQuery, isEditing, currentUserId, registerMovies]);

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

  const skippedDiscoverMovies = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    const rows = data.swipes
      .filter((swipe) => {
        if (swipe.userId !== currentUserId || swipe.decision !== "rejected") {
          return false;
        }
        const rejectedAt = new Date(swipe.createdAt).getTime();
        return (
          Number.isFinite(rejectedAt) &&
          discoverVisibilityTimestamp - rejectedAt < DISCOVER_REJECT_HIDE_WINDOW_MS
        );
      })
      .map((swipe) => {
        const movie = data.movies.find((entry) => entry.id === swipe.movieId);
        return movie ? { movie, createdAt: swipe.createdAt } : null;
      })
      .filter((entry): entry is { movie: Movie; createdAt: string } => entry !== null);

    rows.sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
    return rows;
  }, [currentUserId, data.movies, data.swipes, discoverVisibilityTimestamp]);

  const handleRestoreDiscoverSkip = useCallback(
    async (movie: Movie, options?: { closeModals?: boolean }) => {
      registerMovies([movie]);
      await undoSwipe(movie.id);
      if (options?.closeModals) {
        setDiscoverSkipDetailMovie(null);
        setDiscoverSkipsModalOpen(false);
      }
    },
    [registerMovies, undoSwipe],
  );

  const handleCopyInviteFromProfile = useCallback(async () => {
    if (!currentUser) {
      return;
    }
    setCopyInviteBusy(true);
    try {
      const created = await createInviteLink();
      if (!created.ok) {
        setSaveFeedback("error");
        setSaveMessage(created.message);
        return;
      }
      const out = await shareOrCopyInviteMessage(created.url, currentUser.name, {
        preferCopy: true,
      });
      setSaveFeedback(out.ok ? "saved" : "error");
      setSaveMessage(
        out.message || (out.ok ? "Done." : "Couldn’t copy. Try again."),
      );
    } finally {
      setCopyInviteBusy(false);
    }
  }, [createInviteLink, currentUser]);

  if (!isReady) {
    return (
      <AppRouteLoading
        ariaLabel="Loading profile"
        message="Loading your profile…"
        isDarkMode={isDarkMode}
        visual="spinner"
        frameClassName="flex min-h-[50vh] w-full flex-1 flex-col items-center justify-center px-4 py-4"
      />
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
    setFavoriteGenresDraft(onboardingPreferences.favoriteGenres.slice(0, FAVORITE_GENRE_LIMIT));
    setDislikedGenresDraft(onboardingPreferences.dislikedGenres);
    setMediaPreferenceDraft(onboardingPreferences.mediaPreference);
    setFavoriteMovieDraft(currentUser?.favoriteMovie ?? null);
    setFavoriteMovieSearchQuery("");
    setFavoriteMovieSearchResults([]);
    setFavoriteMovieSearchState("idle");
    setFavoriteMovieSearchMessage("");
    setProfileHeaderMovieDraft(currentUser?.profileHeaderMovie ?? null);
    setHeaderBgSearchQuery("");
    setHeaderBgSearchResults([]);
    setHeaderBgSearchState("idle");
    setHeaderBgSearchMessage("");
    setEditSectionsOpen({
      basicInfo: false,
      headerBackground: false,
      watchedReviews: false,
      discoveryPreferences: false,
      discoverSkips: false,
    });
    setIsFavoriteGenresOpen(false);
    setIsDislikedGenresOpen(false);
    setAvatarPresetModalOpen(false);
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

  const handleSelectPresetAvatar = (url: string) => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setClearAvatarOnSave(false);
    setAvatarPreview(url);
    setAvatarPresetModalOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveFeedback("saving");
    setSaveMessage("");
    const formData = new FormData(event.currentTarget);

    const result = await updateProfile({
      name: String(formData.get("name") ?? currentUser.name).trim() || currentUser.name,
      bio: String(formData.get("bio") ?? ""),
      city: "",
      avatarImageUrl: clearAvatarOnSave
        ? null
        : avatarFile
          ? currentUser.avatarImageUrl
          : avatarPreview && !avatarPreview.startsWith("blob:")
            ? avatarPreview
            : currentUser.avatarImageUrl,
      avatarFile: clearAvatarOnSave ? null : avatarFile,
      favoriteMovie: favoriteMovieDraft,
      profileHeaderMovie: profileHeaderMovieDraft,
      clearAvatar: clearAvatarOnSave,
    });

    if (!result.ok) {
      setSaveFeedback("error");
      setSaveMessage(
        result.message ?? "Couldn’t save your profile. Check your connection and try again.",
      );
      return;
    }

    const cleanedFavoriteGenres = Array.from(
      new Set(
        favoriteGenresDraft
          .map((genre) => genre.trim())
          .filter((genre) => Boolean(genre) && !dislikedGenresDraft.includes(genre)),
      ),
    ).slice(0, FAVORITE_GENRE_LIMIT);
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
    setAvatarPresetModalOpen(false);
    setIsEditing(false);
    setSaveFeedback("saved");
    setSaveMessage(result.message ?? "Profile saved.");
  };

  const statShell = isDarkMode
    ? "border border-white/12 bg-white/8"
    : "border border-slate-200/80 bg-slate-50/95 shadow-sm";

  const inputClass = isDarkMode
    ? "w-full rounded-[20px] border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/10"
    : "w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white";

  const labelClass = isDarkMode ? "text-sm font-medium text-slate-200" : "text-sm font-medium text-slate-700";
  const editSectionShell = isDarkMode
    ? "rounded-[18px] border border-white/12 bg-white/[0.03]"
    : "rounded-[18px] border border-slate-200/90 bg-slate-50/60";

  /** One shared accent system for shortcuts + primary profile actions */
  const actionGradient =
    "bg-gradient-to-br from-violet-600 via-fuchsia-600 to-violet-900 shadow-[0_14px_36px_rgba(109,40,217,0.35)]";
  const actionGradientHover = "hover:shadow-[0_20px_48px_rgba(147,51,234,0.42)] hover:brightness-[1.04]";
  const actionRing = isDarkMode ? "ring-2 ring-fuchsia-300/30" : "ring-2 ring-violet-400/55";

  const profileStyleOptions = [
    { id: "classic", label: "Classic" },
    { id: "glass", label: "Glass" },
    { id: "neon", label: "Neon" },
    { id: "rainbow", label: "Rainbow" },
  ] as const;
  const selectedProfileStyle: ProProfileStyle =
    optimisticProfileStyle ?? currentUser.profileStyle ?? "classic";
  const favoriteMoviePreview = favoriteMovieDraft ?? currentUser?.favoriteMovie ?? null;
  const headerHeroMovie = isEditing
    ? profileHeaderMovieDraft
    : (currentUser?.profileHeaderMovie ?? null);
  const headerHeroPosterUrl = headerHeroMovie?.posterImageUrl;
  /** Theme-aware frame: solid border + inset sheen + outer glow (border avoids ring/shadow conflicts). */
  const proHeaderCardStyle = selectedProfileStyle === "glass"
    ? isDarkMode
      ? "border-2 border-cyan-400/45 bg-gradient-to-br from-slate-900/96 via-cyan-950/35 to-slate-900/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(34,211,238,0.18),0_18px_48px_rgba(8,145,178,0.28)] backdrop-blur-xl"
      : "border-2 border-cyan-400/55 bg-gradient-to-b from-cyan-50 via-sky-50/90 to-cyan-100/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_0_28px_rgba(6,182,212,0.2),0_14px_36px_rgba(8,145,178,0.18)] backdrop-blur-xl"
    : selectedProfileStyle === "neon"
      ? isDarkMode
        ? "border-2 border-fuchsia-400/50 bg-gradient-to-br from-slate-950 via-fuchsia-950/45 to-indigo-950/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_28px_rgba(232,121,249,0.22),0_20px_52px_rgba(147,51,234,0.32)]"
        : "border-2 border-fuchsia-500/55 bg-gradient-to-b from-fuchsia-50 via-violet-50 to-indigo-100/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_0_32px_rgba(217,70,239,0.18),0_16px_40px_rgba(147,51,234,0.2)]"
      : selectedProfileStyle === "rainbow"
        ? isDarkMode
          ? "profile-rainbow-card-dark"
          : "profile-rainbow-card-light"
        : isDarkMode
          ? "border-2 border-violet-400/40 bg-gradient-to-br from-slate-900/92 via-slate-900/96 to-slate-950/96 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_22px_rgba(167,139,250,0.16),0_14px_38px_rgba(91,33,182,0.2)]"
          : "border-2 border-violet-400/50 bg-gradient-to-b from-violet-50/85 via-violet-50/35 to-slate-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_0_26px_rgba(139,92,246,0.14),0_12px_34px_rgba(109,40,217,0.12)]";
  /** Avoid white overlays in light mode — they washed out the left side and hid theme tint. */
  const proHeaderPatternClass = selectedProfileStyle === "glass"
    ? isDarkMode
      ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)] opacity-80"
      : "bg-[linear-gradient(180deg,rgba(6,182,212,0.12),transparent_72%)] opacity-100"
    : selectedProfileStyle === "neon"
      ? isDarkMode
        ? "bg-[linear-gradient(120deg,rgba(236,72,153,0.14),transparent_55%)] opacity-85"
        : "bg-[linear-gradient(120deg,rgba(217,70,239,0.12),transparent_60%)] opacity-90"
      : selectedProfileStyle === "rainbow"
        ? isDarkMode
          ? "bg-[conic-gradient(from_220deg_at_55%_45%,rgba(251,113,133,0.42),rgba(253,224,71,0.38),rgba(52,211,153,0.4),rgba(56,189,248,0.42),rgba(129,140,248,0.42),rgba(232,121,249,0.4),rgba(251,113,133,0.42))] opacity-[0.55]"
          : "bg-[conic-gradient(from_200deg_at_50%_42%,rgba(251,113,133,0.32),rgba(253,224,71,0.28),rgba(45,212,191,0.26),rgba(56,189,248,0.3),rgba(129,140,248,0.28),rgba(232,121,249,0.28),rgba(251,113,133,0.32))] opacity-[0.65]"
        : isDarkMode
          ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)] opacity-70"
          : "";

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
    rainbow: isDarkMode ? "profile-rainbow-swatch-dark text-white" : "profile-rainbow-swatch-light text-slate-900",
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
    rainbow: isDarkMode
      ? "bg-[conic-gradient(from_180deg_at_50%_50%,rgba(251,113,133,0.5),rgba(253,224,71,0.45),rgba(52,211,153,0.48),rgba(56,189,248,0.5),rgba(129,140,248,0.48),rgba(232,121,249,0.5),rgba(251,113,133,0.5))] opacity-[0.42]"
      : "bg-[conic-gradient(from_180deg_at_50%_50%,rgba(251,113,133,0.4),rgba(253,224,71,0.36),rgba(45,212,191,0.34),rgba(56,189,248,0.38),rgba(129,140,248,0.36),rgba(232,121,249,0.36),rgba(251,113,133,0.4))] opacity-[0.5]",
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
    if (!hasProAccess || style === selectedProfileStyle) {
      return;
    }

    setOptimisticProfileStyle(style);
    setSaveFeedback("saving");
    const result = await updateProfile({
      name: currentUser.name,
      bio: currentUser.bio,
      city: "",
      profileStyle: style,
    });

    setOptimisticProfileStyle(null);

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
          className={`rounded-xl px-4 py-3.5 text-center text-[10px] leading-snug ${
            isDarkMode ? "bg-white/[0.04] text-slate-300" : "bg-slate-100/90 text-slate-600"
          }`}
        >
          No watched reviews yet.
        </div>
      ) : (
        <div className="space-y-3">
          <div
            className={`grid grid-cols-1 gap-1.5 rounded-xl p-0.5 sm:grid-cols-2 sm:gap-1 ${
              isDarkMode ? "bg-white/[0.06]" : "bg-slate-100/90"
            }`}
          >
            <button
              type="button"
              onClick={() => setWatchedReviewTab("recommended")}
              aria-label={`Recommended, ${recommendedWatchedPicks.length} movies`}
              className={`min-w-0 rounded-[10px] px-2 py-2 text-center text-[11px] font-semibold uppercase leading-snug tracking-wide transition sm:text-xs ${
                watchedReviewTab === "recommended"
                  ? isDarkMode
                    ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/30"
                    : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                  : isDarkMode
                    ? "text-slate-400"
                    : "text-slate-500"
              }`}
            >
              <span className="block whitespace-normal leading-snug">
                Recommended ({recommendedWatchedPicks.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => setWatchedReviewTab("notRecommended")}
              aria-label={`Not recommended, ${notRecommendedWatchedPicks.length} movies`}
              className={`min-w-0 rounded-[10px] px-2 py-2 text-center text-[11px] font-semibold uppercase leading-snug tracking-wide transition sm:text-xs ${
                watchedReviewTab === "notRecommended"
                  ? isDarkMode
                    ? "bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/30"
                    : "bg-rose-100 text-rose-800 ring-1 ring-rose-200"
                  : isDarkMode
                    ? "text-slate-400"
                    : "text-slate-500"
              }`}
            >
              <span className="block whitespace-normal leading-snug">
                Not recommended ({notRecommendedWatchedPicks.length})
              </span>
            </button>
          </div>

          <div
            className={`divide-y overflow-hidden rounded-xl font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] ${
              isDarkMode ? "divide-white/10 bg-white/[0.04]" : "divide-slate-200/80 bg-slate-50/80"
            }`}
          >
            {activeWatchedEntries.length === 0 ? (
              <p className={`px-3 py-3 text-[10px] leading-snug ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                No movies in this tab yet.
              </p>
            ) : (
              activeWatchedEntries.map((entry) => (
                <div
                  key={`${watchedReviewTab}-${entry.movie.id}`}
                  className={`px-3 py-2 text-[10px] leading-snug ${isDarkMode ? "text-slate-100" : "text-slate-700"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{entry.movie.title}</p>
                      <p className={`text-[9px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {new Date(entry.watchedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingWatchedMovieId(entry.movie.id)}
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${
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
      <ModalPortal open={removePhotoModalOpen}>
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
            <span className="ui-modal-accent-bar" aria-hidden />
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
      </ModalPortal>
      <ModalPortal open={avatarPresetModalOpen}>
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/45 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setAvatarPresetModalOpen(false)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-lg relative z-10 mx-auto max-h-[min(85dvh,40rem)] w-full min-h-0 overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
              isDarkMode ? "border-white/12 bg-slate-950 text-slate-100" : "border-slate-200/90 bg-white text-slate-900"
            }`}
          >
            <span className="ui-modal-accent-bar" aria-hidden />
            <div
              className={`flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5 ${
                isDarkMode ? "border-b-white/10" : "border-b-slate-100"
              }`}
            >
              <div className="min-w-0">
                <h2
                  id="profile-avatar-preset-title"
                  className={`text-lg font-semibold leading-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}
                >
                  Choose a default poster
                </h2>
                <p className={`mt-1.5 text-sm leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Film &amp; series posters from TMDb. They appear in a circle on your profile like a normal photo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAvatarPresetModalOpen(false)}
                aria-label="Close"
                className={`ui-shell-close shrink-0 ${
                  isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <div
              className="max-h-[min(60dvh,24rem)] overflow-y-auto overflow-x-hidden overscroll-contain px-3 pb-4 pt-1 sm:px-4 [scrollbar-gutter:stable]"
              role="listbox"
              aria-labelledby="profile-avatar-preset-title"
            >
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
                {DEFAULT_PROFILE_AVATAR_PRESETS.map((preset) => {
                  const selected = avatarPreview === preset.imageUrl && !avatarFile;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => handleSelectPresetAvatar(preset.imageUrl)}
                      className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
                        selected
                          ? isDarkMode
                            ? "ring-2 ring-violet-300 ring-offset-2 ring-offset-slate-950"
                            : "ring-2 ring-violet-500 ring-offset-2 ring-offset-white"
                          : isDarkMode
                            ? "ring-white/12 hover:ring-violet-400/45"
                            : "ring-slate-200 hover:ring-violet-300"
                      } ${isDarkMode ? "bg-white/5" : "bg-slate-100"}`}
                      title={preset.label}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- TMDb static preset */}
                      <img
                        src={preset.imageUrl}
                        alt={preset.label}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        sizes="(max-width: 640px) 50vw, 150px"
                      />
                      <span
                        className="pointer-events-none absolute inset-x-0 bottom-0 line-clamp-2 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-2 text-left text-[9px] font-semibold leading-tight text-white"
                      >
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className={`border-t px-4 py-3 sm:px-5 ${
                isDarkMode ? "border-white/10" : "border-slate-100"
              }`}
            >
              <button
                type="button"
                onClick={() => setAvatarPresetModalOpen(false)}
                className="ui-btn ui-btn-secondary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
      <ModalPortal open={discoverSkipsModalOpen && !discoverSkipDetailMovie}>
        <div
          className="ui-overlay z-[var(--z-modal-backdrop)] box-border items-center justify-center bg-slate-950/50 backdrop-blur-md"
          style={{
            paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))",
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 0px))",
            paddingLeft: "max(1.25rem, env(safe-area-inset-left, 0px))",
            paddingRight: "max(1.25rem, env(safe-area-inset-right, 0px))",
          }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setDiscoverSkipsModalOpen(false)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div className="relative z-10 flex w-full min-w-0 max-w-[min(22rem,calc(100vw-2.5rem))] flex-col">
            <div
              className={`ui-shell flex max-h-[min(72dvh,32rem)] w-full flex-col overflow-hidden rounded-2xl border shadow-[0_20px_48px_rgba(0,0,0,0.35)] sm:max-h-[min(78dvh,34rem)] sm:rounded-[20px] ${
                isDarkMode ? "border-white/[0.08] bg-slate-950 text-slate-100" : "border-slate-200/90 bg-white text-slate-900"
              }`}
            >
              <div
                className={`flex shrink-0 items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-5 sm:pb-3.5 sm:pt-5 ${
                  isDarkMode ? "border-b border-white/[0.06]" : "border-b border-slate-100"
                }`}
              >
                <div className="min-w-0 flex-1 pr-1">
                  <p className="text-[13px] font-semibold leading-tight tracking-tight sm:text-sm">Skipped on Discover</p>
                  <p className={`mt-1 text-[11px] leading-relaxed ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                    Restore a title to put it back on your stack.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDiscoverSkipsModalOpen(false)}
                  aria-label="Close"
                  className={`ui-shell-close shrink-0 scale-90 ${isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
              <div
                className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-0 sm:px-5 sm:pb-6 ${
                  isDarkMode ? "bg-slate-950" : "bg-white"
                }`}
              >
                {skippedDiscoverMovies.length === 0 ? (
                  <p className={`py-8 text-center text-[11px] leading-relaxed ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                    Nothing here — older passes roll off after about a week.
                  </p>
                ) : (
                  <ul
                    className={`divide-y ${isDarkMode ? "divide-white/[0.07]" : "divide-slate-100"}`}
                  >
                    {skippedDiscoverMovies.map(({ movie, createdAt }) => (
                      <li key={movie.id} className="flex gap-3 py-3.5 first:pt-3 last:pb-0.5 sm:gap-3.5 sm:py-4">
                        <div
                          className={`relative h-11 w-9 shrink-0 overflow-hidden rounded-md sm:h-12 sm:w-10 ${
                            isDarkMode ? "bg-white/5" : "bg-slate-100"
                          }`}
                        >
                          {movie.poster.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- small cached poster
                            <img src={movie.poster.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span
                              className={`flex h-full w-full items-center justify-center px-0.5 text-center text-[7px] font-bold leading-tight ${
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              {movie.title.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="min-w-0">
                            <p
                              className={`line-clamp-2 text-left text-[12px] font-semibold leading-snug sm:text-[13px] ${
                                isDarkMode ? "text-slate-100" : "text-slate-900"
                              }`}
                            >
                              {movie.title}
                            </p>
                            <p className={`mt-0.5 text-[10px] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                              Skipped {new Date(createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <button
                              type="button"
                              onClick={() => setDiscoverSkipDetailMovie(movie)}
                              className={`discover-skips-action rounded-sm px-0 py-0.5 text-left underline-offset-2 transition hover:underline ${
                                isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-slate-600 hover:text-slate-900"
                              }`}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleRestoreDiscoverSkip(movie)}
                              className={`discover-skips-action rounded-sm px-0 py-0.5 text-left underline-offset-2 transition hover:underline ${
                                isDarkMode ? "text-violet-400 hover:text-violet-300" : "text-violet-700 hover:text-violet-800"
                              }`}
                            >
                              Restore
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
      {discoverSkipDetailMovie ? (
        <MovieDetailsModal
          movie={discoverSkipDetailMovie}
          isDarkMode={isDarkMode}
          onClose={() => setDiscoverSkipDetailMovie(null)}
          contextLabel="Skipped on Discover"
          footer={({ openTrailer }) => {
            const inPicks = acceptedMovies.some((m) => m.id === discoverSkipDetailMovie.id);
            return (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary min-h-12 w-full flex-1 sm:min-w-[8rem]"
                  onClick={() => void openTrailer()}
                >
                  Trailer
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary min-h-12 w-full flex-1 sm:min-w-[8rem]"
                  onClick={() => void handleRestoreDiscoverSkip(discoverSkipDetailMovie, { closeModals: true })}
                >
                  Back in Discover
                </button>
                <button
                  type="button"
                  disabled={inPicks}
                  className="ui-btn ui-btn-primary min-h-12 w-full flex-1 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[8rem]"
                  onClick={() => {
                    void (async () => {
                      registerMovies([discoverSkipDetailMovie]);
                      await swipeMovie(discoverSkipDetailMovie.id, "accepted");
                      setDiscoverSkipDetailMovie(null);
                      setDiscoverSkipsModalOpen(false);
                    })();
                  }}
                >
                  {inPicks ? "Already in picks" : "Add to picks"}
                </button>
              </div>
            );
          }}
        />
      ) : null}
      <ModalPortal open={Boolean(editingWatchedEntry)}>
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
            <span className="ui-modal-accent-bar" aria-hidden />
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
            <div className="ui-shell-body !pt-4 font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif]">
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
                  className={`min-h-10 rounded-[16px] border px-2.5 py-2 text-left transition ${
                    isDarkMode
                      ? "border-rose-400/30 bg-rose-500/12 text-rose-100 hover:bg-rose-500/20"
                      : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  <p className="text-[10px] font-semibold leading-tight">Not recommended</p>
                  <p className={`mt-0.5 text-[9px] leading-snug ${isDarkMode ? "text-rose-100/80" : "text-rose-600/85"}`}>
                    Keep this title in your watched list, marked as not recommended.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await markPickWatched(editingWatchedEntry.movie.id, true);
                    setEditingWatchedMovieId(null);
                  }}
                  className={`min-h-10 rounded-[16px] border px-2.5 py-2 text-left transition ${
                    isDarkMode
                      ? "border-emerald-400/30 bg-emerald-500/14 text-emerald-100 hover:bg-emerald-500/24"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  <p className="text-[10px] font-semibold leading-tight">Recommend</p>
                  <p className={`mt-0.5 text-[9px] leading-snug ${isDarkMode ? "text-emerald-100/80" : "text-emerald-700/85"}`}>
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
      </ModalPortal>

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
        bare
        backgroundClassName={proHeaderCardStyle}
        heroImageUrl={headerHeroPosterUrl}
        className={`fade-up-enter discover-toolbar-enter${selectedProfileStyle === "rainbow" ? " surface-rainbow-top-accent" : ""}`}
        style={{ animationDelay: "0ms" }}
      >
        {proHeaderPatternClass ? (
          <span className={`pointer-events-none absolute inset-0 z-0 ${proHeaderPatternClass}`} aria-hidden />
        ) : null}
        <form className="relative z-10 w-full min-w-0 space-y-4 bg-transparent" onSubmit={handleSubmit}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="profile-avatar-pop relative shrink-0">
                <div
                  className={`ring-violet-400/35 animate-[discoverHeroReveal_0.45s_ease-out_both] rounded-full ring-2 ring-offset-2 [animation-delay:40ms] sm:ring-offset-4 ${
                    isDarkMode ? "ring-offset-transparent" : "ring-offset-slate-50"
                  }`}
                >
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
                  aria-label="Close edit profile"
                  title="Close edit profile"
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                    isDarkMode ? "bg-white/10 text-slate-100 hover:bg-white/15" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" strokeWidth="2.2" aria-hidden>
                    <path d="M18 6 6 18" strokeLinecap="round" />
                    <path d="m6 6 12 12" strokeLinecap="round" />
                  </svg>
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
          <div className="space-y-3 sm:space-y-4">
            {isEditing ? (
              <div className="space-y-5 sm:space-y-6">
                <section className={`space-y-3 p-3 sm:p-4 ${editSectionShell}`}>
                  <button
                    type="button"
                    onClick={() =>
                      setEditSectionsOpen((current) => ({
                        ...current,
                        basicInfo: !current.basicInfo,
                      }))
                    }
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Basic info
                    </p>
                    <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`} aria-hidden>
                      {editSectionsOpen.basicInfo ? "−" : "+"}
                    </span>
                  </button>
                  <div className={editSectionsOpen.basicInfo ? "" : "hidden"}>
                  <div className="flex w-full min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="flex w-full min-w-0 flex-1 flex-col gap-4 sm:max-w-sm">
                      <div className="flex shrink-0 flex-col items-center gap-3 sm:items-start">
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
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-4 w-4"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                aria-hidden
                              >
                                <path d="M3 6h18" strokeLinecap="round" />
                                <path d="M8 6V4h8v2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M10 11v6M14 11v6" strokeLinecap="round" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                        <p
                          className={`w-full text-center text-[10px] font-semibold uppercase tracking-[0.14em] sm:text-left ${
                            isDarkMode ? "text-slate-500" : "text-slate-500"
                          }`}
                        >
                          Profile photo
                        </p>
                        <div className="flex w-full min-w-0 max-w-sm flex-col gap-2.5 sm:max-w-xs">
                          <label
                            className={`auth-primary-glow flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full px-4 py-2.5 text-center text-xs font-bold text-white transition active:scale-[0.98] ${actionGradient} ${actionGradientHover} ${actionRing}`}
                          >
                            Upload from gallery
                            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                          </label>
                          <button
                            type="button"
                            onClick={() => setAvatarPresetModalOpen(true)}
                            className={`w-full min-h-11 rounded-full border px-4 py-2.5 text-center text-xs font-bold transition active:scale-[0.99] ${
                              isDarkMode
                                ? "border-white/20 bg-white/[0.08] text-slate-100 hover:bg-white/12"
                                : "border-slate-300/90 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
                            }`}
                          >
                            Choose a default poster
                          </button>
                        </div>
                        {clearAvatarOnSave ? (
                          <p
                            className={`max-w-[12rem] text-center text-[11px] font-medium sm:text-left ${isDarkMode ? "text-amber-200" : "text-amber-800"}`}
                          >
                            Photo will be removed when you save.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    {avatarPreview ? (
                      <div className="min-w-0 flex-1 space-y-2">
                        <p
                          className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                        >
                          Preview
                        </p>
                        <div
                          className={`relative mx-auto aspect-square w-full max-w-[11rem] overflow-hidden rounded-[28px] shadow-inner sm:mx-0 ${
                            isDarkMode ? "ring-2 ring-violet-400/25" : "ring-2 ring-violet-200/80"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- user-selected blob or TMDb preset */}
                          <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                        </div>
                        <p className={`text-[11px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {avatarPreview.startsWith("blob:")
                            ? "Shown as a circle; center the subject in your photo."
                            : "Poster art is cropped to a circle like any profile photo."}
                        </p>
                      </div>
                    ) : null}
                  </div>

                <div className="flex min-w-0 flex-1 flex-col gap-3.5 sm:max-w-xl">
                  <label className={`block space-y-2 ${labelClass}`}>
                    Username
                    <input name="name" defaultValue={currentUser.name} className={inputClass} autoComplete="username" />
                  </label>
                  <label className={`block space-y-2 ${labelClass}`}>
                    Bio
                    <textarea name="bio" defaultValue={currentUser.bio} rows={4} className={`${inputClass} min-h-[5.5rem] resize-y`} />
                  </label>
                  <div className="space-y-2">
                    <p className={labelClass}>Favorite movie</p>
                    <input
                      value={favoriteMovieSearchQuery}
                      onChange={(event) => setFavoriteMovieSearchQuery(event.target.value)}
                      className={inputClass}
                      placeholder="Search and pick one movie..."
                    />
                    {favoriteMovieSearchState === "loading" ? (
                      <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Searching...
                      </p>
                    ) : null}
                    {favoriteMovieSearchMessage ? (
                      <p
                        className={`text-xs ${
                          favoriteMovieSearchState === "error"
                            ? isDarkMode
                              ? "text-rose-300"
                              : "text-rose-700"
                            : isDarkMode
                              ? "text-slate-400"
                              : "text-slate-500"
                        }`}
                      >
                        {favoriteMovieSearchMessage}
                      </p>
                    ) : null}
                    {favoriteMovieSearchResults.length > 0 ? (
                      <div
                        className={`max-h-56 overflow-y-auto rounded-[16px] border ${
                          isDarkMode
                            ? "border-white/12 bg-white/[0.03]"
                            : "border-slate-200/90 bg-white"
                        }`}
                      >
                        <ul className={`divide-y ${isDarkMode ? "divide-white/10" : "divide-slate-100"}`}>
                          {favoriteMovieSearchResults.slice(0, 8).map((movie) => (
                            <li key={`favorite-search-${movie.id}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setFavoriteMovieDraft({
                                    id: movie.id,
                                    title: movie.title,
                                    year: movie.year,
                                    posterImageUrl: movie.poster.imageUrl,
                                    mediaType: movie.mediaType,
                                  });
                                  setFavoriteMovieSearchQuery(movie.title);
                                  setFavoriteMovieSearchResults([]);
                                  setFavoriteMovieSearchState("idle");
                                  setFavoriteMovieSearchMessage("");
                                }}
                                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                                  isDarkMode
                                    ? "text-slate-100 hover:bg-white/8"
                                    : "text-slate-800 hover:bg-slate-50"
                                }`}
                              >
                                <span className="truncate">{movie.title}</span>
                                <span className={`shrink-0 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                  {movie.year}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {favoriteMovieDraft ? (
                      <div
                        className={`flex items-center justify-between gap-3 rounded-[16px] border px-3 py-2 ${
                          isDarkMode
                            ? "border-violet-400/25 bg-violet-500/10"
                            : "border-violet-200 bg-violet-50/80"
                        }`}
                      >
                        <p className={`min-w-0 truncate text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          {favoriteMovieDraft.title} ({favoriteMovieDraft.year})
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setFavoriteMovieDraft(null);
                            setFavoriteMovieSearchQuery("");
                            setFavoriteMovieSearchResults([]);
                            setFavoriteMovieSearchState("idle");
                            setFavoriteMovieSearchMessage("");
                          }}
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isDarkMode ? "bg-white/10 text-slate-200" : "bg-white text-slate-700 ring-1 ring-slate-200"
                          }`}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
                </div>
                </section>

                <section className={`space-y-3 p-3 sm:p-4 ${editSectionShell}`}>
                  <button
                    type="button"
                    onClick={() =>
                      setEditSectionsOpen((current) => ({
                        ...current,
                        headerBackground: !current.headerBackground,
                      }))
                    }
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Header background
                      </p>
                      <p className={`mt-1 text-[11px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Pick a film — friends see the same art on your card.
                      </p>
                    </div>
                    <span className={`pt-0.5 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`} aria-hidden>
                      {editSectionsOpen.headerBackground ? "−" : "+"}
                    </span>
                  </button>
                  {editSectionsOpen.headerBackground ? (
                    <div className="space-y-2">
                      <p className={`text-[11px] font-medium ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                        Search a movie or series (uses its poster as the cover behind your name).
                      </p>
                      <input
                        value={headerBgSearchQuery}
                        onChange={(event) => setHeaderBgSearchQuery(event.target.value)}
                        className={inputClass}
                        placeholder="Type to search TMDb…"
                      />
                      {headerBgSearchState === "loading" ? (
                        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          Searching…
                        </p>
                      ) : null}
                      {headerBgSearchMessage ? (
                        <p
                          className={`text-xs ${
                            headerBgSearchState === "error"
                              ? isDarkMode
                                ? "text-rose-300"
                                : "text-rose-700"
                              : isDarkMode
                                ? "text-slate-400"
                                : "text-slate-500"
                          }`}
                        >
                          {headerBgSearchMessage}
                        </p>
                      ) : null}
                      {headerBgSearchResults.length > 0 ? (
                        <div
                          className={`max-h-56 overflow-y-auto rounded-[16px] border ${
                            isDarkMode
                              ? "border-white/12 bg-white/[0.03]"
                              : "border-slate-200/90 bg-white"
                          }`}
                        >
                          <ul className={`divide-y ${isDarkMode ? "divide-white/10" : "divide-slate-100"}`}>
                            {headerBgSearchResults.slice(0, 8).map((movie) => (
                              <li key={`header-bg-search-${movie.id}`}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProfileHeaderMovieDraft({
                                      id: movie.id,
                                      title: movie.title,
                                      year: movie.year,
                                      posterImageUrl: movie.poster.imageUrl,
                                      mediaType: movie.mediaType,
                                    });
                                    setHeaderBgSearchQuery(movie.title);
                                    setHeaderBgSearchResults([]);
                                    setHeaderBgSearchState("idle");
                                    setHeaderBgSearchMessage("");
                                  }}
                                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                                    isDarkMode
                                      ? "text-slate-100 hover:bg-white/8"
                                      : "text-slate-800 hover:bg-slate-50"
                                  }`}
                                >
                                  <span className="truncate">
                                    {movie.title}{" "}
                                    <span className="text-xs font-normal text-slate-500">
                                      ({movie.mediaType === "series" ? "Series" : "Movie"})
                                    </span>
                                  </span>
                                  <span className={`shrink-0 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                                    {movie.year}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {profileHeaderMovieDraft ? (
                        <div
                          className={`flex items-center justify-between gap-3 rounded-[16px] border px-3 py-2 ${
                            isDarkMode
                              ? "border-cyan-400/25 bg-cyan-500/10"
                              : "border-cyan-200 bg-cyan-50/80"
                          }`}
                        >
                          <p className={`min-w-0 truncate text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                            {profileHeaderMovieDraft.title} ({profileHeaderMovieDraft.year})
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setProfileHeaderMovieDraft(null);
                              setHeaderBgSearchQuery("");
                              setHeaderBgSearchResults([]);
                              setHeaderBgSearchState("idle");
                              setHeaderBgSearchMessage("");
                            }}
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isDarkMode ? "bg-white/10 text-slate-200" : "bg-white text-slate-700 ring-1 ring-slate-200"
                            }`}
                          >
                            Clear
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section className={`space-y-3 p-3 sm:p-4 ${editSectionShell}`}>
                  <button
                    type="button"
                    onClick={() =>
                      setEditSectionsOpen((current) => ({
                        ...current,
                        watchedReviews: !current.watchedReviews,
                      }))
                    }
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Watched reviews
                      </p>
                      <p className={`mt-1 text-[11px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        From Picks after you mark a title watched. Titles you mark <span className="font-semibold">Recommended</span> appear on your friend profile for people you’re linked with.
                      </p>
                    </div>
                    <span className={`pt-0.5 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`} aria-hidden>
                      {editSectionsOpen.watchedReviews ? "−" : "+"}
                    </span>
                  </button>
                  {editSectionsOpen.watchedReviews ? watchedReviewsEditorSection : null}
                </section>

                <section className={`space-y-4 p-3 sm:p-4 ${editSectionShell}`}>
                  <button
                    type="button"
                    onClick={() =>
                      setEditSectionsOpen((current) => ({
                        ...current,
                        discoveryPreferences: !current.discoveryPreferences,
                      }))
                    }
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Discovery preferences
                    </p>
                    <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`} aria-hidden>
                      {editSectionsOpen.discoveryPreferences ? "−" : "+"}
                    </span>
                  </button>
                  {editSectionsOpen.discoveryPreferences && (
                  <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div
                      className={`flex flex-col gap-3 rounded-[18px] border p-4 ${
                        isDarkMode ? "border-white/12 bg-white/[0.04]" : "border-slate-200/90 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Genres you like</p>
                          <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                            {favoriteGenresDraft.length}/{FAVORITE_GENRE_LIMIT} selected — stronger Discover signal when fewer.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsFavoriteGenresOpen((current) => !current)}
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isDarkMode ? "bg-white/10 text-slate-200" : "bg-white text-slate-700 ring-1 ring-slate-200/90"
                          }`}
                        >
                          {isFavoriteGenresOpen ? "Hide" : "Edit"}
                        </button>
                      </div>
                      {isFavoriteGenresOpen ? (
                        <div className="max-h-[min(40vh,14rem)] overflow-y-auto overscroll-contain pr-0.5">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {profileGenres.map((genre) => {
                              const active = favoriteGenresDraft.includes(genre);
                              const atFavoriteLimit =
                                !active && favoriteGenresDraft.length >= FAVORITE_GENRE_LIMIT;
                              return (
                                <button
                                  key={`fav-${genre}`}
                                  type="button"
                                  disabled={atFavoriteLimit}
                                  title={
                                    atFavoriteLimit
                                      ? `Select up to ${FAVORITE_GENRE_LIMIT} favorite genres`
                                      : undefined
                                  }
                                  onClick={() =>
                                    setFavoriteGenresDraft((current) => {
                                      if (current.includes(genre)) {
                                        return current.filter((entry) => entry !== genre);
                                      }
                                      if (current.length >= FAVORITE_GENRE_LIMIT) {
                                        return current;
                                      }
                                      return [...current, genre];
                                    })
                                  }
                                  className={`min-h-[2.25rem] w-full truncate rounded-xl px-2.5 py-1.5 text-left text-[11px] font-semibold leading-tight transition sm:text-xs ${
                                    active
                                      ? "bg-violet-600 text-white shadow-sm"
                                      : atFavoriteLimit
                                        ? isDarkMode
                                          ? "cursor-not-allowed border border-white/8 bg-white/[0.03] text-slate-500 opacity-55"
                                          : "cursor-not-allowed border border-slate-200/60 bg-slate-100/80 text-slate-400 opacity-70"
                                        : isDarkMode
                                          ? "border border-white/12 bg-white/8 text-slate-200"
                                          : "border border-slate-200/90 bg-white text-slate-700"
                                  }`}
                                >
                                  {genre}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div
                      className={`flex flex-col gap-3 rounded-[18px] border p-4 ${
                        isDarkMode ? "border-white/12 bg-white/[0.04]" : "border-slate-200/90 bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Genres you dislike</p>
                          <p className={`mt-0.5 text-[11px] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                            {dislikedGenresDraft.length} selected
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDislikedGenresOpen((current) => !current)}
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isDarkMode ? "bg-white/10 text-slate-200" : "bg-white text-slate-700 ring-1 ring-slate-200/90"
                          }`}
                        >
                          {isDislikedGenresOpen ? "Hide" : "Edit"}
                        </button>
                      </div>
                      {isDislikedGenresOpen ? (
                        <div className="max-h-[min(40vh,14rem)] overflow-y-auto overscroll-contain pr-0.5">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                                  className={`min-h-[2.25rem] w-full truncate rounded-xl px-2.5 py-1.5 text-left text-[11px] font-semibold leading-tight transition sm:text-xs ${
                                    active
                                      ? "bg-rose-600 text-white shadow-sm"
                                      : isDarkMode
                                        ? "border border-white/12 bg-white/8 text-slate-200"
                                        : "border border-slate-200/90 bg-white text-slate-700"
                                  }`}
                                >
                                  {genre}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className={`rounded-[18px] border p-4 ${
                      isDarkMode ? "border-white/12 bg-white/[0.04]" : "border-slate-200/90 bg-slate-50/50"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>Prefer to discover</p>
                    <div className="mt-3 flex flex-wrap gap-2">
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
                  </>
                  )}
                </section>

                <section className={`space-y-3 p-3 sm:p-4 ${editSectionShell}`}>
                  <button
                    type="button"
                    onClick={() =>
                      setEditSectionsOpen((current) => ({
                        ...current,
                        discoverSkips: !current.discoverSkips,
                      }))
                    }
                    className="flex w-full items-start justify-between gap-2 text-left"
                  >
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Discover skips
                      </p>
                      <p className={`mt-1 text-[11px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        Titles you pass stay off your Discover stack for about a week. Open the list to bring one back
                        into your queue, read details, or save it to picks.
                      </p>
                    </div>
                    <span className={`pt-0.5 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`} aria-hidden>
                      {editSectionsOpen.discoverSkips ? "−" : "+"}
                    </span>
                  </button>
                  {editSectionsOpen.discoverSkips ? (
                    <button
                      type="button"
                      onClick={() => setDiscoverSkipsModalOpen(true)}
                      className={`w-full rounded-[16px] border px-4 py-3 text-left text-sm font-semibold transition sm:max-w-md ${
                        isDarkMode
                          ? "border-white/14 bg-white/[0.06] text-white hover:bg-white/[0.1]"
                          : "border-slate-200/90 bg-white text-slate-900 shadow-sm hover:bg-slate-50"
                      }`}
                    >
                      <span className="block">Recently skipped on Discover</span>
                      <span className={`mt-0.5 block text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {skippedDiscoverMovies.length === 0
                          ? "No hidden titles right now"
                          : `${skippedDiscoverMovies.length} title${skippedDiscoverMovies.length === 1 ? "" : "s"} hidden from Discover`}
                      </span>
                    </button>
                  ) : null}
                </section>
              </div>
            ) : (
              <div className="space-y-2 pt-0">
                {favoriteMoviePreview ? (
                  <div
                    className={`flex items-center gap-3 rounded-[18px] border p-3 ${
                      isDarkMode
                        ? "border-white/12 bg-white/[0.05]"
                        : "border-slate-200/90 bg-slate-50/80"
                    }`}
                  >
                    <div
                      className={`relative h-16 w-12 shrink-0 overflow-hidden rounded-[10px] ${
                        isDarkMode ? "bg-white/8" : "bg-slate-200"
                      }`}
                    >
                      <PosterBackdrop
                        imageUrl={favoriteMoviePreview.posterImageUrl}
                        profile="search"
                        objectFit="cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {favoriteMoviePreview.title}
                      </p>
                      <p className={`mt-0.5 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {favoriteMoviePreview.year} • {favoriteMoviePreview.mediaType === "series" ? "Series" : "Movie"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    No favorite title yet — tap Edit to add one in Basic info.
                  </p>
                )}
                <p className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  About
                </p>
                <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {currentUser.bio?.trim() ? currentUser.bio : "—"}
                </p>
              </div>
            )}
          </div>
        {!isEditing ? (
          <>
            <div className="grid grid-cols-3 gap-2 pt-0.5 sm:gap-3">
              {(
                [
                  { value: acceptedMovies.length, label: "Picks", href: "/picks" as const },
                  {
                    value: linkedUsers.filter((user) => user.status === "accepted").length,
                    label: "Friends",
                    href: "/shared" as const,
                  },
                  {
                    value: profileWatchedTotal,
                    label: "Watched",
                    href: "/picks" as const,
                  },
                ] as const
              ).map((stat, index) => (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className={`discover-toolbar-enter rounded-[22px] px-2 py-3 text-center transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99] sm:px-3 sm:py-4 ${statShell}`}
                  style={{ animationDelay: `${80 + index * 70}ms` }}
                >
                  <p
                    className={`text-xl font-semibold tabular-nums sm:text-2xl ${isDarkMode ? "text-white" : "text-slate-900"}`}
                  >
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
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                href="/connect"
                className={`ui-btn ui-btn-primary flex min-h-11 w-full items-center justify-center px-4 text-sm font-semibold sm:w-auto`}
              >
                Connect
              </Link>
              <button
                type="button"
                disabled={copyInviteBusy}
                onClick={() => void handleCopyInviteFromProfile()}
                className={`ui-btn ui-btn-secondary flex min-h-11 w-full items-center justify-center px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto`}
              >
                {copyInviteBusy ? "Preparing…" : "Copy my link"}
              </button>
            </div>
          </>
        ) : null}
        </form>
      </SurfaceCard>

      <SurfaceCard
        className={`discover-toolbar-enter relative overflow-hidden !p-0 ${proStudioSurface}`}
        style={{ animationDelay: "95ms" }}
      >
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
              <p className={`text-[15px] font-bold leading-tight tracking-tight sm:text-base ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                Pro Studio
              </p>
              <p className={`mt-0.5 text-[11px] font-medium leading-snug sm:text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Public card style for friends
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
                Pro unlocks profile themes.
                <Link href="/settings" className="ml-2 font-semibold underline underline-offset-2">
                  Settings
                </Link>
              </div>
            ) : (
              <>
                <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Themes
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {profileStyleOptions.map((styleOption) => {
                    const selected = selectedProfileStyle === styleOption.id;
                    return (
                      <button
                        key={styleOption.id}
                        type="button"
                        onClick={() => void handleSelectProfileStyle(styleOption.id)}
                        className={`relative flex min-h-[4.25rem] flex-col justify-end overflow-hidden rounded-[16px] border px-3 py-3 text-left transition ${proStylePreviewById[styleOption.id]} ${
                          selected
                            ? isDarkMode
                              ? "ring-2 ring-violet-300/45"
                              : "ring-2 ring-violet-400/55"
                            : ""
                        }`}
                      >
                        <span className={`pointer-events-none absolute inset-0 ${proStylePatternById[styleOption.id]}`} aria-hidden />
                        <p className={`relative text-sm font-bold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                          {styleOption.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Friends see this on your profile.
                </p>
              </>
            )}
          </div>
        ) : null}
      </SurfaceCard>

      <div className="grid grid-cols-1 gap-3 px-px sm:grid-cols-2 sm:gap-4">
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
