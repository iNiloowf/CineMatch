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
import { AppRouteLoading } from "@/components/app-route-status";
import { ModalPortal } from "@/components/modal-portal";
import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";
import { getClientAccessToken } from "@/lib/get-access-token";
import { useAppState } from "@/lib/app-state";
import { useEscapeToClose } from "@/lib/use-escape-to-close";
import type { User } from "@/lib/types";

type TabId = "requests" | "friends";

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
  { id: "friends", label: "Friends", hint: "Yours" },
  { id: "requests", label: "Requests", hint: "In & out" },
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

  const tabFromUrl = searchParams.get("tab");
  const initialTab: TabId =
    tabFromUrl === "requests" || tabFromUrl === "friends"
      ? tabFromUrl
      : "friends";
  const [tab, setTab] = useState<TabId>(initialTab);
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
  const [unfriendConfirm, setUnfriendConfirm] = useState<{
    userId: string;
    name: string;
    publicHandle: string;
  } | null>(null);
  const [unfriendWorking, setUnfriendWorking] = useState(false);
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
    if (!currentUserId) {
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
  }, [q, currentUserId, executeSearch]);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "requests" || t === "friends") {
      setTab(t);
    } else {
      setTab("friends");
    }
  }, [searchParams]);

  const FRIENDS_LINKS_POLL_MS = 12_000;

  /** Pull latest links when opening Friends or changing tab so requests/accepts don’t need an app restart. */
  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    refreshAccountData();
  }, [currentUserId, tab, refreshAccountData]);

  /** If Realtime is slow or the user never backgrounds the app, still pick up adds/accepts. */
  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshAccountData();
      }
    }, FRIENDS_LINKS_POLL_MS);
    return () => window.clearInterval(id);
  }, [currentUserId, refreshAccountData]);

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

  const closeUnfriendModal = useCallback(() => {
    if (unfriendWorking) {
      return;
    }
    setUnfriendConfirm(null);
  }, [unfriendWorking]);

  const confirmUnfriend = useCallback(async () => {
    if (!unfriendConfirm) {
      return;
    }
    setUnfriendWorking(true);
    try {
      const res = await unlinkUser(unfriendConfirm.userId);
      setActionMessage(res.message);
      setUnfriendConfirm(null);
    } finally {
      setUnfriendWorking(false);
    }
  }, [unfriendConfirm, unlinkUser]);

  useEscapeToClose(unfriendConfirm !== null && !unfriendWorking, closeUnfriendModal);

  if (!isReady) {
    return (
      <AppRouteLoading
        ariaLabel="Loading friends"
        message="Loading…"
        isDarkMode={isDarkMode}
        visual="spinner"
        frameClassName="flex min-h-[40vh] w-full flex-1 flex-col items-center justify-center"
      />
    );
  }

  const listShell = isDarkMode
    ? "border-white/12 bg-white/[0.04] hover:border-white/18"
    : "border-slate-200/90 bg-white hover:border-slate-300/90";

  return (
    <>
    <div
      className={`app-screen-stack w-full min-w-0 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}
    >
      <PageHeader eyebrow="People" title="Friends" />

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

      <div className="ui-glass-panel discover-toolbar-enter discover-search-toolbar w-full px-3 py-2.5 sm:px-3.5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <p id="friends-search-hint" className="sr-only">
            Type at least two characters to search by User ID. Press Enter to refresh results.
          </p>
          <div className="relative min-w-0 flex-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void runSearchNow();
                }
              }}
              placeholder="Search by User ID"
              autoComplete="off"
              enterKeyHint="search"
              aria-describedby="friends-search-hint"
              className="ui-input-shell w-full min-w-0 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-violet-400 max-[380px]:text-[12px] sm:pl-10 sm:pr-4"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 sm:left-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="ui-icon-md ui-icon-stroke"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" />
              </svg>
            </span>
          </div>
          <button
            type="button"
            disabled={searchBusy}
            onClick={() => void runSearchNow()}
            aria-label={searchBusy ? "Searching" : "Search"}
            className="ui-icon-button flex min-h-11 shrink-0 items-center justify-center px-2.5 hover:bg-white/12 min-[400px]:px-3"
          >
            {searchBusy ? (
              <span
                className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400/40 border-t-violet-500`}
                aria-hidden
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="ui-icon-md ui-icon-stroke"
                aria-hidden
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div
        className="grid w-full grid-cols-2 gap-1.5 p-0 sm:gap-2"
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
            className={`${tabItemClass(tab === id, isDarkMode)} relative`}
            title={hint}
            aria-label={
              id === "requests" && receivedPending.length > 0
                ? `${label}, ${receivedPending.length} pending request${receivedPending.length === 1 ? "" : "s"}`
                : undefined
            }
          >
            <span
              className="text-base leading-none sm:text-lg"
              aria-hidden
            >
              {id === "friends" ? "👥" : "💬"}
            </span>
            {id === "requests" && receivedPending.length > 0 ? (
              <span
                className={`pointer-events-none absolute right-1 top-1 z-10 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ${
                  isDarkMode ? "ring-slate-950" : "ring-white"
                }`}
                aria-hidden
              />
            ) : null}
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

      {tab === "friends" ? (
        <div className="space-y-[var(--app-section-gap)]">
          {q.trim().length > 0 ? (
          <SurfaceCard className="space-y-3">
            {searchError ? (
              <p className="text-sm text-rose-500" role="alert">
                {searchError}
              </p>
            ) : null}
            <ul className="space-y-3">
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
                const link = linkedUsers.find((l) => l.user.id === row.id);
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
                if (link) {
                  const isAccepted = link.status === "accepted";
                  const isOutgoingRequest =
                    link.status === "pending" && link.requesterId === currentUserId;
                  const statusMessage = isAccepted
                    ? "Already a friend — tap to open their profile"
                    : isOutgoingRequest
                      ? "Friend request sent — tap to open their profile"
                      : "Request pending — check the Requests tab to respond";
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
                            isAccepted
                              ? isDarkMode
                                ? "text-emerald-400/90"
                                : "text-emerald-700"
                              : isDarkMode
                                ? "text-amber-200/90"
                                : "text-amber-800"
                          }`}
                        >
                          {statusMessage}
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

          <SurfaceCard className="space-y-4">
            <h2 className="app-section-label">Your friends</h2>
            {friendsAccepted.length === 0 ? (
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                No friends yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {friendsAccepted.map((l) => {
                  const href = `/friends/${l.user.id}`;
                  return (
                    <li
                      key={l.linkId}
                      className={`flex min-h-[3.5rem] items-stretch overflow-hidden rounded-2xl border transition ${listShell}`}
                    >
                      <div className="min-w-0 flex-1 p-2.5 pr-2 sm:p-3 sm:pr-2">
                        <UserProfileLinks user={l.user} isDarkMode={isDarkMode} href={href}>
                          <Link
                            href={href}
                            className="block w-fit max-w-full truncate text-left text-base font-semibold outline-offset-2 hover:underline"
                          >
                            {l.user.name}
                          </Link>
                          <div className="mt-0.5">
                            <Link
                              href={href}
                              className={`block w-fit max-w-full truncate text-left font-mono text-xs hover:underline ${
                                isDarkMode ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              @{l.user.publicHandle}
                            </Link>
                          </div>
                        </UserProfileLinks>
                      </div>
                      <div
                        className={`flex w-12 shrink-0 items-center justify-center self-stretch border-l sm:w-[3.25rem] ${
                          isDarkMode ? "border-white/10" : "border-slate-200/90"
                        }`}
                      >
                        <button
                          type="button"
                          aria-label={`Remove ${l.user.name} as friend`}
                          className={`flex h-full w-full min-h-11 items-center justify-center outline-offset-2 transition hover:bg-rose-500/15 active:scale-95 ${
                            isDarkMode ? "text-rose-400" : "text-rose-600"
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setUnfriendConfirm({
                              userId: l.user.id,
                              name: l.user.name,
                              publicHandle: l.user.publicHandle,
                            });
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            className="h-5 w-5"
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
                    </li>
                  );
                })}
              </ul>
            )}
          </SurfaceCard>
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="space-y-[var(--app-section-gap)]">
          <SurfaceCard className="space-y-3">
            <h2 className="app-section-label">Received</h2>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
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

          <SurfaceCard className="space-y-3">
            <h2 className="app-section-label">Sent</h2>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
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
    </div>

    <ModalPortal open={unfriendConfirm !== null}>
      <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/45 backdrop-blur-md">
        <button
          type="button"
          aria-label="Close"
          onClick={closeUnfriendModal}
          className="absolute inset-0 cursor-default bg-transparent"
        />
        <div
          className={`ui-shell ui-shell--dialog-md relative z-10 mx-auto w-full max-w-md overflow-hidden rounded-[28px] border shadow-[0_24px_70px_rgba(15,23,42,0.22)] ${
            isDarkMode ? "border-white/12 bg-slate-950 text-slate-100" : "border-slate-200/90 bg-white text-slate-900"
          }`}
        >
          <span className="ui-modal-accent-bar" aria-hidden />
          <div className={`ui-shell-header ${isDarkMode ? "!border-b-white/10" : "!border-b-slate-100"}`}>
            <p className="min-w-0 flex-1 text-lg font-semibold text-inherit">Remove friend?</p>
            <button
              type="button"
              onClick={closeUnfriendModal}
              disabled={unfriendWorking}
              aria-label="Close"
              className={`ui-shell-close ${
                isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
              } disabled:opacity-50`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div className="ui-shell-body !pt-4">
            {unfriendConfirm ? (
              <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                Remove <span className="font-semibold text-inherit">{unfriendConfirm.name}</span> (
                <span className="font-mono">@{unfriendConfirm.publicHandle}</span>) from your friends? You can
                send a new request with the find-people search later.
              </p>
            ) : null}
          </div>
          <div className="ui-shell-footer !pt-4">
            <button
              type="button"
              onClick={closeUnfriendModal}
              disabled={unfriendWorking}
              className="ui-btn ui-btn-secondary min-w-0 flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmUnfriend()}
              disabled={unfriendWorking}
              className="ui-btn ui-btn-danger min-w-0 flex-1"
            >
              {unfriendWorking ? "Removing…" : "Remove"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
    </>
  );
}
