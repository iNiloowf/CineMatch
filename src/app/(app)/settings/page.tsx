"use client";

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
    logout,
    updateSettings,
  } = useAppState();
  const settings = currentUserId ? data.settings[currentUserId] : null;

  if (!settings) {
    return null;
  }
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description={`Preferences and achievements for ${currentUser?.name ?? "your account"}.`}
      />

      <SurfaceCard className="space-y-3">
        <SettingToggle
          label="Dark mode"
          description="Switch the app to a darker evening-friendly theme."
          checked={settings.darkMode}
          onChange={(checked) => updateSettings({ darkMode: checked })}
        />
        <SettingToggle
          label="Notifications"
          description="Get nudges when new shared matches appear."
          checked={settings.notifications}
          onChange={(checked) => updateSettings({ notifications: checked })}
        />
        <SettingToggle
          label="Autoplay trailers"
          description="Prepare for richer media cards later on."
          checked={settings.autoplayTrailers}
          onChange={(checked) => updateSettings({ autoplayTrailers: checked })}
        />
        <SettingToggle
          label="Hide spoilers"
          description="Keep descriptions gentle and spoiler-light."
          checked={settings.hideSpoilers}
          onChange={(checked) => updateSettings({ hideSpoilers: checked })}
        />
        <SettingToggle
          label="Cellular sync"
          description="Sync watch progress even away from Wi-Fi."
          checked={settings.cellularSync}
          onChange={(checked) => updateSettings({ cellularSync: checked })}
        />
      </SurfaceCard>

      <SurfaceCard className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">Achievements</p>
          <p className="text-sm leading-6 text-slate-500">
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
                className="rounded-[24px] bg-slate-50 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {achievement.title}
                    </p>
                    <p className="text-xs leading-5 text-slate-500">
                      {achievement.description}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      completed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    {completed
                      ? "Unlocked"
                      : `${achievement.progress}/${achievement.target}`}
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${
                      completed
                        ? "bg-[linear-gradient(90deg,#10b981,#34d399)]"
                        : "bg-[linear-gradient(90deg,#7c3aed,#c084fc)]"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">About this build</p>
          <p className="text-sm leading-6 text-slate-500">
            The UI is fully runnable with mock data first, and the repo also ships
            with API routes plus a SQL schema for the next backend step.
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600"
        >
          Log out
        </button>
      </SurfaceCard>
    </div>
  );
}
