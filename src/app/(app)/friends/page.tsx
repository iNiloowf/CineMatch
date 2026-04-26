"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { getClientAccessToken } from "@/lib/get-access-token";
import { useAppState } from "@/lib/app-state";
import type { User } from "@/lib/types";

type TabId = "search" | "requests" | "friends";

function tabItemClass(
  active: boolean,
  isDarkMode: boolean,
  compact?: boolean,
) {
  return [
    "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[16px] px-1.5 py-2 text-center font-semibold transition sm:px-2",
    compact ? "text-[10px] sm:text-xs" : "text-[11px] sm:text-sm",
    active
      ? isDarkMode
        ? "bg-violet-500/30 text-white shadow-sm ring-1 ring-white/15"
        : "bg-white text-violet-900 shadow-sm ring-1 ring-violet-200/80"
      : isDarkMode
        ? "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
        : "text-slate-500 hover:bg-white/60 hover:text-slate-800",
  ].join(" ");
}

const TAB_META: {
  id: TabId;
  label: string;
  hint: string;
}[] = [
  { id: "search", label: "Search", hint: "Find" },
  { id: "requests", label: "Requests", hint: "In & out" },
  { id: "friends", label: "Friends", hint: "Yours" },
];

function UserProfileLinks({
  user,
  isDarkMode,
  children,
  href,
}: {
  user: User;
  isDarkMode: boolean;
  children: ReactNode;
  href: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <Link
        href={href}
        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full outline-none ring-violet-400/40 transition hover:ring-2 focus-visible:ring-2"
        aria-label={`View ${user.name}’s profile`}
      >
        {user.avatarImageUrl ? (
          <Image
            src={user.avatarImageUrl}
            alt=""
            fill
            unoptimized
            className="object-cover"
            sizes="44px"
          />
        ) : (
          <div
            className={`flex h-11 w-11 items-center justify-center text-sm font-semibold ${
              isDarkMode ? "bg-violet-600/30 text-white" : "bg-violet-100 text-violet-800"
            }`}
          >
            {user.avatar?.slice(0, 2) ?? "—"}
          </div>
        )}
      </Link>
      <div className="min-w-0 flex-1">{children}</div>
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
  const searchRequestIdRef = useRef(0);
  const SEARCH_DEBOUNCE_MS = 320;

  const executeSearch = useCallback(
    async (rawQuery: string) => {
      if (!currentUserId) {
        return;
      }
      const query = rawQuery.trim();
      if (query.length < 2) {
        setSearchResults([]);
        setSearchError(null);
        return;
      }
      const myRequest = ++searchRequestIdRef.current;
      setSearchError(null);
      setSearchBusy(true);
      try {
        const token = await getClientAccessToken();
        if (!token) {
          if (myRequest === searchRequestIdRef.current) {
            setSearchError("Log in to search.");
            setSearchResults([]);
          }
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
        if (myRequest !== searchRequestIdRef.current) {
          return;
        }
        if (!res.ok) {
          setSearchError(payload.error ?? "Search failed.");
          setSearchResults([]);
          return;
        }
        setSearchResults(payload.results ?? []);
      } catch {
        if (myRequest === searchRequestIdRef.current) {
          setSearchError("Couldn’t search right now.");
          setSearchResults([]);
        }
      } finally {
        if (myRequest === searchRequestIdRef.current) {
          setSearchBusy(false);
        }
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    if (tab !== "search" || !currentUserId) {
      return;
    }
    const query = q.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    const t = window.setTimeout(() => {
      void executeSearch(query);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q, tab, currentUserId, executeSearch]);

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

  const runSearchNow = useCallback(() => {
    void executeSearch(q);
  }, [q, executeSearch]);

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

  const listShell = isDarkMode
    ? "border-white/12 bg-white/[0.04] hover:border-white/18"
    : "border-slate-200/90 bg-white hover:border-slate-300/90";

  return (
    <div
      className={`mx-auto w-full max-w-md min-h-0 space-y-4 px-[var(--app-page-px)] py-4 pb-24 ${
        isDarkMode ? "text-slate-100" : "text-slate-900"
      }`}
    >
      <PageHeader
        eyebrow="People"
        title="Friends"
        description="Search by ID, handle requests, view your list."
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
        className={`grid w-full grid-cols-3 gap-1 p-1 sm:gap-1.5 sm:p-1.5 ${
          isDarkMode
            ? "rounded-[20px] bg-slate-950/60 ring-1 ring-white/10"
            : "rounded-[20px] bg-slate-200/80 ring-1 ring-slate-200/60"
        }`}
        role="tablist"
        aria-label="Friends sections"
      >
        {TAB_META.map(({ id, label, hint }) => (
          <Link
            key={id}
            href={`/friends?tab=${id}`}
            scroll={false}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={tabItemClass(tab === id, isDarkMode)}
            title={hint}
          >
            <span
              className="text-base leading-none sm:text-lg"
              aria-hidden
            >
              {id === "search" ? "🔍" : id === "requests" ? "💬" : "👥"}
            </span>
            <span className="w-full leading-tight">{label}</span>
            <span
              className={`hidden w-full text-[8px] font-medium uppercase leading-none tracking-wide sm:block ${
                tab === id
                  ? isDarkMode
                    ? "text-violet-200/80"
                    : "text-violet-700/80"
                  : isDarkMode
                    ? "text-slate-500"
                    : "text-slate-500"
              }`}
            >
              {hint}
            </span>
          </Link>
        ))}
      </div>

      {tab === "search" ? (
        <SurfaceCard
          className={`space-y-5 p-5 sm:p-6 ${isDarkMode ? "border-white/10" : ""}`}
        >
          <p
            className={`text-sm leading-relaxed ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Type a User ID (or a fragment). After two characters, matches load as you type — or tap
            Search / press Enter to refresh. Add someone, or open their profile if you’re already linked.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void runSearchNow();
                }
              }}
              placeholder="e.g. alex or user_4"
              autoComplete="off"
              className={`min-h-12 w-full flex-1 rounded-2xl border px-4 py-2.5 text-sm ${
                isDarkMode
                  ? "border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  : "border-slate-200 bg-white text-slate-900"
              }`}
            />
            <button
              type="button"
              disabled={searchBusy}
              onClick={() => void runSearchNow()}
              className="ui-btn ui-btn-primary min-h-12 w-full shrink-0 px-5 text-sm font-semibold sm:min-w-[6.5rem] sm:w-auto"
            >
              {searchBusy ? "Searching…" : "Search"}
            </button>
          </div>
          {searchError ? (
            <p className="pt-0.5 text-sm text-rose-500" role="alert">
              {searchError}
            </p>
          ) : null}
          <ul className="space-y-3 border-t border-transparent pt-1 sm:pt-2">
            {q.trim().length > 0 && q.trim().length < 2 && !searchBusy ? (
              <li className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                Add one more character to search.
              </li>
            ) : null}
            {searchResults.length === 0 && !searchBusy && q.trim().length >= 2 && !searchError ? (
              <li className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                No results — try another part of the User ID.
              </li>
            ) : null}
            {searchResults.map((row) => {
              const already = linkedUsers.some((l) => l.user.id === row.id);
              const profileHref = `/friends/${row.id}`;
              const searchUser: User = {
                id: row.id,
                publicHandle: row.publicHandle,
                name: row.displayName,
                email: "",
                avatar: row.avatarText?.slice(0, 2) ?? "—",
                avatarImageUrl: row.avatarImageUrl ?? undefined,
                bio: "",
                city: "",
              };
              if (already) {
                return (
                  <li
                    key={row.id}
                    className={`rounded-2xl border p-3.5 sm:p-4 ${listShell}`}
                  >
                    <UserProfileLinks user={searchUser} isDarkMode={isDarkMode} href={profileHref}>
                      <Link
                        href={profileHref}
                        className="block w-fit max-w-full truncate text-base font-semibold text-left outline-offset-2 hover:underline"
                      >
                        {row.displayName}
                      </Link>
                      <div className="mt-1.5">
                        <Link
                          href={profileHref}
                          className={`inline font-mono text-xs ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          } hover:underline`}
                        >
                          @{row.publicHandle}
                        </Link>
                      </div>
                      <p
                        className={`mt-2.5 text-xs font-medium ${
                          isDarkMode ? "text-emerald-400/90" : "text-emerald-700"
                        }`}
                      >
                        Already a friend — tap to open their profile
                      </p>
                    </UserProfileLinks>
                  </li>
                );
              }

              return (
                <li
                  key={row.id}
                  className={`flex flex-col gap-3.5 rounded-2xl border p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-3.5 sm:pr-3.5 sm:pl-4 ${listShell}`}
                >
                  <div className="min-w-0 flex-1 sm:pr-1">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full">
                        {row.avatarImageUrl ? (
                          <Image
                            src={row.avatarImageUrl}
                            alt=""
                            fill
                            unoptimized
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
                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate font-semibold leading-snug">{row.displayName}</p>
                        <p
                          className={`truncate font-mono text-xs ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          @{row.publicHandle}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 self-stretch pt-1.5 sm:pt-0">
                    <button
                      type="button"
                      disabled={actionBusy || currentUser?.publicHandle === row.publicHandle}
                      onClick={() => void addFriend(row.publicHandle)}
                      className="w-full min-h-11 rounded-full bg-violet-600 px-4 text-xs font-semibold text-white sm:min-w-[5.5rem] sm:px-5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </SurfaceCard>
      ) : null}

      {tab === "requests" ? (
        <div className="space-y-4">
          <SurfaceCard className={`space-y-3 p-4 sm:p-5 ${isDarkMode ? "border-white/10" : ""}`}>
            <h2
              className={`text-sm font-bold uppercase tracking-[0.12em] ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Received
            </h2>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Inbox — accept or decline.
            </p>
            {receivedPending.length === 0 ? (
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                None yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {receivedPending.map((l) => {
                  const href = `/friends/${l.user.id}`;
                  return (
                    <li
                      key={l.linkId}
                      className={`flex flex-col gap-2 rounded-2xl border p-2.5 transition sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3 ${listShell}`}
                    >
                      <UserProfileLinks user={l.user} isDarkMode={isDarkMode} href={href}>
                        <Link
                          href={href}
                          className="block w-fit max-w-full truncate font-semibold text-left outline-offset-2 hover:underline"
                        >
                          {l.user.name}
                        </Link>
                        <p
                          className={`mt-0.5 w-fit max-w-full truncate text-left font-mono text-xs hover:underline ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}
                        >
                          <Link href={href} className="text-inherit">
                            @{l.user.publicHandle}
                          </Link>
                        </p>
                      </UserProfileLinks>
                      <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => void respond(l.linkId, true)}
                          className="min-h-10 min-w-0 flex-1 rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white sm:min-w-[5.5rem] sm:flex-none"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => void respond(l.linkId, false)}
                          className={`min-h-10 min-w-0 flex-1 rounded-full border px-3 text-xs font-semibold sm:min-w-[5.5rem] sm:flex-none ${
                            isDarkMode ? "border-white/20 text-white" : "border-slate-300 text-slate-800"
                          }`}
                        >
                          Decline
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SurfaceCard>

          <SurfaceCard className={`space-y-3 p-4 sm:p-5 ${isDarkMode ? "border-white/10" : ""}`}>
            <h2
              className={`text-sm font-bold uppercase tracking-[0.12em] ${
                isDarkMode ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Sent
            </h2>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              Outbox — waiting on them to accept.
            </p>
            {sentPending.length === 0 ? (
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                None pending.
              </p>
            ) : (
              <ul className="space-y-2">
                {sentPending.map((l) => {
                  const href = `/friends/${l.user.id}`;
                  return (
                    <li
                      key={l.linkId}
                      className={`flex items-center gap-2 rounded-2xl border p-2.5 transition sm:p-3 ${listShell}`}
                    >
                      <div className="min-w-0 flex-1">
                        <UserProfileLinks user={l.user} isDarkMode={isDarkMode} href={href}>
                          <Link
                            href={href}
                            className="block w-fit max-w-full truncate font-semibold text-left outline-offset-2 hover:underline"
                          >
                            {l.user.name}
                          </Link>
                          <Link
                            href={href}
                            className={`mt-0.5 block w-fit max-w-full truncate text-left font-mono text-xs hover:underline ${
                              isDarkMode ? "text-slate-400" : "text-slate-500"
                            }`}
                          >
                            @{l.user.publicHandle}
                          </Link>
                        </UserProfileLinks>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SurfaceCard>
        </div>
      ) : null}

      {tab === "friends" ? (
        <SurfaceCard className={`space-y-4 p-4 sm:p-5 ${isDarkMode ? "border-white/10" : ""}`}>
          <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
            Tap name or photo to open their profile. Trash removes them (you’ll confirm first).
          </p>
          {friendsAccepted.length === 0 ? (
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              No friends yet — use Search.
            </p>
          ) : (
            <ul className="space-y-2">
              {friendsAccepted.map((l) => {
                const href = `/friends/${l.user.id}`;
                return (
                  <li
                    key={l.linkId}
                    className={`overflow-hidden rounded-2xl border transition ${listShell}`}
                  >
                    <div className="p-2.5 sm:p-3">
                      <UserProfileLinks user={l.user} isDarkMode={isDarkMode} href={href}>
                        <Link
                          href={href}
                          className="block w-fit max-w-full truncate text-left text-base font-semibold outline-offset-2 hover:underline"
                        >
                          {l.user.name}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          <Link
                            href={href}
                            className={`font-mono ${
                              isDarkMode ? "text-slate-400" : "text-slate-500"
                            } hover:underline`}
                          >
                            @{l.user.publicHandle}
                          </Link>
                          <span
                            className={isDarkMode ? "text-slate-500" : "text-slate-300"}
                            aria-hidden
                          >
                            ·
                          </span>
                          <button
                            type="button"
                            aria-label={`Remove ${l.user.name} as friend`}
                            className={`inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full outline-offset-2 transition hover:bg-rose-500/12 active:scale-95 ${
                              isDarkMode ? "text-rose-400" : "text-rose-600"
                            }`}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (
                                !window.confirm(
                                  `Remove ${l.user.name} (@${l.user.publicHandle}) from your friends?`,
                                )
                              ) {
                                return;
                              }
                              const res = await unlinkUser(l.user.id);
                              setActionMessage(res.message);
                            }}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              className="h-[1.1rem] w-[1.1rem]"
                              aria-hidden
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4h8v2" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </button>
                        </div>
                      </UserProfileLinks>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </SurfaceCard>
      ) : null}
    </div>
  );
}
