"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";

type SaveFeedback = "idle" | "saving" | "saved" | "error";

export default function ProfilePage() {
  const {
    currentUser,
    acceptedMovies,
    linkedUsers,
    sharedMovies,
    updateProfile,
    isDarkMode,
    isReady,
  } = useAppState();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [clearAvatarOnSave, setClearAvatarOnSave] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback>("idle");
  const [saveMessage, setSaveMessage] = useState("");

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

  const resetAvatarDraft = () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(undefined);
    setAvatarFile(null);
    setClearAvatarOnSave(false);
  };

  const handleRemovePhotoClick = () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(undefined);
    setAvatarFile(null);
    setClearAvatarOnSave(true);
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

  const quickLinkShell = isDarkMode
    ? "border border-white/14 bg-white/8 text-slate-100 shadow-[0_14px_36px_rgba(0,0,0,0.25)] hover:bg-white/12"
    : "border border-white/70 bg-white/85 text-slate-800 shadow-[0_18px_50px_rgba(116,82,186,0.12)] hover:bg-white";

  const inputClass = isDarkMode
    ? "w-full rounded-[20px] border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white/10"
    : "w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white";

  const labelClass = isDarkMode ? "text-sm font-medium text-slate-200" : "text-sm font-medium text-slate-700";

  return (
    <div className="space-y-5">
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
        description="Your snapshot, shortcuts, and how others see you in CineMatch."
      />

      <SurfaceCard className="discover-toolbar-enter space-y-6 !p-5 sm:!p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
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
              <h2 className={`text-xl font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                {currentUser.name}
              </h2>
              <p className={`truncate text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {currentUser.email}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditing((current) => {
                const next = !current;

                if (!next) {
                  resetAvatarDraft();
                  setSaveFeedback("idle");
                  setSaveMessage("");
                }

                return next;
              });
            }}
            aria-label={isEditing ? "Close profile editor" : "Edit profile"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm transition hover:brightness-110 active:scale-95 ${
              isDarkMode
                ? "bg-violet-500/22 text-violet-100 ring-1 ring-violet-400/30"
                : "bg-violet-100 text-violet-700 ring-1 ring-violet-200/80 hover:bg-violet-200"
            }`}
          >
            {isEditing ? (
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
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="ui-icon-md ui-icon-stroke"
                aria-hidden="true"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            )}
          </button>
        </div>
        <div
          className={`mt-2 rounded-[22px] px-4 py-4 ${
            isDarkMode ? "border border-white/10 bg-white/6" : "bg-slate-50"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-[0.18em] ${
              isDarkMode ? "text-slate-400" : "text-slate-400"
            }`}
          >
            City
          </p>
          <p className={`mt-2 text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
            {currentUser.city}
          </p>
          <p className={`mt-5 text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
            {currentUser.bio}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 sm:gap-3">
          {[
            { value: acceptedMovies.length, label: "Picks" },
            {
              value: linkedUsers.filter((user) => user.status === "accepted").length,
              label: "Friends",
            },
            {
              value: sharedMovies.filter((movie) => movie.watched).length,
              label: "Watched",
            },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className={`discover-toolbar-enter rounded-[22px] px-2 py-3 text-center sm:px-3 sm:py-4 ${statShell}`}
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
            </div>
          ))}
        </div>
      </SurfaceCard>

      {isEditing ? (
        <SurfaceCard className="expand-soft space-y-5 !p-5 sm:!p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              Edit profile
            </p>
            <button
              type="button"
              onClick={() => {
                resetAvatarDraft();
                setIsEditing(false);
                setSaveFeedback("idle");
                setSaveMessage("");
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                isDarkMode
                  ? "text-slate-300 hover:bg-white/10"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Cancel
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div
              className={`rounded-[24px] px-4 py-4 ${
                isDarkMode ? "border border-white/10 bg-white/6" : "bg-slate-50"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <AvatarBadge
                    initials={currentUser.avatar}
                    imageUrl={activeAvatarPreview}
                    sizeClassName="h-20 w-20"
                    textClassName="text-xl font-semibold"
                  />
                  <label
                    className={`inline-flex cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition active:scale-[0.98] ${
                      isDarkMode
                        ? "bg-violet-500/22 text-violet-100 ring-1 ring-violet-400/28 hover:bg-violet-500/30"
                        : "bg-violet-100 text-violet-800 ring-1 ring-violet-200/80 hover:bg-violet-200"
                    }`}
                  >
                    Choose photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
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
                      <img
                        src={avatarPreview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className={`text-[11px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Shown as a circle in the app; center the subject when you pick a photo.
                    </p>
                  </div>
                ) : null}
              </div>
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
              <textarea
                name="bio"
                defaultValue={currentUser.bio}
                rows={4}
                className={inputClass}
              />
            </label>

            <div
              className={`space-y-3 rounded-[22px] border px-4 py-4 ${
                isDarkMode
                  ? "border-rose-400/25 bg-rose-500/8"
                  : "border-rose-200/90 bg-rose-50/80"
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${isDarkMode ? "text-rose-200" : "text-rose-700"}`}>
                Photo & data
              </p>
              <p className={`text-xs leading-relaxed ${isDarkMode ? "text-rose-100/85" : "text-rose-900/85"}`}>
                Removing your photo cannot be undone from here without uploading a new image.
              </p>
              <button
                type="button"
                disabled={
                  clearAvatarOnSave || (!currentUser.avatarImageUrl && !avatarPreview)
                }
                onClick={handleRemovePhotoClick}
                className={`w-full rounded-[18px] border px-3 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  isDarkMode
                    ? "border-rose-400/40 bg-rose-950/40 text-rose-100 hover:bg-rose-950/60"
                    : "border-rose-300 bg-white text-rose-800 hover:bg-rose-50"
                }`}
              >
                Remove profile photo
              </button>
            </div>

            <button
              type="submit"
              disabled={saveFeedback === "saving"}
              className={`relative w-full overflow-hidden rounded-[22px] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(109,40,217,0.28)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65 ${
                isDarkMode
                  ? "bg-gradient-to-br from-violet-500 to-fuchsia-700"
                  : "bg-gradient-to-br from-violet-600 to-violet-700"
              }`}
            >
              {saveFeedback === "saving" ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"
                    aria-hidden
                  />
                  Saving…
                </span>
              ) : (
                "Save profile"
              )}
            </button>

          </form>
        </SurfaceCard>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/linked"
          className={`discover-toolbar-enter flex min-h-[3.25rem] items-center justify-center rounded-[24px] px-4 py-4 text-center text-sm font-semibold transition ${quickLinkShell}`}
        >
          Friends
        </Link>
        <Link
          href="/connect"
          className={`discover-toolbar-enter flex min-h-[3.25rem] items-center justify-center rounded-[24px] px-4 py-4 text-center text-sm font-semibold transition [animation-delay:70ms] ${quickLinkShell}`}
        >
          Connect
        </Link>
        <Link
          href="/settings"
          className={`discover-toolbar-enter flex min-h-[3.25rem] items-center justify-center rounded-[24px] px-4 py-4 text-center text-sm font-semibold transition [animation-delay:140ms] ${quickLinkShell}`}
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
