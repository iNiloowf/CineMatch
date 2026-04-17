"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { SettingToggle } from "@/components/setting-toggle";
import { SurfaceCard } from "@/components/surface-card";
import type { Achievement } from "@/lib/types";
import { partitionAchievements } from "@/lib/achievement-utils";
import { useAppState } from "@/lib/app-state";

function AchievementRow({
  achievement,
  isDarkMode,
}: {
  achievement: Achievement;
  isDarkMode: boolean;
}) {
  const percent = achievement.isLocked
    ? 0
    : Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
  const inProgress = !achievement.isLocked && achievement.progress < achievement.target;

  return (
    <div
      className={`rounded-[22px] border px-4 py-4 ${
        isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200/80 bg-white/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}
          >
            {achievement.title}
            {achievement.isLocked ? (
              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-amber-500">
                Locked
              </span>
            ) : null}
          </p>
          <p
            className={`text-xs leading-5 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}
          >
            {achievement.description}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            achievement.isLocked
              ? isDarkMode
                ? "bg-white/8 text-slate-400"
                : "bg-slate-100 text-slate-500"
              : inProgress
                ? isDarkMode
                  ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/22"
                  : "bg-violet-100 text-violet-700"
                : isDarkMode
                  ? "bg-white/8 text-slate-400"
                  : "bg-slate-100 text-slate-500"
          }`}
        >
          {achievement.isLocked ? "—" : `${achievement.progress}/${achievement.target}`}
        </span>
      </div>
      {!achievement.isLocked && inProgress ? (
        <div
          className={`mt-3 h-2 overflow-hidden rounded-full ${
            isDarkMode ? "bg-white/10" : "bg-slate-200/90"
          }`}
        >
          <div className="h-full rounded-full bg-violet-600" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  const {
    currentUserId,
    currentUser,
    data,
    achievements,
    isDarkMode,
    logout,
    updateProfile,
    updateSettings,
  } = useAppState();
  const settings = currentUserId ? data.settings[currentUserId] : null;
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountCity, setAccountCity] = useState("");
  const [accountBio, setAccountBio] = useState("");
  const [accountSaveState, setAccountSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [accountSaveMessage, setAccountSaveMessage] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [clearAvatarOnSave, setClearAvatarOnSave] = useState(false);

  const sectionEyebrow = isDarkMode
    ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90"
    : "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600/90";

  const preferencesDivider = isDarkMode
    ? "border-t border-white/10 pt-8 mt-2"
    : "border-t border-slate-200/90 pt-8 mt-2";

  const { incomplete: achievementsInProgress } = useMemo(
    () => partitionAchievements(achievements),
    [achievements],
  );

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    setAccountName(currentUser.name);
    setAccountCity(currentUser.city);
    setAccountBio(currentUser.bio);
  }, [currentUser]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (accountSaveState !== "saved") {
      return;
    }
    const timer = window.setTimeout(() => {
      setAccountSaveState("idle");
      setAccountSaveMessage("");
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [accountSaveState]);

  const resetAccountDraft = () => {
    if (!currentUser) {
      return;
    }
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAccountName(currentUser.name);
    setAccountCity(currentUser.city);
    setAccountBio(currentUser.bio);
    setAvatarPreview(undefined);
    setAvatarFile(null);
    setClearAvatarOnSave(false);
    setAccountSaveState("idle");
    setAccountSaveMessage("");
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

  const stageAvatarRemoval = () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(undefined);
    setAvatarFile(null);
    setClearAvatarOnSave(true);
  };

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) {
      return;
    }

    setAccountSaveState("saving");
    setAccountSaveMessage("");

    const result = await updateProfile({
      name: accountName.trim() || currentUser.name,
      city: accountCity,
      bio: accountBio,
      avatarImageUrl: clearAvatarOnSave ? null : currentUser.avatarImageUrl ?? null,
      avatarFile: clearAvatarOnSave ? null : avatarFile,
      clearAvatar: clearAvatarOnSave,
    });

    if (!result.ok) {
      setAccountSaveState("error");
      setAccountSaveMessage(result.message ?? "Couldn’t save profile details.");
      return;
    }

    setIsEditingAccount(false);
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(undefined);
    setAvatarFile(null);
    setClearAvatarOnSave(false);
    setAccountSaveState("saved");
    setAccountSaveMessage("Profile details saved.");
  };

  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Account and preferences. In-progress goals stay here; earned badges live on Profile."
      />

      {currentUser ? (
        <SurfaceCard className="fade-up-enter !p-0 overflow-hidden" style={{ animationDelay: "0ms" }}>
          {(() => {
            const activeAvatarPreview =
              clearAvatarOnSave && !avatarPreview
                ? undefined
                : avatarPreview ?? currentUser.avatarImageUrl;
            const canRemovePhoto =
              Boolean(currentUser.avatarImageUrl || avatarPreview) && !clearAvatarOnSave;

            return (
              <form
                onSubmit={handleAccountSubmit}
                className={`space-y-4 px-5 py-4 sm:px-6 sm:py-5 ${
                  isDarkMode
                    ? "bg-gradient-to-br from-violet-950/40 to-white/[0.04]"
                    : "bg-gradient-to-br from-violet-50/90 via-white to-sky-50/30"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 space-y-2">
                    <AvatarBadge
                      initials={currentUser.avatar}
                      imageUrl={activeAvatarPreview}
                      sizeClassName="h-14 w-14 sm:h-16 sm:w-16"
                      textClassName="text-lg font-bold"
                    />
                    {isEditingAccount ? (
                      <div className="space-y-1.5">
                        <label
                          className={`inline-flex cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                            isDarkMode
                              ? "bg-white/14 text-white hover:bg-white/20"
                              : "bg-white text-slate-700 shadow-sm hover:bg-slate-100"
                          }`}
                        >
                          Photo
                          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                        </label>
                        {canRemovePhoto ? (
                          <button
                            type="button"
                            onClick={stageAvatarRemoval}
                            className={`block w-full rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                              isDarkMode
                                ? "bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                            }`}
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <p className={sectionEyebrow}>Signed in as</p>
                    {isEditingAccount ? (
                      <>
                        <label className={`block space-y-1.5 text-xs font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                          Name
                          <input
                            value={accountName}
                            onChange={(event) => setAccountName(event.target.value)}
                            className={`w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none transition ${
                              isDarkMode
                                ? "border-white/12 bg-white/8 text-white placeholder:text-slate-400 focus:border-violet-400"
                                : "border-slate-200 bg-white text-slate-900 focus:border-violet-400"
                            }`}
                          />
                        </label>
                        <p className={`truncate text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          {currentUser.email}
                        </p>
                        <label className={`block space-y-1.5 text-xs font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                          City
                          <input
                            value={accountCity}
                            onChange={(event) => setAccountCity(event.target.value)}
                            className={`w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none transition ${
                              isDarkMode
                                ? "border-white/12 bg-white/8 text-white placeholder:text-slate-400 focus:border-violet-400"
                                : "border-slate-200 bg-white text-slate-900 focus:border-violet-400"
                            }`}
                          />
                        </label>
                        <label className={`block space-y-1.5 text-xs font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                          Bio
                          <textarea
                            value={accountBio}
                            onChange={(event) => setAccountBio(event.target.value)}
                            rows={3}
                            className={`w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none transition ${
                              isDarkMode
                                ? "border-white/12 bg-white/8 text-white placeholder:text-slate-400 focus:border-violet-400"
                                : "border-slate-200 bg-white text-slate-900 focus:border-violet-400"
                            }`}
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <p
                          className={`truncate text-lg font-bold leading-tight sm:text-xl ${
                            isDarkMode ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {currentUser.name}
                        </p>
                        <p
                          className={`truncate text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
                        >
                          {currentUser.email}
                        </p>
                        {currentUser.city ? (
                          <p className={`text-xs font-medium ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                            {currentUser.city}
                          </p>
                        ) : null}
                        <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                          {currentUser.bio}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {accountSaveState === "saved" || accountSaveState === "error" ? (
                  <p
                    className={`text-xs font-semibold ${
                      accountSaveState === "saved"
                        ? isDarkMode
                          ? "text-emerald-300"
                          : "text-emerald-700"
                        : isDarkMode
                          ? "text-rose-300"
                          : "text-rose-700"
                    }`}
                  >
                    {accountSaveMessage}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {isEditingAccount ? (
                    <>
                      <button
                        type="submit"
                        disabled={accountSaveState === "saving"}
                        className="ui-btn ui-btn-primary min-w-[8.5rem]"
                      >
                        {accountSaveState === "saving" ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          resetAccountDraft();
                          setIsEditingAccount(false);
                        }}
                        className="ui-btn ui-btn-secondary min-w-[8.5rem]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAccountSaveState("idle");
                        setAccountSaveMessage("");
                        setIsEditingAccount(true);
                      }}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                        isDarkMode
                          ? "bg-white/12 text-slate-100 hover:bg-white/18"
                          : "bg-white text-slate-700 shadow-sm hover:bg-slate-100"
                      }`}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </form>
            );
          })()}
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="fade-up-enter space-y-4" style={{ animationDelay: "40ms" }}>
        <p className={sectionEyebrow}>Appearance</p>
        <div className="space-y-4">
          <SettingToggle
            label="Dark mode"
            description="Switch the app to a darker evening-friendly theme."
            checked={isDarkMode}
            onChange={(checked) => updateSettings({ darkMode: checked })}
          />
          <SettingToggle
            label="Less motion"
            description="Use simpler fades and fewer moving effects. The system “reduce motion” setting also applies automatically."
            checked={settings.reduceMotion}
            onChange={(checked) => updateSettings({ reduceMotion: checked })}
          />
          <SettingToggle
            label="Autoplay trailers"
            description="When a trailer opens, start playback automatically when the network allows."
            checked={settings.autoplayTrailers}
            onChange={(checked) => updateSettings({ autoplayTrailers: checked })}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="fade-up-enter space-y-4" style={{ animationDelay: "75ms" }}>
        <p className={sectionEyebrow}>Notifications</p>
        <div className="space-y-4">
          <SettingToggle
            label="Notifications"
            description="Get nudges when new shared matches appear."
            checked={settings.notifications}
            onChange={(checked) => updateSettings({ notifications: checked })}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="fade-up-enter space-y-4" style={{ animationDelay: "110ms" }}>
        <p className={sectionEyebrow}>Privacy</p>
        <div className="space-y-4">
          <SettingToggle
            label="Hide spoilers"
            description="Keep descriptions gentle and spoiler-light."
            checked={settings.hideSpoilers}
            onChange={(checked) => updateSettings({ hideSpoilers: checked })}
          />
          <SettingToggle
            label="Cellular sync"
            description="Allow background account sync on mobile data (when available)."
            checked={settings.cellularSync}
            onChange={(checked) => updateSettings({ cellularSync: checked })}
          />
        </div>
      </SurfaceCard>

      <div className={preferencesDivider}>
        <SurfaceCard className="fade-up-enter space-y-5" style={{ animationDelay: "140ms" }}>
          <div className="space-y-1">
            <p className={sectionEyebrow}>Progress</p>
            <p
              className={`text-sm font-semibold ${
                isDarkMode ? "text-white" : "text-slate-900"
              }`}
            >
              Achievements
            </p>
            <p
              className={`text-sm leading-6 ${
                isDarkMode ? "text-slate-300" : "text-slate-500"
              }`}
            >
              Only goals you haven’t finished yet. Completed ones move to your Profile as badges.
            </p>
          </div>
          {achievementsInProgress.length === 0 ? (
            <p
              className={`rounded-[20px] border px-4 py-4 text-center text-sm ${
                isDarkMode
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
                  : "border-emerald-200/90 bg-emerald-50/90 text-emerald-900"
              }`}
            >
              You’re caught up on every goal — check your Profile for badges.
            </p>
          ) : (
            <div className="space-y-3">
              {achievementsInProgress.map((achievement) => (
                <AchievementRow key={achievement.id} achievement={achievement} isDarkMode={isDarkMode} />
              ))}
            </div>
          )}
        </SurfaceCard>
      </div>

      <div
        className={`rounded-[26px] border px-5 py-6 sm:px-6 ${
          isDarkMode
            ? "border-white/10 bg-slate-950/55 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
            : "border-slate-200/90 bg-slate-50/80 shadow-sm"
        }`}
      >
        <p className={sectionEyebrow}>Account actions</p>
        <p
          className={`mt-2 text-sm font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}
        >
          About this build
        </p>
        <p
          className={`mt-2 text-sm leading-6 ${
            isDarkMode ? "text-slate-300" : "text-slate-600"
          }`}
        >
          The UI runs with mock data first, and the repo also ships API routes plus a SQL schema for
          Supabase. Preferences above stay on this device until you sync a real account.
        </p>
        <div
          className={`my-6 h-px w-full ${isDarkMode ? "bg-white/10" : "bg-slate-200/90"}`}
          aria-hidden
        />
        <button
          type="button"
          onClick={logout}
          className={`w-full rounded-[20px] border px-4 py-3.5 text-sm font-semibold ${
            isDarkMode
              ? "border-rose-400/40 bg-rose-500/14 text-rose-50 hover:bg-rose-500/22"
              : "border-rose-200 bg-white text-rose-600 shadow-sm hover:bg-rose-50"
          }`}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
