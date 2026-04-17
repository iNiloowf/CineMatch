"use client";

import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { SettingToggle } from "@/components/setting-toggle";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";

export default function SettingsPage() {
  const {
    currentUserId,
    currentUser,
    data,
    achievements,
    isDarkMode,
    logout,
    updateSettings,
  } = useAppState();
  const settings = currentUserId ? data.settings[currentUserId] : null;

  if (!settings) {
    return null;
  }
  const sectionEyebrow = isDarkMode ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90" : "text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-600/90";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Account, appearance, and progress — all in one place."
      />

      {currentUser ? (
        <SurfaceCard className="fade-up-enter !p-0 overflow-hidden" style={{ animationDelay: "0ms" }}>
          <div
            className={`flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5 ${
              isDarkMode
                ? "border-b border-white/10 bg-gradient-to-br from-violet-950/40 to-white/[0.04]"
                : "border-b border-violet-100/90 bg-gradient-to-br from-violet-50/90 via-white to-sky-50/30"
            }`}
          >
            <AvatarBadge
              initials={currentUser.avatar}
              imageUrl={currentUser.avatarImageUrl}
              sizeClassName="h-14 w-14 sm:h-16 sm:w-16"
              textClassName="text-lg font-bold"
            />
            <div className="min-w-0 flex-1">
              <p className={sectionEyebrow}>Signed in as</p>
              <p
                className={`mt-1 truncate text-lg font-bold leading-tight sm:text-xl ${
                  isDarkMode ? "text-white" : "text-slate-900"
                }`}
              >
                {currentUser.name}
              </p>
              <p
                className={`mt-0.5 truncate text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}
              >
                {currentUser.email}
              </p>
              {currentUser.city ? (
                <p className={`mt-1 text-xs font-medium ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                  {currentUser.city}
                </p>
              ) : null}
            </div>
          </div>
          <p
            className={`px-5 py-3 text-xs leading-5 sm:px-6 ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Profile photo and bio are edited from the Profile tab.
          </p>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className="fade-up-enter space-y-4" style={{ animationDelay: "45ms" }}>
        <p className={sectionEyebrow}>Appearance & comfort</p>
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
            label="Notifications"
            description="Get nudges when new shared matches appear."
            checked={settings.notifications}
            onChange={(checked) => updateSettings({ notifications: checked })}
          />
          <SettingToggle
            label="Hide spoilers"
            description="Keep descriptions gentle and spoiler-light."
            checked={settings.hideSpoilers}
            onChange={(checked) => updateSettings({ hideSpoilers: checked })}
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="fade-up-enter space-y-5" style={{ animationDelay: "100ms" }}>
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
            Small milestones based on what you save, swipe, link, and watch together.
          </p>
        </div>
        <div className="space-y-3">
          {achievements.map((achievement) => {
            const completed = achievement.progress >= achievement.target;
            const percent = Math.min(
              100,
              Math.round((achievement.progress / achievement.target) * 100),
            );

            return (
              <div
                key={achievement.id}
                className={`rounded-[22px] border px-4 py-4 ${
                  isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200/80 bg-white/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        isDarkMode ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {achievement.title}
                    </p>
                    <p
                      className={`text-xs leading-5 ${
                        isDarkMode ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {achievement.description}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      completed
                        ? isDarkMode
                          ? "bg-emerald-500/18 text-emerald-100 ring-1 ring-emerald-400/25"
                          : "bg-emerald-100 text-emerald-700"
                        : isDarkMode
                          ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/22"
                          : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    {completed
                      ? "Unlocked"
                      : `${achievement.progress}/${achievement.target}`}
                  </span>
                </div>
                <div
                  className={`mt-3 h-2 overflow-hidden rounded-full ${
                    isDarkMode ? "bg-white/10" : "bg-slate-200/90"
                  }`}
                >
                  <div
                    className={`h-full rounded-full ${
                      completed ? "bg-emerald-500" : "bg-violet-600"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard className="fade-up-enter space-y-5" style={{ animationDelay: "155ms" }}>
        <div className="space-y-1">
          <p className={sectionEyebrow}>About</p>
          <p
            className={`text-sm font-semibold ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            About this build
          </p>
          <p
            className={`text-sm leading-6 ${
              isDarkMode ? "text-slate-300" : "text-slate-500"
            }`}
          >
            The UI is fully runnable with mock data first, and the repo also ships
            with API routes plus a SQL schema for the next backend step.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className={`mt-4 w-full rounded-[20px] border px-4 py-3 text-sm font-semibold ${
            isDarkMode
              ? "border-rose-400/35 bg-rose-500/12 text-rose-100 hover:bg-rose-500/18"
              : "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
          }`}
        >
          Log out
        </button>
      </SurfaceCard>
    </div>
  );
}
