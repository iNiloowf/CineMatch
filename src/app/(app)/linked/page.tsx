"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AvatarBadge } from "@/components/avatar-badge";
import { NetworkStatusBlock } from "@/components/network-status-block";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";
import { MAX_LINKED_FRIENDS } from "@/lib/invite-link-utils";
import { useEscapeToClose } from "@/lib/use-escape-to-close";

export default function FriendsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [connectedPartnerName, setConnectedPartnerName] = useState("");
  const [removedPartnerName, setRemovedPartnerName] = useState("");
  const [pendingRemove, setPendingRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const acceptedLinkedIdsRef = useRef<string[]>([]);
  const acceptedLinkedNamesRef = useRef<Record<string, string>>({});
  const hasBootstrappedAcceptedLinks = useRef(false);
  const { linkedUsers, unlinkUser, isDarkMode } = useAppState();

  useEffect(() => {
    if (inviteToken) {
      router.replace(`/connect?invite=${encodeURIComponent(inviteToken)}`);
    }
  }, [inviteToken, router]);

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
    }

    const removedLinkedId = acceptedLinkedIdsRef.current.find(
      (linkedId) => !acceptedIds.includes(linkedId),
    );

    if (removedLinkedId) {
      const removedName =
        acceptedLinkedNamesRef.current[removedLinkedId] ?? "this person";
      setConnectedPartnerName("");
      setRemovedPartnerName(removedName);
    }

    acceptedLinkedIdsRef.current = acceptedIds;
    acceptedLinkedNamesRef.current = acceptedNames;
  }, [linkedUsers]);

  useEscapeToClose(Boolean(pendingRemove), () => setPendingRemove(null));

  if (inviteToken) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
        <p className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
          Opening connect flow…
        </p>
      </div>
    );
  }

  const statusBadge = (status: "accepted" | "pending") =>
    status === "accepted"
      ? isDarkMode
        ? "bg-emerald-500/18 text-emerald-100 ring-1 ring-emerald-400/28"
        : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/80"
      : isDarkMode
        ? "bg-amber-500/20 text-amber-50 ring-1 ring-amber-400/35"
        : "bg-amber-100 text-amber-900 ring-1 ring-amber-200/90";

  const accentBar = (status: "accepted" | "pending") =>
    status === "accepted"
      ? isDarkMode
        ? "bg-emerald-500/85"
        : "bg-emerald-500/90"
      : isDarkMode
        ? "bg-amber-400/80"
        : "bg-amber-400/95";

  return (
    <div className="space-y-5">
      {pendingRemove ? (
        <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/32 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setPendingRemove(null)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            className={`ui-shell ui-shell--dialog-md relative z-10 flex max-h-[min(92dvh,28rem)] flex-col overflow-hidden rounded-[30px] border shadow-[0_24px_70px_rgba(15,23,42,0.18)] ${
              isDarkMode
                ? "border-white/14 bg-slate-950 text-slate-100"
                : "border-white/70 bg-white"
            }`}
          >
            <div
              className={`ui-shell-header shrink-0 ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-200"}`}
            >
              <p className="min-w-0 flex-1 text-lg font-semibold text-inherit">Remove linked person?</p>
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
            <div className={`ui-shell-footer !pt-4 shrink-0 ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
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
                  setUnlinkError(null);
                  const result = await unlinkUser(pendingRemove.id);
                  if (!result.ok) {
                    setUnlinkError(result.message);
                    return;
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
            className={`achievement-toast-pop rounded-[28px] border px-5 py-5 shadow-[0_18px_44px_rgba(15,23,42,0.12)] ${
              isDarkMode
                ? "border-white/12 bg-slate-950/94 text-slate-100"
                : "border-slate-200/90 bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${isDarkMode ? "text-violet-300" : "text-violet-600"}`}>
                  Connected
                </p>
                <p className={`text-lg font-semibold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                  You are connected now.
                </p>
                <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-500"}`}>
                  Your shared matches will start showing up as you both accept the same movies.
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
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Removed</p>
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
        eyebrow="Friends"
        title="Your people"
        description={`Linked friends power Shared. Up to ${MAX_LINKED_FRIENDS} connections.`}
      />

      {unlinkError ? (
        <NetworkStatusBlock
          variant="error"
          isDarkMode={isDarkMode}
          title="Couldn’t remove link"
          description={unlinkError}
          secondaryAction={{
            label: "Dismiss",
            onClick: () => setUnlinkError(null),
          }}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            isDarkMode ? "bg-white/10 text-slate-200 ring-1 ring-white/12" : "bg-slate-100 text-slate-700"
          }`}
        >
          {linkedUsers.length} / {MAX_LINKED_FRIENDS} friends
        </span>
        <Link href="/connect" className="discover-toolbar-enter ui-btn ui-btn-primary inline-flex min-h-11 items-center px-5 text-sm">
          Add or invite
        </Link>
      </div>

      <div className="space-y-3">
        {linkedUsers.map((linked, index) => (
          <SurfaceCard
            key={linked.user.id}
            className="overflow-hidden !p-0"
            style={{ animationDelay: `${Math.min(index, 5) * 55}ms` }}
          >
            <div className="flex min-h-[5.75rem]">
              <div className={`w-0.5 shrink-0 ${accentBar(linked.status)}`} aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Link
                    href={`/friends/${linked.user.id}`}
                    className="shrink-0 rounded-full outline-none ring-offset-2 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-violet-400/80"
                    aria-label={`View ${linked.user.name} profile and saved picks`}
                  >
                    <AvatarBadge
                      initials={linked.user.avatar}
                      imageUrl={linked.user.avatarImageUrl}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`truncate text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                        {linked.user.name}
                      </p>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusBadge(linked.status)}`}>
                        {linked.status === "accepted" ? "Active" : "Pending"}
                      </span>
                    </div>
                    <p className={`truncate text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      {linked.user.city}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-2 sm:max-w-[12rem] sm:items-end">
                  <p
                    className={`line-clamp-2 text-sm leading-snug sm:text-right ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}
                  >
                    {linked.user.bio}
                  </p>
                  <p
                    className={`w-full rounded-[14px] border px-3 py-2 text-center text-xs font-semibold sm:w-auto sm:text-right ${
                      linked.sharedCount > 0
                        ? isDarkMode
                          ? "border-violet-400/20 bg-violet-500/10 text-violet-100"
                          : "border-violet-200/80 bg-violet-50/90 text-violet-800"
                        : isDarkMode
                          ? "border-white/10 bg-white/[0.04] text-slate-400"
                          : "border-slate-200/80 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {linked.sharedCount > 0
                      ? `${linked.sharedCount} shared pick${linked.sharedCount === 1 ? "" : "s"}`
                      : "No shared picks yet"}
                  </p>
                </div>
              </div>
            </div>
            {linked.status === "accepted" ? (
              <div
                className={`flex justify-end border-t px-4 py-3 ${isDarkMode ? "border-white/10" : "border-slate-100"}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setPendingRemove({
                      id: linked.user.id,
                      name: linked.user.name,
                    })
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    isDarkMode
                      ? "border border-rose-400/35 bg-rose-500/12 text-rose-100 hover:bg-rose-500/18"
                      : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </SurfaceCard>
        ))}

        {linkedUsers.length === 0 ? (
          <SurfaceCard className="discover-toolbar-enter space-y-4 px-5 py-8 text-center">
            <p className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
              No friends linked yet
            </p>
            <p className={`mx-auto max-w-sm text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Invite someone from the Connect page. When they accept, they will show up here as{" "}
              <span className="font-semibold text-inherit">Active</span> or{" "}
              <span className="font-semibold text-inherit">Pending</span>.
            </p>
            <Link href="/connect" className="ui-btn ui-btn-primary mx-auto inline-flex min-w-[12rem] justify-center">
              Go to Connect
            </Link>
          </SurfaceCard>
        ) : null}
      </div>
    </div>
  );
}
