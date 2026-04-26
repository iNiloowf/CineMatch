"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { getClientAccessToken } from "@/lib/get-access-token";
import { useAppState } from "@/lib/app-state";
import type { User } from "@/lib/types";

type TabId = "search" | "requests" | "friends";

function tabClass(active: boolean, isDarkMode: boolean) {
  return [
    "min-h-10 flex-1 rounded-full px-2 py-2 text-center text-xs font-semibold transition sm:px-3 sm:text-sm",
    active
      ? isDarkMode
        ? "bg-violet-500/25 text-white"
        : "bg-violet-100 text-violet-900"
      : isDarkMode
        ? "text-slate-400 hover:text-white"
        : "text-slate-600 hover:text-slate-900",
  ].join(" ");
}

function UserRowLine({
  user,
  isDarkMode,
  prefix,
}: {
  user: User;
  isDarkMode: boolean;
  prefix?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
        {user.avatarImageUrl ? (
          <Image src={user.avatarImageUrl} alt="" fill className="object-cover" sizes="44px" />
        ) : (
          <div
            className={`flex h-11 w-11 items-center justify-center text-sm font-semibold ${
              isDarkMode ? "bg-violet-600/30 text-white" : "bg-violet-100 text-violet-800"
            }`}
          >
            {user.avatar?.slice(0, 2) ?? "—"}
          </div>
        )}
      </div>
      <div className="min-w-0">
        {prefix ? (
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
            {prefix}
          </p>
        ) : null}
        <p className="truncate font-semibold">{user.name}</p>
        <p className={`truncate text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>@{user.publicHandle}</p>
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const searchParams = useSearchParams();
  const { isDarkMode, currentUserId, currentUser, linkedUsers, unlinkUser, refreshAccountData, isReady } =
    useAppState();

  const initialTab = (searchParams.get("tab") as TabId | null) ?? "search";
  const [tab, setTab] = useState<TabId>(
    initialTab === "requests" || initialTab === "friends" ? initialTab : "search",
  );
  const [q, setQ] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<
    {
      id: string;
      displayName: string;
      publicHandle: string;
      avatarText: string;
      avatarImageUrl: string | null;
    }[]
  >([]);

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    const t = (searchParams.get("tab") as TabId | null) ?? "search";
    if (t === "search" || t === "requests" || t === "friends") {
      setTab(t);
    }
  }, [searchParams]);

  const sentPending = useMemo(
    () =>
      linkedUsers.filter(
        (l) => l.status === "pending" && l.requesterId === currentUserId,
      ),
    [linkedUsers, currentUserId],
  );

  const receivedPending = useMemo(
    () =>
      linkedUsers.filter(
        (l) => l.status === "pending" && l.requesterId !== currentUserId,
      ),
    [linkedUsers, currentUserId],
  );

  const friendsAccepted = useMemo(
    () => linkedUsers.filter((l) => l.status === "accepted"),
    [linkedUsers],
  );

  const runSearch = useCallback(async () => {
    if (!currentUserId) {
      return;
    }
    const query = q.trim();
    if (query.length < 2) {
      setSearchError("Type at least 2 characters.");
      setSearchResults([]);
      return;
    }
    setSearchError(null);
    setSearchBusy(true);
    try {
      const token = await getClientAccessToken();
      if (!token) {
        setSearchError("Log in to search.");
        setSearchResults([]);
        return;
      }
      const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await res.json()) as {
        error?: string;
        results?: {
          id: string;
          displayName: string;
          publicHandle: string;
          avatarText: string;
          avatarImageUrl: string | null;
        }[];
      };
      if (!res.ok) {
        setSearchError(payload.error ?? "Search failed.");
        setSearchResults([]);
        return;
      }
      setSearchResults(payload.results ?? []);
    } catch {
      setSearchError("Couldn’t search right now.");
      setSearchResults([]);
    } finally {
      setSearchBusy(false);
    }
  }, [q, currentUserId]);

  const addFriend = async (handle: string) => {
    setActionMessage(null);
    setActionBusy(true);
    try {
      const token = await getClientAccessToken();
      if (!token) {
        setActionMessage("Log in to add friends.");
        return;
      }
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ publicHandle: handle }),
      });
      const payload = (await res.json()) as { error?: string; kind?: string };
      if (!res.ok) {
        setActionMessage(payload.error ?? "Couldn’t send a request.");
        return;
      }
      setActionMessage(
        payload.kind === "auto_accepted" ? "You’re now friends." : "Friend request sent.",
      );
      refreshAccountData();
    } catch {
      setActionMessage("Request failed. Try again.");
    } finally {
      setActionBusy(false);
    }
  };

  const respond = async (linkId: string, accept: boolean) => {
    setActionMessage(null);
    setActionBusy(true);
    try {
      const token = await getClientAccessToken();
      if (!token) {
        return;
      }
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ linkId, accept }),
      });
      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setActionMessage(payload.error ?? "Couldn’t update that request.");
        return;
      }
      setActionMessage(accept ? "Request accepted." : "Request declined.");
      refreshAccountData();
    } catch {
      setActionMessage("Update failed. Try again.");
    } finally {
      setActionBusy(false);
    }
  };

  if (!isReady) {
    return <div className="p-6">Loading…</div>;
  }

  return (
    <div
      className={`min-h-0 w-full min-w-0 space-y-4 px-4 py-4 pb-24 sm:px-5 ${
        isDarkMode ? "text-slate-100" : "text-slate-900"
      }`}
    >
      <PageHeader
        eyebrow="People"
        title="Friends"
        description="Search by User ID, handle requests, and see friends you’ve accepted."
      />

      {actionMessage ? (
        <p
          role="status"
          className={`rounded-2xl px-4 py-2 text-sm font-medium ${
            isDarkMode ? "border border-white/10 bg-white/5" : "border border-slate-200 bg-white"
          }`}
        >
          {actionMessage}
        </p>
      ) : null}

      <div
        className={`flex max-w-lg gap-1 rounded-2xl p-1 ${
          isDarkMode ? "bg-white/5" : "bg-slate-100"
        }`}
        role="tablist"
        aria-label="Friends sections"
      >
        {(
          [
            ["search", "Search"] as const,
            ["requests", "Requests"] as const,
            ["friends", "Friends"] as const,
          ] as const
        ).map(([id, label]) => (
          <Link
            key={id}
            href={`/friends?tab=${id}`}
            scroll={false}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={tabClass(tab === id, isDarkMode)}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "search" ? (
        <SurfaceCard className="space-y-4 p-4 sm:p-5">
          <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            Search the directory by User ID — full or partial.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void runSearch();
                }
              }}
              placeholder="e.g. alex or user_4"
              className={`min-h-11 w-full flex-1 rounded-2xl border px-3 py-2 text-sm ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  : "border-slate-200 bg-white text-slate-900"
              }`}
            />
            <button
              type="button"
              disabled={searchBusy}
              onClick={() => void runSearch()}
              className="ui-btn ui-btn-primary min-h-11 px-4 text-sm font-semibold"
            >
              {searchBusy ? "Searching…" : "Search"}
            </button>
          </div>
          {searchError ? (
            <p className="text-sm text-rose-500" role="alert">
              {searchError}
            </p>
          ) : null}
          <ul className="space-y-2">
            {searchResults.length === 0 && !searchBusy && q.trim().length >= 2 && !searchError ? (
              <li className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                No results. Try a different part of their User ID.
              </li>
            ) : null}
            {searchResults.map((row) => {
              const already = linkedUsers.some((l) => l.user.id === row.id);
              return (
                <li
                  key={row.id}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2 ${
                    isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="relative h-11 w-11 overflow-hidden rounded-full">
                    {row.avatarImageUrl ? (
                      <Image
                        src={row.avatarImageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    ) : (
                      <div
                        className={`flex h-11 w-11 items-center justify-center text-sm font-semibold ${
                          isDarkMode ? "bg-violet-600/30 text-white" : "bg-violet-100 text-violet-800"
                        }`}
                      >
                        {row.avatarText?.slice(0, 2) ?? "—"}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{row.displayName}</p>
                    <p className={`truncate text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      @{row.publicHandle}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={actionBusy || already || currentUser?.publicHandle === row.publicHandle}
                    onClick={() => void addFriend(row.publicHandle)}
                    className="shrink-0 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {already ? "Sent / friends" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        </SurfaceCard>
      ) : null}

      {tab === "requests" ? (
        <div className="space-y-4">
          <SurfaceCard className="space-y-3 p-4 sm:p-5">
            <h2 className="text-base font-semibold">Received</h2>
            {receivedPending.length === 0 ? (
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                No incoming friend requests.
              </p>
            ) : (
              <ul className="space-y-2">
                {receivedPending.map((l) => (
                  <li
                    key={l.linkId}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 ${
                      isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"
                    }`}
                  >
                    <UserRowLine user={l.user} isDarkMode={isDarkMode} />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void respond(l.linkId, true)}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => void respond(l.linkId, false)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                          isDarkMode ? "border-white/20 text-white" : "border-slate-300 text-slate-800"
                        }`}
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-3 p-4 sm:p-5">
            <h2 className="text-base font-semibold">Sent</h2>
            {sentPending.length === 0 ? (
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                No pending outgoing requests.
              </p>
            ) : (
              <ul className="space-y-2">
                {sentPending.map((l) => (
                  <li
                    key={l.linkId}
                    className={`flex rounded-2xl border p-3 ${
                      isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"
                    }`}
                  >
                    <UserRowLine user={l.user} isDarkMode={isDarkMode} />
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>
        </div>
      ) : null}

      {tab === "friends" ? (
        <SurfaceCard className="space-y-3 p-4 sm:p-5">
          {friendsAccepted.length === 0 ? (
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              No friends yet. Open Search to find people by User ID.
            </p>
          ) : (
            <ul className="space-y-2">
              {friendsAccepted.map((l) => (
                <li
                  key={l.linkId}
                  className={`flex items-center justify-between gap-2 rounded-2xl border p-3 ${
                    isDarkMode ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white"
                  }`}
                >
                  <UserRowLine user={l.user} isDarkMode={isDarkMode} />
                  <button
                    type="button"
                    className="shrink-0 text-xs font-semibold text-rose-500"
                    onClick={async () => {
                      const res = await unlinkUser(l.user.id);
                      setActionMessage(res.message);
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SurfaceCard>
      ) : null}
    </div>
  );
}
