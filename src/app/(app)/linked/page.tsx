"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AvatarBadge } from "@/components/avatar-badge";
import { NetworkStatusBlock } from "@/components/network-status-block";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import { useEscapeToClose } from "@/lib/use-escape-to-close";

export default function LinkedPeoplePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [inviteUrl, setInviteUrl] = useState("");
  const [manualInviteValue, setManualInviteValue] = useState("");
  const [manualInviteToken, setManualInviteToken] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [createInviteBusy, setCreateInviteBusy] = useState(false);
  const [actionError, setActionError] = useState<{
    message: string;
    retry?: () => void;
  } | null>(null);
  const [connectedPartnerName, setConnectedPartnerName] = useState("");
  const [removedPartnerName, setRemovedPartnerName] = useState("");
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
    unlinkUser,
    isDarkMode,
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
      setRemovedPartnerName("");
      setStatusMessage("");
    }

    const removedLinkedId = acceptedLinkedIdsRef.current.find(
      (linkedId) => !acceptedIds.includes(linkedId),
    );

    if (removedLinkedId) {
      const removedName =
        acceptedLinkedNamesRef.current[removedLinkedId] ?? "this person";
      setConnectedPartnerName("");
      setRemovedPartnerName(removedName);
      setStatusMessage("");
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
    setInviteBusy(true);
    setActionError(null);
    try {
      const result = await acceptInviteToken(token);
      setStatusMessage(result.message);

      if (result.ok) {
        setManualInviteValue("");
        setManualInviteToken("");
        setConnectedPartnerName(result.partnerName ?? fallbackName);
        router.replace("/linked");
        return;
      }

      setActionError({
        message: result.message,
        retry: () => void connectFromToken(token, fallbackName),
      });
    } catch {
      const message = "We couldn’t reach the server. Check your connection.";
      setStatusMessage(message);
      setActionError({
        message,
        retry: () => void connectFromToken(token, fallbackName),
      });
    } finally {
      setInviteBusy(false);
    }
  };

  useEscapeToClose(Boolean(pendingRemove), () => setPendingRemove(null));

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
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/32 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setPendingRemove(null)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 overflow-hidden rounded-[30px] border shadow-[0_24px_70px_rgba(15,23,42,0.18)] ${
              isDarkMode
                ? "border-white/14 bg-slate-950 text-slate-100"
                : "border-white/70 bg-white"
            }`}
          >
            <div
              className={`ui-shell-header ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-200"}`}
            >
              <p className="min-w-0 flex-1 text-lg font-semibold text-inherit">
                Remove linked person?
              </p>
              <button
                type="button"
                onClick={() => setPendingRemove(null)}
                aria-label="Close"
                className={`ui-shell-close ${
                  isDarkMode ? "bg-white/12 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
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
              </button>
            </div>
            <div className="ui-shell-body !pt-4">
              <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                Do you want to remove the link with {pendingRemove.name}?
              </p>
            </div>
            <div className="ui-shell-footer !pt-4">
              <button
                type="button"
                onClick={() => setPendingRemove(null)}
                className="ui-btn ui-btn-secondary min-w-0 flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const result = await unlinkUser(pendingRemove.id);
                  if (result.ok) {
                    setRemovedPartnerName(pendingRemove.name);
                    setStatusMessage("");
                  } else {
                    setStatusMessage(result.message);
                  }
                  setPendingRemove(null);
                }}
                className="ui-btn ui-btn-danger min-w-0 flex-1"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {connectedPartnerName ? (
        <div className="fixed inset-x-4 top-6 z-[var(--z-banner)] mx-auto max-w-md">
          <div
            className={`achievement-toast-pop rounded-[28px] border px-5 py-5 shadow-[0_24px_70px_rgba(124,58,237,0.22)] ${
              isDarkMode
                ? "border-violet-400/25 bg-slate-950/94 text-slate-100"
                : "border-violet-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-500">
                  Connected
                </p>
                <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                  You are connected now.
                </p>
                <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                  Your shared matches will start showing up here as you both accept the same movies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConnectedPartnerName("")}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  isDarkMode ? "bg-white/12 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {removedPartnerName ? (
        <div className="fixed inset-x-4 top-6 z-[var(--z-banner)] mx-auto max-w-md">
          <div
            className={`achievement-toast-pop rounded-[28px] border px-5 py-5 shadow-[0_24px_70px_rgba(244,63,94,0.14)] ${
              isDarkMode
                ? "border-rose-400/30 bg-slate-950/94 text-slate-100"
                : "border-rose-200 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">
                  Removed
                </p>
                <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                  Your connection with {removedPartnerName} was removed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRemovedPartnerName("")}
                className={`rounded-full px-3 py-2 text-xs font-semibold ${
                  isDarkMode ? "bg-white/12 text-slate-200" : "bg-slate-100 text-slate-600"
                }`}
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

      {actionError ? (
        <NetworkStatusBlock
          variant="error"
          isDarkMode={isDarkMode}
          title="Something went wrong"
          description={actionError.message}
          onRetry={actionError.retry}
        />
      ) : null}

      {inviteToken ? (
        <SurfaceCard className="space-y-4">
          <div className="space-y-1">
            <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>Invite link</p>
            <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
              {inviteOwner
                ? `${inviteOwner.name} invited you to connect accounts.`
                : "This invite is ready to be used if it is still valid."}
            </p>
          </div>
          <button
            type="button"
            disabled={inviteBusy}
            onClick={async () =>
              await connectFromToken(inviteToken, inviteOwner?.name ?? "")
            }
            className="w-full rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {inviteBusy ? "Connecting…" : "Connect with this link"}
          </button>
          {statusMessage ? (
            <p
              className={`rounded-[18px] px-4 py-3 text-sm ${
                isDarkMode
                  ? "border border-white/12 bg-white/10 text-slate-200"
                  : "bg-slate-50 text-slate-600"
              }`}
            >
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
                  <p className={`font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>{linked.user.name}</p>
                  <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                    {linked.user.city}
                  </p>
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
            <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>{linked.user.bio}</p>
            <div
              className={`rounded-[20px] px-4 py-3 text-sm ${
                isDarkMode
                  ? "border border-white/12 bg-white/10 text-slate-200"
                  : "bg-slate-50 text-slate-600"
              }`}
            >
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

        {linkedUsers.length === 0 ? (
          <SurfaceCard className="space-y-2 text-center">
            <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
              No linked people yet
            </p>
            <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
              Create a special link below and open it from another account to connect.
            </p>
          </SurfaceCard>
        ) : null}
      </div>

      <SurfaceCard className="space-y-4">
        <div className="space-y-1">
          <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>Paste a link</p>
          <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
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
            className={`w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition focus:border-violet-400 ${
              isDarkMode
                ? "border-white/16 bg-white/10 text-slate-100 placeholder:text-slate-400 focus:bg-white/14"
                : "border-slate-200 bg-slate-50 focus:bg-white"
            }`}
          />
          {manualInviteOwner ? (
            <p
              className={`rounded-[18px] px-4 py-3 text-sm ${
                isDarkMode
                  ? "border border-white/12 bg-white/10 text-slate-200"
                  : "bg-slate-50 text-slate-600"
              }`}
            >
              This link belongs to{" "}
              <span className={`font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                {manualInviteOwner.name}
              </span>
              .
            </p>
          ) : null}
          <button
            type="button"
            disabled={inviteBusy}
            onClick={async () => {
              const token = parseInviteToken(manualInviteValue);

              if (!token) {
                setStatusMessage("Paste a valid invite link first.");
                return;
              }

              await connectFromToken(token, manualInviteOwner?.name ?? "");
            }}
            className="w-full rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {inviteBusy
              ? "Connecting…"
              : manualInviteOwner
                ? `Connect with ${manualInviteOwner.name}`
                : "Connect"}
          </button>
        </div>
      </SurfaceCard>

      <SurfaceCard className="space-y-4">
        <div className="space-y-1">
          <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>Share a connect link</p>
          <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
            Create a special invite link and send it to another person so they can connect from their account.
          </p>
        </div>
        <button
          type="button"
          disabled={createInviteBusy}
          onClick={async () => {
            const runCreate = async () => {
              setCreateInviteBusy(true);
              setActionError(null);
              try {
                const result = await createInviteLink();

                if (!result.ok) {
                  setStatusMessage(result.message);
                  setActionError({
                    message: result.message,
                    retry: () => void runCreate(),
                  });
                  return;
                }

                setInviteUrl(result.url);
                setStatusMessage("Invite link created.");

                if (navigator.clipboard?.writeText) {
                  await navigator.clipboard.writeText(result.url);
                  setStatusMessage("Invite link copied. Send it to the other person.");
                }
              } catch {
                const message = "Couldn’t create the invite link. Check your connection.";
                setStatusMessage(message);
                setActionError({
                  message,
                  retry: () => void runCreate(),
                });
              } finally {
                setCreateInviteBusy(false);
              }
            };

            await runCreate();
          }}
          className="w-full rounded-[20px] bg-violet-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {createInviteBusy ? "Creating link…" : "Create special link"}
        </button>
        {inviteUrl ? (
          <div
            className={`rounded-[22px] px-4 py-4 ${
              isDarkMode ? "border border-white/12 bg-white/10" : "bg-slate-50"
            }`}
          >
            <p
              className={`mb-2 text-xs font-semibold uppercase tracking-[0.22em] ${
                isDarkMode ? "text-slate-300" : "text-slate-400"
              }`}
            >
              Share this link
            </p>
            <p className={`break-all text-sm leading-6 ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}>
              {inviteUrl}
            </p>
          </div>
        ) : null}
        {statusMessage ? (
          <p
            className={`rounded-[18px] px-4 py-3 text-sm ${
              isDarkMode
                ? "border border-white/12 bg-white/10 text-slate-200"
                : "bg-slate-50 text-slate-600"
            }`}
          >
            {statusMessage}
          </p>
        ) : null}
      </SurfaceCard>
    </div>
  );
}
