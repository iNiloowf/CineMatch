"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NetworkStatusBlock } from "@/components/network-status-block";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import {
  MAX_LINKED_FRIENDS,
  parseInviteTokenFromPaste,
  shareOrCopyInviteMessage,
} from "@/lib/invite-link-utils";

function ConnectBackdrop({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={`auth-landing-blob -left-20 top-[-14%] h-[min(48vw,20rem)] w-[min(48vw,20rem)] ${
          isDarkMode
            ? "bg-[radial-gradient(circle_at_30%_30%,rgba(139,92,246,0.42),transparent_62%)]"
            : "bg-[radial-gradient(circle_at_30%_30%,rgba(167,139,250,0.2),transparent_62%)]"
        }`}
      />
      <div
        className={`auth-landing-blob auth-landing-blob--b right-[-18%] bottom-[-8%] h-[min(55vw,24rem)] w-[min(55vw,24rem)] ${
          isDarkMode
            ? "bg-[radial-gradient(circle_at_40%_40%,rgba(52,211,153,0.22),transparent_58%)]"
            : "bg-[radial-gradient(circle_at_40%_40%,rgba(52,211,153,0.16),transparent_58%)]"
        }`}
      />
    </div>
  );
}

function StepMini({
  step,
  title,
  body,
  isDarkMode,
  delayMs,
}: {
  step: number;
  title: string;
  body: string;
  isDarkMode: boolean;
  delayMs: number;
}) {
  return (
    <div
      className={`discover-toolbar-enter flex gap-3 rounded-[18px] border px-3 py-3 sm:flex-col sm:items-start sm:px-3.5 sm:py-3.5 ${
        isDarkMode ? "border-white/12 bg-white/[0.06]" : "border-slate-200/90 bg-white/90 shadow-sm"
      }`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isDarkMode ? "bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/30" : "bg-violet-100 text-violet-800"
        }`}
      >
        {step}
      </span>
      <div className="min-w-0">
        <p className={`text-xs font-bold leading-tight ${isDarkMode ? "text-white" : "text-slate-900"}`}>{title}</p>
        <p className={`mt-1 text-[11px] leading-snug ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{body}</p>
      </div>
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
  const { data, createInviteLink, acceptInviteToken, linkedUsers, isDarkMode, currentUser } =
    useAppState();

  const shellBg = isDarkMode
    ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#161022_42%,#0c0a12_100%)]"
    : "bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_70%,#f1f5f9_100%)]";

  const linkCount = linkedUsers.length;
  const atFriendLimit = linkCount >= MAX_LINKED_FRIENDS;

  const eyebrow = isDarkMode
    ? "text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/90"
    : "text-[10px] font-bold uppercase tracking-[0.2em] text-violet-600/90";

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

  const copyInviteUrl = async () => {
    if (!inviteUrl) {
      return;
    }
    const out = await shareOrCopyInviteMessage(inviteUrl, currentUser?.name);
    if (out.message) {
      setStatusMessage(out.message);
    }
  };

  return (
    <div className={`auth-landing-stage relative min-h-full ${shellBg}`}>
      <ConnectBackdrop isDarkMode={isDarkMode} />
      <div className="relative z-[1] space-y-5 pb-8">
        <div className="fade-up-enter">
          <PageHeader
            eyebrow="Connect"
            title="Add a friend"
            description={`Share an invite or paste one you received. You can link up to ${MAX_LINKED_FRIENDS} friends — then matches show up on Shared.`}
          />
        </div>

        <div className="fade-up-enter flex flex-wrap items-center gap-2" style={{ animationDelay: "45ms" }}>
          <Link
            href="/linked"
            className={`inline-flex min-h-10 items-center rounded-full px-4 py-2 text-xs font-semibold transition active:scale-[0.98] ${
              isDarkMode
                ? "bg-white/10 text-slate-100 ring-1 ring-white/14 hover:bg-white/16"
                : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200/90 hover:bg-slate-50"
            }`}
          >
            View friends list
          </Link>
          {atFriendLimit ? (
            <span
              className={`inline-flex min-h-10 items-center rounded-full px-3 py-2 text-xs font-semibold ${
                isDarkMode
                  ? "bg-amber-500/18 text-amber-100 ring-1 ring-amber-400/25"
                  : "bg-amber-100 text-amber-900 ring-1 ring-amber-200/80"
              }`}
            >
              {MAX_LINKED_FRIENDS} / {MAX_LINKED_FRIENDS} slots used
            </span>
          ) : (
            <span
              className={`inline-flex min-h-10 items-center rounded-full px-3 py-2 text-xs font-semibold ${
                isDarkMode
                  ? "bg-emerald-500/16 text-emerald-100 ring-1 ring-emerald-400/22"
                  : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
              }`}
            >
              {linkCount} / {MAX_LINKED_FRIENDS} friends linked
            </span>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          <StepMini
            step={1}
            title="Create or receive"
            body="You create a link here, or someone sends you theirs."
            isDarkMode={isDarkMode}
            delayMs={70}
          />
          <StepMini
            step={2}
            title="Open on Connect"
            body="The invite opens this page so both accounts can link."
            isDarkMode={isDarkMode}
            delayMs={115}
          />
          <StepMini
            step={3}
            title="Match together"
            body="After linking, shared picks appear on Shared & Friends."
            isDarkMode={isDarkMode}
            delayMs={160}
          />
        </div>

        {actionError ? (
          <div className="fade-up-enter" style={{ animationDelay: "90ms" }}>
            <NetworkStatusBlock
              variant="error"
              isDarkMode={isDarkMode}
              title="Couldn’t complete that action"
              description={actionError.message}
              onRetry={actionError.retry}
            />
          </div>
        ) : null}

        {inviteToken ? (
          <SurfaceCard className="fade-up-enter space-y-4 !p-6 sm:!p-7" style={{ animationDelay: "100ms" }}>
            <div className="space-y-1">
              <p className={eyebrow}>Invite opened</p>
              <p className={`text-base font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                You have an active invite
              </p>
              <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {inviteOwner
                  ? `${inviteOwner.name} invited you to connect your CineMatch accounts.`
                  : "This invite is ready to use if it is still valid."}
              </p>
            </div>
            <button
              type="button"
              disabled={inviteBusy || atFriendLimit}
              onClick={async () => await connectFromToken(inviteToken, inviteOwner?.name ?? "")}
              className="auth-primary-glow ui-btn ui-btn-primary w-full min-h-12 px-4 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {inviteBusy
                ? "Connecting…"
                : atFriendLimit
                  ? "Friend limit reached"
                  : inviteOwner
                    ? `Connect with ${inviteOwner.name}`
                    : "Accept & connect"}
            </button>
            {atFriendLimit ? (
              <p className={`text-xs leading-relaxed ${isDarkMode ? "text-amber-200/90" : "text-amber-800"}`}>
                You already have {MAX_LINKED_FRIENDS} friends linked. Remove one from Friends before accepting
                another invite.
              </p>
            ) : null}
            {statusMessage ? (
              <p
                className={`rounded-[18px] px-4 py-3 text-sm ${
                  isDarkMode
                    ? "border border-white/12 bg-white/10 text-slate-200"
                    : "border border-slate-200/80 bg-slate-50 text-slate-600"
                }`}
              >
                {statusMessage}
              </p>
            ) : null}
          </SurfaceCard>
        ) : null}

        <SurfaceCard className="fade-up-enter space-y-4 !p-6 sm:!p-7" style={{ animationDelay: inviteToken ? "140ms" : "100ms" }}>
          <div className="space-y-1">
            <p className={eyebrow}>Have a link?</p>
            <p className={`text-base font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>Paste an invite</p>
            <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Drop the full URL here. Valid links include{" "}
              <code className={`rounded px-1 py-0.5 text-[11px] font-mono ${isDarkMode ? "bg-white/10" : "bg-slate-100"}`}>
                /connect?invite=
              </code>{" "}
              followed by a token.
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
              rows={4}
              placeholder="https://…/connect?invite=…"
              className={`w-full rounded-[20px] border px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/25 ${
                isDarkMode
                  ? "border-white/16 bg-white/10 text-slate-100 placeholder:text-slate-500 focus:bg-white/14"
                  : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:bg-white"
              }`}
            />
            {manualInviteOwner ? (
              <div
                className={`discover-toolbar-enter flex items-start gap-3 rounded-[18px] border px-4 py-3 ${
                  isDarkMode ? "border-emerald-400/25 bg-emerald-500/10" : "border-emerald-200/90 bg-emerald-50/90"
                }`}
              >
                <span className="text-lg" aria-hidden>
                  ✓
                </span>
                <p className={`text-sm leading-relaxed ${isDarkMode ? "text-emerald-100" : "text-emerald-900"}`}>
                  Recognized invite from{" "}
                  <span className="font-semibold">{manualInviteOwner.name}</span>. Tap connect below to finish.
                </p>
              </div>
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
              className="auth-primary-glow ui-btn ui-btn-primary w-full min-h-12 px-4 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {inviteBusy
                ? "Connecting…"
                : atFriendLimit
                  ? "Friend limit reached"
                  : manualInviteOwner
                    ? `Connect with ${manualInviteOwner.name}`
                    : "Connect from pasted link"}
            </button>
            {atFriendLimit ? (
              <p className={`text-xs leading-relaxed ${isDarkMode ? "text-amber-200/90" : "text-amber-800"}`}>
                Remove a friend from the Friends list before adding another link.
              </p>
            ) : null}
          </div>
        </SurfaceCard>

        <SurfaceCard className="fade-up-enter space-y-4 !p-6 sm:!p-7" style={{ animationDelay: inviteToken ? "180ms" : "140ms" }}>
          <div className="space-y-1">
            <p className={eyebrow}>Inviting someone?</p>
            <p className={`text-base font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
              Create a shareable link
            </p>
            <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              We will copy the new link when it is ready. Send it in Messages, email, or anywhere else — they open it
              here on Connect.
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
                  const shared = await shareOrCopyInviteMessage(result.url, currentUser?.name);
                  if (shared.message) {
                    setStatusMessage(
                      shared.ok
                        ? shared.message
                        : shared.message || "Invite link created — copy it from below.",
                    );
                  } else {
                    setStatusMessage("Invite link created.");
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
            className="auth-primary-glow ui-btn ui-btn-primary w-full min-h-12 px-4 py-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createInviteBusy
              ? "Creating link…"
              : atFriendLimit
                ? "Friend limit reached"
                : "Create invite link"}
          </button>
          {inviteUrl ? (
            <div
              className={`discover-toolbar-enter space-y-3 rounded-[22px] border px-4 py-4 ${
                isDarkMode ? "border-violet-400/25 bg-violet-500/10" : "border-violet-200/90 bg-violet-50/80"
              }`}
            >
              <p className={`text-xs font-bold uppercase tracking-[0.18em] ${isDarkMode ? "text-violet-200" : "text-violet-700"}`}>
                Your invite link
              </p>
              <p className={`break-all rounded-[14px] px-3 py-2.5 text-sm leading-relaxed ${isDarkMode ? "bg-black/25 text-slate-100" : "bg-white text-slate-700 ring-1 ring-slate-200/80"}`}>
                {inviteUrl}
              </p>
              <button type="button" onClick={() => void copyInviteUrl()} className="ui-btn ui-btn-secondary w-full min-h-11 text-sm">
                Copy message again
              </button>
            </div>
          ) : null}
          {statusMessage && !inviteToken ? (
            <p
              className={`rounded-[18px] px-4 py-3 text-sm ${
                isDarkMode
                  ? "border border-white/12 bg-white/10 text-slate-200"
                  : "border border-slate-200/80 bg-slate-50 text-slate-600"
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
