"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NetworkStatusBlock } from "@/components/network-status-block";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import { MAX_LINKED_FRIENDS, parseInviteTokenFromPaste } from "@/lib/invite-link-utils";

function ConnectBackdrop({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={`auth-landing-blob -left-20 top-[-14%] h-[min(48vw,20rem)] w-[min(48vw,20rem)] ${
          isDarkMode
            ? "bg-[radial-gradient(circle_at_30%_30%,rgba(139,92,246,0.42),transparent_62%)]"
            : "bg-[radial-gradient(circle_at_30%_30%,rgba(167,139,250,0.38),transparent_62%)]"
        }`}
      />
      <div
        className={`auth-landing-blob auth-landing-blob--b right-[-18%] bottom-[-8%] h-[min(55vw,24rem)] w-[min(55vw,24rem)] ${
          isDarkMode
            ? "bg-[radial-gradient(circle_at_40%_40%,rgba(52,211,153,0.22),transparent_58%)]"
            : "bg-[radial-gradient(circle_at_40%_40%,rgba(52,211,153,0.28),transparent_58%)]"
        }`}
      />
    </div>
  );
}

export default function ConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [manualInviteValue, setManualInviteValue] = useState("");
  const [manualInviteToken, setManualInviteToken] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [createInviteBusy, setCreateInviteBusy] = useState(false);
  const [actionError, setActionError] = useState<{
    message: string;
    retry?: () => void;
  } | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");
  const {
    data,
    createInviteLink,
    acceptInviteToken,
    linkedUsers,
    isDarkMode,
  } = useAppState();

  const shellBg = isDarkMode
    ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#161022_42%,#0c0a12_100%)]"
    : "bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_52%,#eef2ff_100%)]";

  const linkCount = linkedUsers.length;
  const atFriendLimit = linkCount >= MAX_LINKED_FRIENDS;

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

  const connectFromToken = async (token: string, _inviterDisplayName = "") => {
    setInviteBusy(true);
    setActionError(null);
    try {
      const result = await acceptInviteToken(token);
      setStatusMessage(result.message);

      if (result.ok) {
        setManualInviteValue("");
        setManualInviteToken("");
        router.replace("/linked");
        return;
      }

      setActionError({
        message: result.message,
        retry: () => void connectFromToken(token, _inviterDisplayName),
      });
    } catch {
      const message = "We couldn’t reach the server. Check your connection.";
      setStatusMessage(message);
      setActionError({
        message,
        retry: () => void connectFromToken(token, _inviterDisplayName),
      });
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <div className={`auth-landing-stage relative min-h-full ${shellBg}`}>
      <ConnectBackdrop isDarkMode={isDarkMode} />
      <div className="relative z-[1] space-y-5 pb-4">
        <PageHeader
          eyebrow="Connect"
          title="Add a friend"
          description={`Paste an invite link or create one to share. You can link up to ${MAX_LINKED_FRIENDS} friends.`}
        />

        <div className="flex flex-wrap gap-2">
          <Link
            href="/linked"
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              isDarkMode
                ? "bg-white/10 text-slate-200 ring-1 ring-white/12 hover:bg-white/14"
                : "bg-white/80 text-slate-700 shadow-sm ring-1 ring-slate-200/80 hover:bg-white"
            }`}
          >
            ← Friends list
          </Link>
          {atFriendLimit ? (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                isDarkMode
                  ? "bg-amber-500/18 text-amber-100 ring-1 ring-amber-400/25"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {MAX_LINKED_FRIENDS} / {MAX_LINKED_FRIENDS} friends linked
            </span>
          ) : (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                isDarkMode
                  ? "bg-emerald-500/16 text-emerald-100 ring-1 ring-emerald-400/22"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {linkCount} / {MAX_LINKED_FRIENDS} friends
            </span>
          )}
        </div>

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
          <SurfaceCard className="discover-toolbar-enter space-y-4 !p-6">
            <div className="space-y-1">
              <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                Invite link
              </p>
              <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                {inviteOwner
                  ? `${inviteOwner.name} invited you to connect accounts.`
                  : "This invite is ready to be used if it is still valid."}
              </p>
            </div>
            <button
              type="button"
              disabled={inviteBusy || atFriendLimit}
              onClick={async () => await connectFromToken(inviteToken, inviteOwner?.name ?? "")}
              className={`w-full rounded-[22px] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(109,40,217,0.28)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65 ${
                isDarkMode
                  ? "bg-gradient-to-br from-violet-500 to-fuchsia-700"
                  : "bg-gradient-to-br from-violet-600 to-violet-700"
              }`}
            >
              {inviteBusy
                ? "Connecting…"
                : atFriendLimit
                  ? "Friend limit reached"
                  : "Connect with this link"}
            </button>
            {atFriendLimit ? (
              <p className={`text-xs ${isDarkMode ? "text-amber-200/90" : "text-amber-800"}`}>
                You already have {MAX_LINKED_FRIENDS} friends linked. Remove one from Friends before
                accepting another invite.
              </p>
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
        ) : null}

        <SurfaceCard className="discover-toolbar-enter space-y-4 !p-6 sm:!p-7">
          <div className="space-y-1">
            <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
              Paste a link
            </p>
            <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
              Paste the full connect link, then confirm. Links use the{" "}
              <span className="font-mono text-[0.8rem]">/connect?invite=</span> format.
            </p>
          </div>
          <div className="space-y-3">
            <textarea
              value={manualInviteValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                setManualInviteValue(nextValue);
                setManualInviteToken(parseInviteTokenFromPaste(nextValue));
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
              disabled={inviteBusy || atFriendLimit}
              onClick={async () => {
                const token = parseInviteTokenFromPaste(manualInviteValue);

                if (!token) {
                  setStatusMessage("Paste a valid invite link first.");
                  return;
                }

                await connectFromToken(token, manualInviteOwner?.name ?? "");
              }}
              className={`w-full rounded-[22px] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(109,40,217,0.28)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${
                isDarkMode
                  ? "bg-gradient-to-br from-violet-500 to-fuchsia-700"
                  : "bg-gradient-to-br from-violet-600 to-violet-700"
              }`}
            >
              {inviteBusy
                ? "Connecting…"
                : atFriendLimit
                  ? "Friend limit reached"
                  : manualInviteOwner
                    ? `Connect with ${manualInviteOwner.name}`
                    : "Connect"}
            </button>
            {atFriendLimit ? (
              <p className={`text-xs ${isDarkMode ? "text-amber-200/90" : "text-amber-800"}`}>
                Remove a friend from the Friends list before adding another link.
              </p>
            ) : null}
          </div>
        </SurfaceCard>

        <SurfaceCard className="discover-toolbar-enter space-y-4 !p-6 sm:!p-7">
          <div className="space-y-1">
            <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
              Share a connect link
            </p>
            <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
              Create an invite and send it from any app. The other person opens it here on Connect.
            </p>
          </div>
          <button
            type="button"
            disabled={createInviteBusy || atFriendLimit}
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
            className={`w-full rounded-[22px] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(109,40,217,0.28)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${
              isDarkMode
                ? "bg-gradient-to-br from-violet-500 to-fuchsia-700"
                : "bg-gradient-to-br from-violet-600 to-violet-700"
            }`}
          >
            {createInviteBusy
              ? "Creating link…"
              : atFriendLimit
                ? "Friend limit reached"
                : "Create special link"}
          </button>
          {inviteUrl ? (
            <div
              className={`rounded-[22px] px-4 py-4 ${
                isDarkMode ? "border border-white/12 bg-white/10" : "border border-slate-200/90 bg-slate-50"
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
          {statusMessage && !inviteToken ? (
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
    </div>
  );
}
