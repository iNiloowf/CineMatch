"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";

export default function ProfilePage() {
  const { currentUser, acceptedMovies, linkedUsers, sharedMovies, updateProfile } =
    useAppState();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  if (!currentUser) {
    return null;
  }

  const activeAvatarPreview = avatarPreview ?? currentUser.avatarImageUrl;

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await updateProfile({
      name: String(formData.get("name") ?? currentUser.name).trim() || currentUser.name,
      bio: String(formData.get("bio") ?? ""),
      city: String(formData.get("city") ?? ""),
      avatarImageUrl: currentUser.avatarImageUrl,
      avatarFile,
    });
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(undefined);
    setAvatarFile(null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="You"
        title="Profile"
        description="A quick snapshot of your taste, watch habits, and app shortcuts."
      />

      <SurfaceCard className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <AvatarBadge
              initials={currentUser.avatar}
              imageUrl={activeAvatarPreview}
              sizeClassName="h-16 w-16"
              textClassName="text-lg font-semibold"
            />
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {currentUser.name}
              </h2>
              <p className="text-sm text-slate-500">{currentUser.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsEditing((current) => {
                const next = !current;

                if (!next) {
                  if (avatarPreview?.startsWith("blob:")) {
                    URL.revokeObjectURL(avatarPreview);
                  }
                  setAvatarPreview(undefined);
                  setAvatarFile(null);
                }

                return next;
              });
            }}
            aria-label={isEditing ? "Close profile editor" : "Edit profile"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-700 shadow-sm hover:bg-violet-200"
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
        <div className="mt-4 rounded-[22px] bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            City
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {currentUser.city}
          </p>
          <p className="mt-5 text-sm leading-6 text-slate-500">
            {currentUser.bio}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-4">
          <div className="rounded-[22px] bg-slate-50 px-3 py-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">
              {acceptedMovies.length}
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Picks
            </p>
          </div>
          <div className="rounded-[22px] bg-slate-50 px-3 py-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">
              {linkedUsers.filter((user) => user.status === "accepted").length}
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Linked
            </p>
          </div>
          <div className="rounded-[22px] bg-slate-50 px-3 py-4 text-center">
            <p className="text-2xl font-semibold text-slate-900">
              {sharedMovies.filter((movie) => movie.watched).length}
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
              Watched
            </p>
          </div>
        </div>
      </SurfaceCard>

      {isEditing ? (
        <SurfaceCard className="expand-soft space-y-4">
          <p className="text-sm font-semibold text-slate-900">Edit profile</p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-[24px] bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-4">
                <AvatarBadge
                  initials={currentUser.avatar}
                  imageUrl={activeAvatarPreview}
                  sizeClassName="h-20 w-20"
                  textClassName="text-xl font-semibold"
                />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Profile photo
                  </p>
                  <label className="inline-flex cursor-pointer rounded-[18px] bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
                    Choose photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
            <label className="block space-y-3 text-sm font-medium text-slate-700">
              Username
              <input
                name="name"
                defaultValue={currentUser.name}
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white"
              />
            </label>
            <label className="block space-y-3 text-sm font-medium text-slate-700">
              City
              <input
                name="city"
                defaultValue={currentUser.city}
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white"
              />
            </label>
            <label className="block space-y-3 text-sm font-medium text-slate-700">
              Bio
              <textarea
                name="bio"
                defaultValue={currentUser.bio}
                rows={4}
                className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:bg-white"
              />
            </label>
            <button
              type="submit"
              className="ui-btn ui-btn-primary w-full"
            >
              Save profile
            </button>
          </form>
        </SurfaceCard>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/linked"
          className="flex items-center justify-center rounded-[24px] border border-white/70 bg-white/85 px-4 py-4 text-center text-sm font-semibold text-slate-800 shadow-[0_18px_50px_rgba(116,82,186,0.12)]"
        >
          Friends
        </Link>
        <Link
          href="/connect"
          className="flex items-center justify-center rounded-[24px] border border-white/70 bg-white/85 px-4 py-4 text-center text-sm font-semibold text-slate-800 shadow-[0_18px_50px_rgba(116,82,186,0.12)]"
        >
          Connect
        </Link>
        <Link
          href="/settings"
          className="flex items-center justify-center rounded-[24px] border border-white/70 bg-white/85 px-4 py-4 text-center text-sm font-semibold text-slate-800 shadow-[0_18px_50px_rgba(116,82,186,0.12)]"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
