"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AvatarBadge } from "@/components/avatar-badge";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";

export default function LinkedPeoplePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [inviteUrl, setInviteUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const { data, createInviteLink, acceptInviteToken, linkedUsers, isSyncingAccountData } =
    useAppState();

  const inviteOwner = useMemo(() => {
    if (!inviteToken) {
      return null;
    }

    const invite = data.invites.find((entry) => entry.token === inviteToken);

    if (!invite) {
      return null;
    }

    return data.users.find((user) => user.id === invite.inviterId) ?? null;
  }, [data.invites, data.users, inviteToken]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="People"
        title="Linked People"
        description="Connect accounts so CineMatch can surface the movies both of you accepted."
      />

      {inviteToken ? (
        <SurfaceCard className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">Invite link</p>
            <p className="text-sm leading-6 text-slate-500">
              {inviteOwner
                ? `${inviteOwner.name} invited you to connect accounts.`
                : "This invite is ready to be used if it is still valid."}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              const result = await acceptInviteToken(inviteToken);
              setStatusMessage(result.message);

              if (result.ok) {
                router.replace("/linked");
              }
            }}
            className="w-full rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Connect with this link
          </button>
          {statusMessage ? (
            <p className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {statusMessage}
            </p>
          ) : null}
        </SurfaceCard>
      ) : null}

      <div className="space-y-3">
        {isSyncingAccountData ? (
          <SurfaceCard className="space-y-2 text-center">
            <p className="text-lg font-semibold text-slate-900">
              Loading your connections
            </p>
            <p className="text-sm leading-6 text-slate-500">
              Bringing in your latest linked people and shared matches.
            </p>
          </SurfaceCard>
        ) : null}

        {linkedUsers.map((linked) => (
          <SurfaceCard key={linked.user.id} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AvatarBadge
                  initials={linked.user.avatar}
                  imageUrl={linked.user.avatarImageUrl}
                />
                <div>
                  <p className="font-semibold text-slate-900">{linked.user.name}</p>
                  <p className="text-sm text-slate-500">{linked.user.city}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  linked.status === "accepted"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {linked.status === "accepted" ? "Linked" : "Pending"}
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-500">{linked.user.bio}</p>
            <div className="rounded-[20px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {linked.sharedCount > 0
                ? `${linked.sharedCount} shared accepted movie${linked.sharedCount === 1 ? "" : "s"}`
                : "No shared picks yet. Keep swiping."}
            </div>
          </SurfaceCard>
        ))}

        {!isSyncingAccountData && linkedUsers.length === 0 ? (
          <SurfaceCard className="space-y-2 text-center">
            <p className="text-lg font-semibold text-slate-900">
              No linked people yet
            </p>
            <p className="text-sm leading-6 text-slate-500">
              Create a special link below and open it from another account to connect.
            </p>
          </SurfaceCard>
        ) : null}
      </div>

      <SurfaceCard className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">Share a connect link</p>
          <p className="text-sm leading-6 text-slate-500">
            Create a special invite link and send it to another person so they can connect from their account.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            const nextInviteUrl = await createInviteLink();

            if (!nextInviteUrl) {
              setStatusMessage("We couldn’t create an invite right now.");
              return;
            }

            setInviteUrl(nextInviteUrl);
            setStatusMessage("Invite link created.");

            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(nextInviteUrl);
              setStatusMessage("Invite link copied. Send it to the other person.");
            }
          }}
          className="w-full rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
        >
          Create special link
        </button>
        {inviteUrl ? (
          <div className="rounded-[22px] bg-slate-50 px-4 py-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Share this link
            </p>
            <p className="break-all text-sm leading-6 text-slate-600">{inviteUrl}</p>
          </div>
        ) : null}
        {statusMessage ? (
          <p className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {statusMessage}
          </p>
        ) : null}
      </SurfaceCard>
    </div>
  );
}
