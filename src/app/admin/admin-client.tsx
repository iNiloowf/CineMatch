"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type DashboardStats = {
  users: number;
  movies: number;
  swipes: number;
  acceptedSwipes: number;
  rejectedSwipes: number;
  acceptedLinks: number;
  pendingLinks: number;
  watchedEntries: number;
  openTickets: number;
  proUsers: number;
};

type DashboardUserRow = {
  id: string;
  name: string;
  email: string;
  accepted: number;
  rejected: number;
  links: number;
  subscriptionTier: "free" | "pro";
  effectiveSubscriptionTier: "free" | "pro";
  adminModeSimulatePro: boolean;
};

type DashboardSwipeRow = {
  userId: string;
  userName: string;
  movieId: string;
  movieTitle: string;
  decision: "accepted" | "rejected";
  createdAt: string;
};

type DashboardTicketRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  priority: "low" | "normal" | "high";
  status: "open" | "in_progress" | "under_review" | "closed";
  createdAt: string;
  adminReply: string | null;
  adminRepliedAt: string | null;
};

type DashboardPayload = {
  stats: DashboardStats;
  userRows: DashboardUserRow[];
  recentSwipes: DashboardSwipeRow[];
  tickets: DashboardTicketRow[];
  ticketsUnavailable?: boolean;
};

type AdminTab = "overview" | "tickets" | "users" | "swipes" | "subscriptions";
type TicketManageStatus = "open" | "under_review" | "closed";

type AdminGate = "booting" | "sign_in" | "forbidden" | "ready";

export default function AdminDesktopPage() {
  const isDarkMode = true;
  const [adminGate, setAdminGate] = useState<AdminGate>("booting");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [selectedTicket, setSelectedTicket] = useState<DashboardTicketRow | null>(null);
  const [isTicketActionLoading, setIsTicketActionLoading] = useState(false);
  const [ticketActionFeedback, setTicketActionFeedback] = useState("");
  const [adminReplyDraft, setAdminReplyDraft] = useState("");
  const [subscriptionActionState, setSubscriptionActionState] = useState<{
    userId: string;
    message: string;
    isError: boolean;
  } | null>(null);
  const [subscriptionSavingUserId, setSubscriptionSavingUserId] = useState<string | null>(null);
  const [currentAdminUserId, setCurrentAdminUserId] = useState<string | null>(null);
  const [userPendingDelete, setUserPendingDelete] = useState<DashboardUserRow | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userDeleteError, setUserDeleteError] = useState("");
  const adminGateRef = useRef<AdminGate>("booting");

  useEffect(() => {
    adminGateRef.current = adminGate;
  }, [adminGate]);

  useEffect(() => {
    setAdminReplyDraft("");
    setTicketActionFeedback("");
  }, [selectedTicket?.id]);

  useEffect(() => {
    if (adminGate !== "ready") {
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      setCurrentAdminUserId(data.session?.user?.id ?? null);
    });
  }, [adminGate]);

  const getAdminAccessToken = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const sessionResult = supabase
      ? await supabase.auth.getSession()
      : { data: { session: null } };
    const accessToken = sessionResult.data.session?.access_token ?? null;
    if (!accessToken) {
      throw new Error("Please sign in with your CineMatch account first.");
    }
    return accessToken;
  }, []);

  const loadDashboard = useCallback(
    async (options?: { keepOldData?: boolean }) => {
      if (!options?.keepOldData) {
        setDashboard(null);
      }
      setIsLoadingDashboard(true);
      setDashboardError("");

      try {
        const accessToken = await getAdminAccessToken();
        const response = await fetch("/api/admin/dashboard", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = (await response.json()) as DashboardPayload & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Admin data could not be loaded.");
        }

        setDashboard(payload);
        return true;
      } catch (error) {
        setDashboardError(
          error instanceof Error ? error.message : "Admin data could not be loaded.",
        );
        return false;
      } finally {
        setIsLoadingDashboard(false);
      }
    },
    [getAdminAccessToken],
  );

  const attemptLoadWithSession = useCallback(
    async (session: Session | null) => {
      if (!session) {
        return;
      }
      const ok = await loadDashboard();
      if (ok) {
        setAdminGate("ready");
        setActiveTab("overview");
      } else {
        setAdminGate("forbidden");
      }
    },
    [loadDashboard],
  );

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !isSupabaseConfigured()) {
      setDashboardError(
        "Supabase is not configured. Admin tools require NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
      );
      setAdminGate("forbidden");
      return;
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) {
        return;
      }

      if (event === "INITIAL_SESSION") {
        if (session) {
          await attemptLoadWithSession(session);
          return;
        }
        const { data } = await supabase.auth.refreshSession();
        if (cancelled) {
          return;
        }
        if (data.session) {
          await attemptLoadWithSession(data.session);
        } else {
          setAdminGate("sign_in");
        }
        return;
      }

      if (event === "SIGNED_IN" && session) {
        const gate = adminGateRef.current;
        if (gate === "sign_in" || gate === "booting") {
          await attemptLoadWithSession(session);
        }
      }
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [attemptLoadWithSession]);

  const handleRecheckSession = useCallback(async () => {
    setDashboardError("");
    setAdminGate("booting");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setDashboardError("Authentication client is not available.");
      setAdminGate("forbidden");
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      await attemptLoadWithSession(sessionData.session);
      return;
    }
    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData.session) {
      await attemptLoadWithSession(refreshData.session);
      return;
    }
    setAdminGate("sign_in");
  }, [attemptLoadWithSession]);

  useEffect(() => {
    if (!selectedTicket || !dashboard) {
      return;
    }
    const freshSelection =
      dashboard.tickets.find((ticket) => ticket.id === selectedTicket.id) ?? null;
    setSelectedTicket(freshSelection);
  }, [dashboard, selectedTicket]);

  const updateDashboardTickets = useCallback(
    (nextTickets: DashboardTicketRow[]) => {
      setDashboard((current) => {
        if (!current) {
          return current;
        }
        const openTickets = nextTickets.filter((ticket) => ticket.status === "open").length;
        return {
          ...current,
          tickets: nextTickets,
          stats: {
            ...current.stats,
            openTickets,
          },
        };
      });
    },
    [],
  );

  const handleUpdateTicketStatus = useCallback(
    async (ticketId: string, status: TicketManageStatus) => {
      setIsTicketActionLoading(true);
      setTicketActionFeedback("");

      try {
        const accessToken = await getAdminAccessToken();
        const response = await fetch(`/api/admin/tickets/${ticketId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            status,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          status?: DashboardTicketRow["status"];
          adminReply?: string | null;
          adminRepliedAt?: string | null;
        };

        if (!response.ok || !payload.status) {
          throw new Error(payload.error ?? "Ticket status could not be updated.");
        }

        updateDashboardTickets(
          (dashboard?.tickets ?? []).map((ticket) =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  status: payload.status ?? status,
                  adminReply: payload.adminReply ?? ticket.adminReply,
                  adminRepliedAt: payload.adminRepliedAt ?? ticket.adminRepliedAt,
                }
              : ticket,
          ),
        );
        setSelectedTicket((current) =>
          current?.id === ticketId
            ? {
                ...current,
                status: payload.status ?? status,
                adminReply: payload.adminReply ?? current.adminReply,
                adminRepliedAt: payload.adminRepliedAt ?? current.adminRepliedAt,
              }
            : current,
        );
        setTicketActionFeedback(
          payload.status === "under_review" || payload.status === "in_progress"
            ? "Ticket moved to under review."
            : payload.status === "closed"
              ? "Ticket closed."
              : "Ticket reopened.",
        );
      } catch (error) {
        setTicketActionFeedback(
          error instanceof Error ? error.message : "Ticket status could not be updated.",
        );
      } finally {
        setIsTicketActionLoading(false);
      }
    },
    [dashboard?.tickets, getAdminAccessToken, updateDashboardTickets],
  );

  const handleDeleteTicket = useCallback(
    async (ticketId: string) => {
      setIsTicketActionLoading(true);
      setTicketActionFeedback("");

      try {
        const accessToken = await getAdminAccessToken();
        const response = await fetch(`/api/admin/tickets/${ticketId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Ticket could not be deleted.");
        }

        updateDashboardTickets(
          (dashboard?.tickets ?? []).filter((ticket) => ticket.id !== ticketId),
        );
        setSelectedTicket((current) => (current?.id === ticketId ? null : current));
        setTicketActionFeedback("Ticket deleted.");
      } catch (error) {
        setTicketActionFeedback(
          error instanceof Error ? error.message : "Ticket could not be deleted.",
        );
      } finally {
        setIsTicketActionLoading(false);
      }
    },
    [dashboard?.tickets, getAdminAccessToken, updateDashboardTickets],
  );

  const handleSendAdminReply = useCallback(async () => {
    if (!selectedTicket) {
      return;
    }
    const text = adminReplyDraft.trim();
    if (!text) {
      setTicketActionFeedback("Write a reply before sending.");
      return;
    }

    setIsTicketActionLoading(true);
    setTicketActionFeedback("");

    try {
      const accessToken = await getAdminAccessToken();
      const response = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ adminReply: text }),
      });
      const payload = (await response.json()) as {
        error?: string;
        adminReply?: string | null;
        adminRepliedAt?: string | null;
        status?: DashboardTicketRow["status"];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Reply could not be saved.");
      }

      const nextReply = payload.adminReply ?? text;
      const nextAt = payload.adminRepliedAt ?? new Date().toISOString();

      const merge = (ticket: DashboardTicketRow): DashboardTicketRow => ({
        ...ticket,
        adminReply: nextReply,
        adminRepliedAt: nextAt,
        status: payload.status ?? ticket.status,
      });

      setSelectedTicket((current) => (current?.id === selectedTicket.id ? merge(current) : current));
      updateDashboardTickets(
        (dashboard?.tickets ?? []).map((ticket) =>
          ticket.id === selectedTicket.id ? merge(ticket) : ticket,
        ),
      );
      setAdminReplyDraft("");
      setTicketActionFeedback("Reply saved. The user will see it under Settings → My tickets.");
    } catch (error) {
      setTicketActionFeedback(
        error instanceof Error ? error.message : "Reply could not be saved.",
      );
    } finally {
      setIsTicketActionLoading(false);
    }
  }, [
    adminReplyDraft,
    dashboard?.tickets,
    getAdminAccessToken,
    selectedTicket,
    updateDashboardTickets,
  ]);

  const handleUpdateSubscription = useCallback(
    async (
      userId: string,
      payload: { subscriptionTier?: "free" | "pro"; adminModeSimulatePro?: boolean },
    ) => {
      setSubscriptionSavingUserId(userId);
      setSubscriptionActionState(null);
      try {
        const accessToken = await getAdminAccessToken();
        const response = await fetch(`/api/admin/subscriptions/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });
        const body = (await response.json()) as { error?: string };
        if (!response.ok) {
          throw new Error(body.error ?? "Subscription update failed.");
        }

        setDashboard((current) => {
          if (!current) {
            return current;
          }
          const nextUsers = current.userRows.map((row) => {
            if (row.id !== userId) {
              return row;
            }
            const subscriptionTier = payload.subscriptionTier ?? row.subscriptionTier;
            const adminModeSimulatePro =
              typeof payload.adminModeSimulatePro === "boolean"
                ? payload.adminModeSimulatePro
                : row.adminModeSimulatePro;
            const effectiveSubscriptionTier: DashboardUserRow["effectiveSubscriptionTier"] =
              adminModeSimulatePro || subscriptionTier === "pro" ? "pro" : "free";
            return {
              ...row,
              subscriptionTier,
              adminModeSimulatePro,
              effectiveSubscriptionTier,
            };
          });
          const proUsers = nextUsers.filter(
            (row) => row.effectiveSubscriptionTier === "pro",
          ).length;
          return {
            ...current,
            userRows: nextUsers,
            stats: {
              ...current.stats,
              proUsers,
            },
          };
        });
        setSubscriptionActionState({
          userId,
          message: "Subscription updated.",
          isError: false,
        });
      } catch (error) {
        setSubscriptionActionState({
          userId,
          message:
            error instanceof Error ? error.message : "Subscription update failed.",
          isError: true,
        });
      } finally {
        setSubscriptionSavingUserId(null);
      }
    },
    [getAdminAccessToken],
  );

  const handleLogout = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    setDashboard(null);
    setDashboardError("");
    setSelectedTicket(null);
    setIsTicketActionLoading(false);
    setTicketActionFeedback("");
    setSubscriptionActionState(null);
    setUserPendingDelete(null);
    setUserDeleteError("");
    setCurrentAdminUserId(null);
    setAdminGate("sign_in");
  }, []);

  const handleConfirmDeleteUser = useCallback(async () => {
    if (!userPendingDelete) {
      return;
    }

    if (userPendingDelete.id === currentAdminUserId) {
      setUserDeleteError("You cannot delete your own account.");
      return;
    }

    setIsDeletingUser(true);
    setUserDeleteError("");

    try {
      const accessToken = await getAdminAccessToken();
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userPendingDelete.id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "User could not be deleted.");
      }

      setUserPendingDelete(null);
      await loadDashboard();
    } catch (error) {
      setUserDeleteError(error instanceof Error ? error.message : "User could not be deleted.");
    } finally {
      setIsDeletingUser(false);
    }
  }, [userPendingDelete, currentAdminUserId, getAdminAccessToken, loadDashboard]);

  const handleRetryAccess = useCallback(async () => {
    setDashboardError("");
    setAdminGate("booting");
    const ok = await loadDashboard();
    if (ok) {
      setAdminGate("ready");
      setActiveTab("overview");
    } else {
      setAdminGate("forbidden");
    }
  }, [loadDashboard]);

  const dashboardStats = dashboard?.stats;
  const userRows = dashboard?.userRows ?? [];
  const recentSwipes = dashboard?.recentSwipes ?? [];
  const recentTickets = dashboard?.tickets ?? [];
  const ticketsUnavailable = dashboard?.ticketsUnavailable ?? false;
  const previewTickets = recentTickets.slice(0, 6);
  const previewSwipes = recentSwipes.slice(0, 6);

  const ticketPriorityLabel = useMemo(
    () =>
      ({
        low: "Low",
        normal: "Normal",
        high: "High",
      }) as const,
    [],
  );
  const ticketStatusLabel = useMemo(
    () =>
      ({
        open: "Open",
        in_progress: "In progress",
        under_review: "Under review",
        closed: "Closed",
      }) as const,
    [],
  );

  const shell = isDarkMode
    ? "min-h-screen bg-[radial-gradient(circle_at_10%_15%,rgba(129,140,248,0.2),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(236,72,153,0.18),transparent_30%),linear-gradient(180deg,#080916_0%,#0b1020_42%,#05060f_100%)] text-slate-100"
    : "min-h-screen bg-[radial-gradient(circle_at_8%_12%,rgba(99,102,241,0.2),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(236,72,153,0.15),transparent_28%),linear-gradient(180deg,#f9fbff_0%,#eef4ff_42%,#e9ecff_100%)] text-slate-900";
  const glassPanel = isDarkMode
    ? "border-white/15 bg-white/[0.06] backdrop-blur-xl shadow-[0_24px_60px_rgba(2,8,24,0.45)]"
    : "border-white/70 bg-white/75 backdrop-blur-xl shadow-[0_24px_60px_rgba(15,23,42,0.14)]";
  const softText = isDarkMode ? "text-slate-300" : "text-slate-600";

  if (adminGate !== "ready") {
    return (
      <main className={shell}>
        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
          {adminGate === "booting" ? (
            <section
              className={`w-full rounded-[30px] border p-8 text-center ${glassPanel}`}
              role="status"
              aria-live="polite"
              aria-label="Checking session"
            >
              <div
                className={`mx-auto h-10 w-10 animate-spin rounded-full border-2 border-t-transparent ${
                  isDarkMode ? "border-white/20 border-t-violet-300" : "border-slate-200 border-t-violet-600"
                }`}
                aria-hidden
              />
              <p className={`mt-4 text-sm font-medium ${softText}`}>Checking your session…</p>
            </section>
          ) : null}

          {adminGate === "sign_in" ? (
            <section className={`w-full rounded-[30px] border p-6 ${glassPanel}`}>
              <h1 className="text-2xl font-bold">Admin Desktop</h1>
              <p className={`mt-2 text-sm leading-relaxed ${softText}`}>
                No Supabase session was found in this browser. The admin API only accepts a{" "}
                <strong className="text-slate-200">cloud (Supabase) sign-in</strong> — not the offline / browser-only
                demo login.
              </p>
              <ol
                className={`mt-4 list-inside list-decimal space-y-2 text-sm leading-relaxed ${softText}`}
              >
                <li>
                  On the home page, sign in with email and password (or OAuth) so your session is stored for this
                  domain.
                </li>
                <li>
                  After you are signed in, open this admin entry URL again (the hidden path that rewrites to admin).
                </li>
                <li>
                  Your user must be allowlisted on the server:{" "}
                  <span className="font-mono text-[11px]">ADMIN_EMAILS</span>,{" "}
                  <span className="font-mono text-[11px]">ADMIN_USER_IDS</span>, or Supabase{" "}
                  <span className="font-mono text-[11px]">app_metadata.role=admin</span>. Redeploy after changing env
                  vars on Vercel.
                </li>
              </ol>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link href="/" className="ui-btn ui-btn-primary w-full text-center sm:w-auto">
                  Open CineMatch (sign in)
                </Link>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary w-full sm:w-auto"
                  onClick={() => void handleRecheckSession()}
                >
                  I signed in — check again
                </button>
              </div>
            </section>
          ) : null}

          {adminGate === "forbidden" ? (
            <section className={`w-full rounded-[30px] border p-6 ${glassPanel}`}>
              <h1 className="text-2xl font-bold">Admin access denied</h1>
              <p className={`mt-2 text-sm ${softText}`}>
                You are signed in, but this session is not authorized for the admin dashboard.
              </p>
              {dashboardError ? (
                <p
                  className={`mt-4 rounded-[14px] border px-3 py-2 text-sm ${
                    isDarkMode
                      ? "border-rose-500/35 bg-rose-500/10 text-rose-200"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {dashboardError}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary w-full sm:w-auto"
                  onClick={() => void handleRetryAccess()}
                >
                  Try again
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary w-full sm:w-auto"
                  onClick={() => void handleLogout()}
                >
                  Sign out
                </button>
                <Link href="/" className="ui-btn ui-btn-primary w-full text-center sm:w-auto">
                  Home
                </Link>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className={shell}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
        {selectedTicket ? (
          <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/45 backdrop-blur-md">
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                setSelectedTicket(null);
                setTicketActionFeedback("");
              }}
              className="absolute inset-0 cursor-default bg-transparent"
            />
            <div
              className={`relative z-10 mx-auto flex max-h-[88vh] w-[min(94vw,980px)] flex-col overflow-hidden rounded-[30px] border shadow-[0_30px_90px_rgba(15,23,42,0.28)] ${
                isDarkMode
                  ? "border-white/12 bg-slate-950 text-slate-100"
                  : "border-slate-200/90 bg-white text-slate-900"
              }`}
            >
              <span className="ui-modal-accent-bar" aria-hidden />
              <div
                className={`flex items-start gap-3 border-b px-6 py-5 ${
                  isDarkMode ? "border-white/10 bg-white/[0.02]" : "border-slate-200/90 bg-slate-50/70"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${softText}`}>
                    Support ticket
                  </p>
                  <p className="mt-1 text-xl font-bold leading-tight text-inherit">{selectedTicket.subject}</p>
                  <p className={`mt-2 text-xs ${softText}`}>
                    {selectedTicket.userName} ({selectedTicket.userId}) • {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`text-xs ${softText}`}>User email:</span>
                    {selectedTicket.userEmail ? (
                      <a
                        href={`mailto:${selectedTicket.userEmail}`}
                        className="text-xs font-semibold text-violet-400 hover:opacity-80"
                      >
                        {selectedTicket.userEmail}
                      </a>
                    ) : (
                      <span className={`text-xs ${softText}`}>Not available</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTicket(null);
                    setTicketActionFeedback("");
                  }}
                  aria-label="Close"
                  className={`ui-shell-close shrink-0 ${
                    isDarkMode ? "bg-white/10 text-slate-200" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ui-icon-md ui-icon-stroke" aria-hidden>
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                  <div
                    className={`rounded-[16px] border px-3 py-2 ${
                      isDarkMode ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className={softText}>Ticket ID</p>
                    <p className="mt-1 font-semibold text-inherit">{selectedTicket.id}</p>
                  </div>
                  <div
                    className={`rounded-[16px] border px-3 py-2 ${
                      isDarkMode ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className={softText}>Priority</p>
                    <p className="mt-1 font-semibold text-inherit">{ticketPriorityLabel[selectedTicket.priority]}</p>
                  </div>
                  <div
                    className={`rounded-[16px] border px-3 py-2 ${
                      selectedTicket.status === "closed"
                        ? isDarkMode
                          ? "border-emerald-400/30 bg-emerald-500/10"
                          : "border-emerald-200 bg-emerald-50"
                        : selectedTicket.status === "open"
                          ? isDarkMode
                            ? "border-amber-400/30 bg-amber-500/10"
                            : "border-amber-200 bg-amber-50"
                          : isDarkMode
                            ? "border-violet-400/30 bg-violet-500/10"
                            : "border-violet-200 bg-violet-50"
                    }`}
                  >
                    <p className={softText}>Status</p>
                    <p className="mt-1 font-semibold text-inherit">{ticketStatusLabel[selectedTicket.status]}</p>
                  </div>
                </div>

                <div
                  className={`min-h-[120px] rounded-[18px] border p-4 text-sm leading-7 ${
                    isDarkMode ? "border-white/10 bg-white/[0.03] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {selectedTicket.message}
                </div>

                {selectedTicket.adminReply ? (
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${softText}`}>
                      Current reply (user-visible)
                    </p>
                    <div
                      className={`mt-2 rounded-[18px] border p-4 text-sm leading-7 ${
                        isDarkMode
                          ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-50"
                          : "border-emerald-200/90 bg-emerald-50 text-emerald-900"
                      }`}
                    >
                      {selectedTicket.adminReply}
                    </div>
                    {selectedTicket.adminRepliedAt ? (
                      <p className={`mt-1 text-[11px] ${softText}`}>
                        Sent {new Date(selectedTicket.adminRepliedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <label htmlFor="admin-ticket-reply" className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${softText}`}>
                    Reply to user
                  </label>
                  <textarea
                    id="admin-ticket-reply"
                    value={adminReplyDraft}
                    onChange={(event) => setAdminReplyDraft(event.target.value)}
                    rows={5}
                    placeholder="Type a reply. It replaces any previous reply and shows in the user’s My tickets page."
                    className={`mt-2 w-full resize-y rounded-[16px] border px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
                      isDarkMode
                        ? "border-white/14 bg-white/[0.06] text-slate-100 placeholder:text-slate-500"
                        : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSendAdminReply()}
                    disabled={isTicketActionLoading}
                    className="ui-btn ui-btn-primary mt-3 w-full disabled:opacity-60"
                  >
                    {isTicketActionLoading ? "Sending…" : "Send reply"}
                  </button>
                </div>

                {ticketActionFeedback ? (
                  <p
                    className={`rounded-[14px] border px-3 py-2 text-sm ${
                      ticketActionFeedback.includes("could not") ||
                      ticketActionFeedback.includes("Invalid") ||
                      ticketActionFeedback.includes("not found")
                        ? isDarkMode
                          ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                        : isDarkMode
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {ticketActionFeedback}
                  </p>
                ) : null}
              </div>

              <div
                className={`grid grid-cols-1 gap-2 border-t px-6 py-4 sm:grid-cols-3 ${
                  isDarkMode ? "border-white/10 bg-slate-950/95" : "border-slate-200 bg-white/95"
                }`}
              >
                <button
                  type="button"
                  onClick={() => void handleUpdateTicketStatus(selectedTicket.id, "under_review")}
                  disabled={isTicketActionLoading || selectedTicket.status === "under_review"}
                  className="ui-btn ui-btn-secondary w-full disabled:opacity-60"
                >
                  Mark under review
                </button>
                <button
                  type="button"
                  onClick={() => void handleUpdateTicketStatus(selectedTicket.id, "closed")}
                  disabled={isTicketActionLoading || selectedTicket.status === "closed"}
                  className="ui-btn ui-btn-secondary w-full disabled:opacity-60"
                >
                  Close ticket
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteTicket(selectedTicket.id)}
                  disabled={isTicketActionLoading}
                  className="ui-btn ui-btn-danger w-full disabled:opacity-60"
                >
                  Delete ticket
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {userPendingDelete ? (
          <div className="ui-overlay z-[calc(var(--z-modal-backdrop)+1)] bg-slate-950/55 backdrop-blur-md">
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                if (!isDeletingUser) {
                  setUserPendingDelete(null);
                  setUserDeleteError("");
                }
              }}
              className="absolute inset-0 cursor-default bg-transparent"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-delete-user-title"
              className={`relative z-10 mx-auto w-[min(92vw,440px)] overflow-hidden rounded-[24px] border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${
                isDarkMode
                  ? "border-rose-500/25 bg-slate-950 text-slate-100"
                  : "border-rose-200/90 bg-white text-slate-900"
              }`}
            >
              <h2 id="admin-delete-user-title" className="text-lg font-bold text-rose-300">
                Delete user permanently?
              </h2>
              <p className={`mt-2 text-sm leading-relaxed ${softText}`}>
                This removes the Supabase Auth account{" "}
                <strong className={isDarkMode ? "text-white" : "text-slate-900"}>{userPendingDelete.email}</strong> (
                {userPendingDelete.name}). Profile, settings, swipes, links, invites, and related rows are removed via
                database cascades. Profile photos in storage are deleted first. This cannot be undone.
              </p>
              {userDeleteError ? (
                <p
                  className={`mt-3 rounded-[12px] border px-3 py-2 text-sm ${
                    isDarkMode
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {userDeleteError}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={isDeletingUser}
                  onClick={() => {
                    setUserPendingDelete(null);
                    setUserDeleteError("");
                  }}
                  className="ui-btn ui-btn-secondary w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingUser || userPendingDelete.id === currentAdminUserId}
                  onClick={() => void handleConfirmDeleteUser()}
                  className="ui-btn ui-btn-danger w-full sm:w-auto disabled:opacity-50"
                >
                  {isDeletingUser ? "Deleting…" : "Delete user"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className={`mb-6 rounded-[30px] border p-5 sm:p-6 ${glassPanel}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">CineMatch Admin Desktop</h1>
              <p className={`mt-1 text-sm ${softText}`}>
                Fixed loading loop and redesigned with cleaner iOS-style sections.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  void loadDashboard({ keepOldData: true })
                }
                className="ui-btn ui-btn-secondary"
                disabled={isLoadingDashboard}
              >
                {isLoadingDashboard ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="ui-btn ui-btn-secondary"
              >
                Log out
              </button>
            </div>
          </div>

          <div
            className={`mt-4 inline-flex flex-wrap gap-2 rounded-full border p-1 ${
              isDarkMode ? "border-white/15 bg-white/[0.04]" : "border-white/80 bg-white/70"
            }`}
          >
            <AdminTabButton
              label="Overview"
              isActive={activeTab === "overview"}
              isDarkMode={isDarkMode}
              onClick={() => setActiveTab("overview")}
            />
            <AdminTabButton
              label="Tickets"
              isActive={activeTab === "tickets"}
              isDarkMode={isDarkMode}
              onClick={() => setActiveTab("tickets")}
            />
            <AdminTabButton
              label="Users"
              isActive={activeTab === "users"}
              isDarkMode={isDarkMode}
              onClick={() => setActiveTab("users")}
            />
            <AdminTabButton
              label="Swipes"
              isActive={activeTab === "swipes"}
              isDarkMode={isDarkMode}
              onClick={() => setActiveTab("swipes")}
            />
            <AdminTabButton
              label="Subscriptions"
              isActive={activeTab === "subscriptions"}
              isDarkMode={isDarkMode}
              onClick={() => setActiveTab("subscriptions")}
            />
          </div>
        </div>

        {dashboardError ? (
          <p
            className={`mb-4 rounded-[14px] border px-4 py-3 text-sm ${
              isDarkMode
                ? "border-rose-500/35 bg-rose-500/15 text-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {dashboardError}
          </p>
        ) : null}

        {ticketsUnavailable ? (
          <p className="mb-4 rounded-[14px] border border-amber-400/35 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
            Ticket table is not initialized yet. Dashboard still loads, but tickets stay hidden
            until the latest Supabase migration is applied.
          </p>
        ) : null}

        {!dashboardStats ? (
          <section className={`mb-6 rounded-[24px] border px-4 py-6 text-center text-sm ${glassPanel}`}>
            Loading dashboard data...
          </section>
        ) : null}

        {activeTab === "overview" ? (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Users" value={dashboardStats?.users ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Movies" value={dashboardStats?.movies ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Swipes" value={dashboardStats?.swipes ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Watched" value={dashboardStats?.watchedEntries ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Accepted swipes" value={dashboardStats?.acceptedSwipes ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Rejected swipes" value={dashboardStats?.rejectedSwipes ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Accepted links" value={dashboardStats?.acceptedLinks ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Open tickets" value={dashboardStats?.openTickets ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Pro users" value={dashboardStats?.proUsers ?? 0} isDarkMode={isDarkMode} />
            </div>

            <section className={`mb-6 overflow-hidden rounded-[24px] border ${glassPanel}`}>
              <div
                className={`flex items-center justify-between border-b px-4 py-3 ${
                  isDarkMode ? "border-white/10" : "border-slate-200/60"
                }`}
              >
                <h2 className="text-lg font-semibold">Recent Tickets</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("tickets")}
                  className="text-sm font-semibold text-violet-500 hover:opacity-80"
                >
                  View all
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className={isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-50/70 text-slate-600"}>
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">User</th>
                      <th className="px-4 py-2 text-left font-semibold">Subject</th>
                      <th className="px-4 py-2 text-left font-semibold">Priority</th>
                      <th className="px-4 py-2 text-left font-semibold">Status</th>
                      <th className="px-4 py-2 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewTickets.length === 0 ? (
                      <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                        <td colSpan={5} className="px-4 py-4 text-center">
                          No support tickets yet.
                        </td>
                      </tr>
                    ) : (
                      previewTickets.map((ticket) => (
                        <tr key={ticket.id} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                          <td className="px-4 py-2">{ticket.userName}</td>
                          <td className="px-4 py-2 font-medium">{ticket.subject}</td>
                          <td className="px-4 py-2">{ticketPriorityLabel[ticket.priority]}</td>
                          <td className="px-4 py-2">{ticketStatusLabel[ticket.status]}</td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setTicketActionFeedback("");
                              }}
                              className="text-sm font-semibold text-violet-400 hover:opacity-80"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`overflow-hidden rounded-[24px] border ${glassPanel}`}>
              <div
                className={`flex items-center justify-between border-b px-4 py-3 ${
                  isDarkMode ? "border-white/10" : "border-slate-200/60"
                }`}
              >
                <h2 className="text-lg font-semibold">Recent Swipes</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("swipes")}
                  className="text-sm font-semibold text-violet-500 hover:opacity-80"
                >
                  View all
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className={isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-50/70 text-slate-600"}>
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">User</th>
                      <th className="px-4 py-2 text-left font-semibold">Movie</th>
                      <th className="px-4 py-2 text-left font-semibold">Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewSwipes.length === 0 ? (
                      <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                        <td colSpan={3} className="px-4 py-4 text-center">
                          No swipe activity yet.
                        </td>
                      </tr>
                    ) : (
                      previewSwipes.map((swipe, index) => (
                        <tr key={`${swipe.userId}-${swipe.movieId}-${index}`} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                          <td className="px-4 py-2">{swipe.userName}</td>
                          <td className="px-4 py-2">{swipe.movieTitle}</td>
                          <td className="px-4 py-2">{swipe.decision}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {activeTab === "users" ? (
          <section className={`overflow-hidden rounded-[24px] border ${glassPanel}`}>
            <div
              className={`border-b px-4 py-3 ${
                isDarkMode ? "border-white/10" : "border-slate-200/60"
              }`}
            >
              <h2 className="text-lg font-semibold">Users</h2>
              <p className={`mt-1 text-xs ${softText}`}>
                Delete removes the auth user; linked data is cleaned up by database cascades.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-50/70 text-slate-600"}>
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Name</th>
                    <th className="px-4 py-2 text-left font-semibold">Email</th>
                    <th className="px-4 py-2 text-right font-semibold">Accepted</th>
                    <th className="px-4 py-2 text-right font-semibold">Rejected</th>
                    <th className="px-4 py-2 text-right font-semibold">Links</th>
                    <th className="px-4 py-2 text-left font-semibold">Plan</th>
                    <th className="px-4 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userRows.map((row) => (
                    <tr key={row.id} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                      <td className="px-4 py-2 font-medium">{row.name}</td>
                      <td className="px-4 py-2">{row.email}</td>
                      <td className="px-4 py-2 text-right">{row.accepted}</td>
                      <td className="px-4 py-2 text-right">{row.rejected}</td>
                      <td className="px-4 py-2 text-right">{row.links}</td>
                      <td className="px-4 py-2">
                        <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-xs font-semibold text-violet-200">
                          {row.effectiveSubscriptionTier.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          disabled={row.id === currentAdminUserId || isDeletingUser}
                          onClick={() => {
                            setUserDeleteError("");
                            setUserPendingDelete(row);
                          }}
                          className="text-xs font-semibold text-rose-400 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {userRows.length === 0 ? (
                    <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                      <td colSpan={7} className="px-4 py-4 text-center">
                        No users found in database.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "tickets" ? (
          <section className={`overflow-hidden rounded-[24px] border ${glassPanel}`}>
            <div
              className={`border-b px-4 py-3 ${
                isDarkMode ? "border-white/10" : "border-slate-200/60"
              }`}
            >
              <h2 className="text-lg font-semibold">Support Tickets</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-50/70 text-slate-600"}>
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Time</th>
                    <th className="px-4 py-2 text-left font-semibold">User</th>
                    <th className="px-4 py-2 text-left font-semibold">Subject</th>
                    <th className="px-4 py-2 text-left font-semibold">Message</th>
                    <th className="px-4 py-2 text-left font-semibold">Priority</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                    <th className="px-4 py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.length === 0 ? (
                    <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                      <td colSpan={7} className="px-4 py-4 text-center">
                        No support tickets yet.
                      </td>
                    </tr>
                  ) : (
                    recentTickets.map((ticket) => (
                      <tr key={ticket.id} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                        <td className="px-4 py-2">{new Date(ticket.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2">{ticket.userName}</td>
                        <td className="px-4 py-2 font-medium">{ticket.subject}</td>
                        <td className="px-4 py-2">
                          <span className="line-clamp-2">{ticket.message}</span>
                        </td>
                        <td className="px-4 py-2">{ticketPriorityLabel[ticket.priority]}</td>
                        <td className="px-4 py-2">{ticketStatusLabel[ticket.status]}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setTicketActionFeedback("");
                            }}
                            className="text-sm font-semibold text-violet-400 hover:opacity-80"
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "swipes" ? (
          <section className={`overflow-hidden rounded-[24px] border ${glassPanel}`}>
            <div
              className={`border-b px-4 py-3 ${
                isDarkMode ? "border-white/10" : "border-slate-200/60"
              }`}
            >
              <h2 className="text-lg font-semibold">Recent Swipes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-50/70 text-slate-600"}>
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Time</th>
                    <th className="px-4 py-2 text-left font-semibold">User</th>
                    <th className="px-4 py-2 text-left font-semibold">Movie</th>
                    <th className="px-4 py-2 text-left font-semibold">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSwipes.length === 0 ? (
                    <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                      <td colSpan={4} className="px-4 py-4 text-center">
                        No swipe activity yet.
                      </td>
                    </tr>
                  ) : (
                    recentSwipes.map((swipe, index) => (
                      <tr key={`${swipe.userId}-${swipe.movieId}-${index}`} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                        <td className="px-4 py-2">{new Date(swipe.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2">{swipe.userName}</td>
                        <td className="px-4 py-2">{swipe.movieTitle}</td>
                        <td className="px-4 py-2">{swipe.decision}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "subscriptions" ? (
          <section className={`overflow-hidden rounded-[24px] border ${glassPanel}`}>
            <div
              className={`border-b px-4 py-3 ${
                isDarkMode ? "border-white/10" : "border-slate-200/60"
              }`}
            >
              <h2 className="text-lg font-semibold">Subscription Management</h2>
              <p className={`mt-1 text-xs ${softText}`}>
                Set Free/Pro and optionally simulate active Pro for test accounts.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-50/70 text-slate-600"}>
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">User</th>
                    <th className="px-4 py-2 text-left font-semibold">Email</th>
                    <th className="px-4 py-2 text-left font-semibold">Current tier</th>
                    <th className="px-4 py-2 text-left font-semibold">Effective access</th>
                    <th className="px-4 py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userRows.map((row) => (
                    <tr key={row.id} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                      <td className="px-4 py-2 font-medium">{row.name}</td>
                      <td className="px-4 py-2">{row.email}</td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.subscriptionTier === "pro"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-slate-500/20 text-slate-200"
                        }`}>
                          {row.subscriptionTier.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.effectiveSubscriptionTier === "pro"
                            ? "bg-violet-500/20 text-violet-100"
                            : "bg-slate-500/20 text-slate-200"
                        }`}>
                          {row.effectiveSubscriptionTier.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleUpdateSubscription(row.id, { subscriptionTier: "free" })}
                            disabled={subscriptionSavingUserId === row.id}
                            className="ui-btn ui-btn-secondary !px-3 !py-1.5 !text-xs"
                          >
                            Set Free
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleUpdateSubscription(row.id, { subscriptionTier: "pro" })}
                            disabled={subscriptionSavingUserId === row.id}
                            className="ui-btn ui-btn-secondary !px-3 !py-1.5 !text-xs"
                          >
                            Set Pro
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleUpdateSubscription(row.id, {
                                adminModeSimulatePro: !row.adminModeSimulatePro,
                              })
                            }
                            disabled={subscriptionSavingUserId === row.id}
                            className="ui-btn ui-btn-secondary !px-3 !py-1.5 !text-xs"
                          >
                            {row.adminModeSimulatePro ? "Disable Sim" : "Enable Sim"}
                          </button>
                        </div>
                        {subscriptionActionState?.userId === row.id ? (
                          <p
                            className={`mt-2 text-xs ${
                              subscriptionActionState.isError
                                ? isDarkMode
                                  ? "text-rose-300"
                                  : "text-rose-700"
                                : isDarkMode
                                  ? "text-emerald-300"
                                  : "text-emerald-700"
                            }`}
                          >
                            {subscriptionActionState.message}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  isDarkMode,
}: {
  label: string;
  value: number;
  isDarkMode: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] border px-4 py-3 backdrop-blur-xl ${
        isDarkMode
          ? "border-white/15 bg-white/[0.06] shadow-[0_18px_40px_rgba(2,8,24,0.35)]"
          : "border-white/80 bg-white/75 shadow-[0_14px_32px_rgba(15,23,42,0.12)]"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.14em] ${
          isDarkMode ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function AdminTabButton({
  label,
  isActive,
  isDarkMode,
  onClick,
}: {
  label: string;
  isActive: boolean;
  isDarkMode: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        isActive
          ? isDarkMode
            ? "bg-violet-500/25 text-violet-100 ring-1 ring-violet-300/40"
            : "bg-violet-500/14 text-violet-700 ring-1 ring-violet-300/55"
          : isDarkMode
            ? "text-slate-300 hover:bg-white/10"
            : "text-slate-600 hover:bg-slate-200/60"
      }`}
    >
      {label}
    </button>
  );
}
