"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [manualInviteValue, setManualInviteValue] = useState("");
  const [manualInviteToken, setManualInviteToken] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [connectedPartnerName, setConnectedPartnerName] = useState("");
  const [pendingRemove, setPendingRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const acceptedLinkedIdsRef = useRef<string[]>([]);
  const acceptedLinkedNamesRef = useRef<Record<string, string>>({});
  const hasBootstrappedAcceptedLinks = useRef(false);
  const {
    data,
    createInviteLink,
    acceptInviteToken,
    linkedUsers,
    isSyncingAccountData,
    unlinkUser,
  } = useAppState();

  useEffect(() => {
    const acceptedLinkedUsers = linkedUsers.filter(
      (linked) => linked.status === "accepted",
    );
    const acceptedIds = acceptedLinkedUsers.map((linked) => linked.user.id);
    const acceptedNames = Object.fromEntries(
      acceptedLinkedUsers.map((linked) => [linked.user.id, linked.user.name]),
    );

    if (!hasBootstrappedAcceptedLinks.current) {
      acceptedLinkedIdsRef.current = acceptedIds;
      acceptedLinkedNamesRef.current = acceptedNames;
      hasBootstrappedAcceptedLinks.current = true;
      return;
    }

    const newLinkedUser = acceptedLinkedUsers.find(
      (linked) => !acceptedLinkedIdsRef.current.includes(linked.user.id),
    );

    if (newLinkedUser) {
      setConnectedPartnerName(newLinkedUser.user.name);
      setStatusMessage("");
    }

    const removedLinkedId = acceptedLinkedIdsRef.current.find(
      (linkedId) => !acceptedIds.includes(linkedId),
    );

    if (removedLinkedId) {
      const removedName =
        acceptedLinkedNamesRef.current[removedLinkedId] ?? "this person";
      setConnectedPartnerName("");
      setStatusMessage(`Your connection with ${removedName} was removed.`);
    }

    acceptedLinkedIdsRef.current = acceptedIds;
    acceptedLinkedNamesRef.current = acceptedNames;
  }, [linkedUsers]);

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

  const manualInviteOwner = useMemo(() => {
    if (!manualInviteToken) {
      return null;
    }

    const invite = data.invites.find((entry) => entry.token === manualInviteToken);

    if (!invite) {
      return null;
    }

    return data.users.find((user) => user.id === invite.inviterId) ?? null;
  }, [data.invites, data.users, manualInviteToken]);

  const connectFromToken = async (token: string, fallbackName = "") => {
    const result = await acceptInviteToken(token);
    setStatusMessage(result.message);

    if (result.ok) {
      setManualInviteValue("");
      setManualInviteToken("");
      setConnectedPartnerName(result.partnerName ?? fallbackName);
      router.replace("/linked");
    }
  };

  const parseInviteToken = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return "";
    }

    if (!trimmed.includes("http")) {
      return trimmed;
    }

    try {
      const url = new URL(trimmed);
      return url.searchParams.get("invite") ?? "";
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-4">
      {pendingRemove ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/28 px-4 pb-8 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] border border-white/70 bg-white px-5 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="space-y-2">
              <p className="text-lg font-semibold text-slate-900">
                Remove linked person?
              </p>
              <p className="text-sm leading-6 text-slate-500">
                Do you want to remove the link with {pendingRemove.name}?
              </p>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingRemove(null)}
                className="flex-1 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const result = await unlinkUser(pendingRemove.id);
                  setStatusMessage(result.message);
                  setPendingRemove(null);
                }}
                className="flex-1 rounded-[18px] bg-rose-500 px-4 py-3 text-sm font-semibold text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {connectedPartnerName ? (
        <div className="fixed inset-x-4 top-6 z-50 mx-auto max-w-md">
          <div className="achievement-toast-pop rounded-[28px] border border-violet-200 bg-white px-5 py-5 shadow-[0_24px_70px_rgba(124,58,237,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                  Connected
                </p>
                <p className="text-lg font-semibold text-slate-900">
                  You and {connectedPartnerName} are connected now.
                </p>
                <p className="text-sm leading-6 text-slate-500">
                  Your shared matches will start showing up here as you both accept the same movies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConnectedPartnerName("")}
                className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
            onClick={async () =>
              await connectFromToken(inviteToken, inviteOwner?.name ?? "")
            }
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
            {linked.status === "accepted" ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setPendingRemove({
                      id: linked.user.id,
                      name: linked.user.name,
                    })
                  }
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600"
                >
                  Remove
                </button>
              </div>
            ) : null}
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
          <p className="text-sm font-semibold text-slate-900">Paste a link</p>
          <p className="text-sm leading-6 text-slate-500">
            Paste the full connect link here, then tap connect.
          </p>
        </div>
        <div className="space-y-3">
          <textarea
            value={manualInviteValue}
            onChange={(event) => {
              const nextValue = event.target.value;
              setManualInviteValue(nextValue);
              setManualInviteToken(parseInviteToken(nextValue));
            }}
            rows={3}
            placeholder="Paste the invite link here"
            className="w-full rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
          />
          {manualInviteOwner ? (
            <p className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-600">
              This link belongs to <span className="font-semibold text-slate-900">{manualInviteOwner.name}</span>.
            </p>
          ) : null}
          <button
            type="button"
            onClick={async () => {
              const token = parseInviteToken(manualInviteValue);

              if (!token) {
                setStatusMessage("Paste a valid invite link first.");
                return;
              }

              await connectFromToken(token, manualInviteOwner?.name ?? "");
            }}
            className="w-full rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white"
          >
            {manualInviteOwner ? `Connect with ${manualInviteOwner.name}` : "Connect"}
          </button>
        </div>
      </SurfaceCard>

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
            const result = await createInviteLink();

            if (!result.ok) {
              setStatusMessage(result.message);
              return;
            }

            setInviteUrl(result.url);
            setStatusMessage("Invite link created.");

            if (navigator.clipboard?.writeText) {
              await navigator.clipboard.writeText(result.url);
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
