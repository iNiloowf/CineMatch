"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ConversationEntry } from "@/lib/support-ticket-conversation";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ModalPortal } from "@/components/modal-portal";

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
  accountActivated: boolean;
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
  conversation: ConversationEntry[];
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
  const [isDarkMode, setIsDarkMode] = useState(true);
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
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem("cinematch-theme-mode");
    if (stored === "light") {
      setIsDarkMode(false);
      return;
    }
    if (stored === "dark") {
      setIsDarkMode(true);
      return;
    }
    setIsDarkMode(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.documentElement.classList.toggle("theme-dark", isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? "dark" : "light";
    if (document.body) {
      document.body.style.background = isDarkMode ? "#0d0a14" : "#f6f7fb";
      document.body.style.color = isDarkMode ? "#f8fafc" : "#0f172a";
    }
  }, [isDarkMode]);

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
          conversation?: ConversationEntry[];
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
                  conversation: payload.conversation ?? ticket.conversation,
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
                conversation: payload.conversation ?? current.conversation,
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
        conversation?: ConversationEntry[];
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
        conversation: payload.conversation ?? ticket.conversation,
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
          throw new Error(body.error ?? "Access update failed.");
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
          message: "Access flags saved.",
          isError: false,
        });
      } catch (error) {
        setSubscriptionActionState({
          userId,
          message:
            error instanceof Error ? error.message : "Access update failed.",
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
  const adminTabs = useMemo(
    () =>
      [
        { id: "overview" as const, label: "Overview" },
        { id: "tickets" as const, label: "Tickets" },
        { id: "users" as const, label: "Users" },
        { id: "swipes" as const, label: "Swipes" },
        { id: "subscriptions" as const, label: "Access" },
      ] satisfies Array<{ id: AdminTab; label: string }>,
    [],
  );

  const shell = isDarkMode
    ? "min-h-[100dvh] bg-[linear-gradient(180deg,#0a0a12_0%,#0f111a_100%)] text-slate-100"
    : "min-h-[100dvh] bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] text-slate-900";
  const glassPanel = isDarkMode
    ? "border-white/12 bg-white/[0.05] shadow-[var(--elev-card)]"
    : "border-slate-200/90 bg-white/90 shadow-[var(--elev-card)]";
  const softText = isDarkMode ? "text-slate-400" : "text-slate-600";
  const accentLink = isDarkMode
    ? "text-violet-400 hover:text-violet-300"
    : "text-violet-600 hover:text-violet-800";
  const dangerLink = isDarkMode
    ? "text-rose-400 hover:text-rose-300"
    : "text-rose-600 hover:text-rose-700";
  const rowBorder = isDarkMode ? "border-white/10" : "border-slate-200/70";
  const theadClass = isDarkMode ? "bg-white/[0.04] text-slate-400" : "bg-slate-50 text-slate-600";
  const themeAttrs = {
    "data-app-shell-root": "true" as const,
    "data-theme": isDarkMode ? ("dark" as const) : ("light" as const),
  };
  const openTicket = (ticket: DashboardTicketRow) => {
    setSelectedTicket(ticket);
    setTicketActionFeedback("");
  };

  if (adminGate !== "ready") {
    return (
      <main
        className={`${shell} pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]`}
        {...themeAttrs}
      >
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl items-center justify-center px-4 py-8">
          {adminGate === "booting" ? (
            <section
              className={`w-full rounded-[var(--radius-xl)] border p-8 text-center ${glassPanel}`}
              role="status"
              aria-live="polite"
              aria-label="Checking session"
            >
              <div
                className={
                  isDarkMode
                    ? "ui-loading-spinner ui-loading-spinner--on-dark"
                    : "ui-loading-spinner"
                }
                aria-hidden
              />
              <p className={`mt-4 text-sm font-medium ${softText}`}>Checking your session…</p>
            </section>
          ) : null}

          {adminGate === "sign_in" ? (
            <section className={`w-full rounded-[var(--radius-xl)] border p-6 ${glassPanel}`}>
              <h1 className="text-xl font-bold sm:text-2xl">Admin</h1>
              <p className={`mt-2 text-sm leading-relaxed ${softText}`}>
                Sign in with your Supabase account on the home page, then return here. Offline demo login does not
                work for admin.
              </p>
              <p className={`mt-3 text-xs leading-relaxed ${softText}`}>
                Your account must be allowlisted via{" "}
                <span className="font-mono">ADMIN_EMAILS</span>,{" "}
                <span className="font-mono">ADMIN_USER_IDS</span>, or{" "}
                <span className="font-mono">app_metadata.role=admin</span>.
              </p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link href="/" className="ui-btn ui-btn-primary w-full text-center sm:w-auto">
                  Sign in
                </Link>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary w-full sm:w-auto"
                  onClick={() => void handleRecheckSession()}
                >
                  Check again
                </button>
              </div>
            </section>
          ) : null}

          {adminGate === "forbidden" ? (
            <section className={`w-full rounded-[var(--radius-xl)] border p-6 ${glassPanel}`}>
              <h1 className="text-xl font-bold sm:text-2xl">Access denied</h1>
              <p className={`mt-2 text-sm ${softText}`}>
                This account is not authorized for admin.
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
    <main
      className={`${shell} pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]`}
      {...themeAttrs}
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:py-6 lg:px-6">
        <ModalPortal open={Boolean(selectedTicket)}>
          {selectedTicket ? (
          <div className="ui-overlay z-[var(--z-modal-backdrop)] bg-slate-950/50 backdrop-blur-sm p-0 sm:p-4">
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
              className={`relative z-10 mx-auto flex h-[100dvh] w-full max-w-none flex-col overflow-hidden border-0 shadow-none sm:h-auto sm:max-h-[min(88dvh,900px)] sm:w-[min(94vw,720px)] sm:rounded-[var(--radius-xl)] sm:border sm:shadow-[var(--elev-modal)] ${
                isDarkMode
                  ? "sm:border-white/12 bg-slate-950 text-slate-100"
                  : "sm:border-slate-200 bg-white text-slate-900"
              }`}
            >
              <div
                className={`flex items-start gap-3 border-b px-4 py-4 sm:px-5 ${
                  isDarkMode ? "border-white/10" : "border-slate-200"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold leading-snug sm:text-lg">{selectedTicket.subject}</p>
                  <p className={`mt-1 text-xs ${softText}`}>
                    {selectedTicket.userName} · {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                  {selectedTicket.userEmail ? (
                    <a
                      href={`mailto:${selectedTicket.userEmail}`}
                      className={`mt-1 inline-block text-xs font-medium ${accentLink}`}
                    >
                      {selectedTicket.userEmail}
                    </a>
                  ) : null}
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

              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="flex flex-wrap gap-2 text-xs">
                  <AdminBadge isDarkMode={isDarkMode} tone="neutral">
                    {ticketPriorityLabel[selectedTicket.priority]}
                  </AdminBadge>
                  <AdminBadge
                    isDarkMode={isDarkMode}
                    tone={
                      selectedTicket.status === "closed"
                        ? "success"
                        : selectedTicket.status === "open"
                          ? "warn"
                          : "accent"
                    }
                  >
                    {ticketStatusLabel[selectedTicket.status]}
                  </AdminBadge>
                </div>

                <div className="space-y-3">
                  <div
                    className={`rounded-[var(--radius-lg)] border p-3 text-sm leading-relaxed ${
                      isDarkMode ? "border-white/10 bg-white/[0.03]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className={`text-[10px] font-semibold uppercase tracking-wide ${softText}`}>User</p>
                    <p className="mt-1 whitespace-pre-wrap">{selectedTicket.message}</p>
                    <p className={`mt-2 text-[11px] ${softText}`}>
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {(selectedTicket.conversation.length > 0
                    ? selectedTicket.conversation
                    : selectedTicket.adminReply
                      ? [
                          {
                            from: "admin" as const,
                            body: selectedTicket.adminReply,
                            at: selectedTicket.adminRepliedAt ?? selectedTicket.createdAt,
                          },
                        ]
                      : []
                  ).map((entry, index) => (
                    <div
                      key={`${entry.at}-${index}`}
                      className={`rounded-[var(--radius-lg)] border p-3 text-sm leading-relaxed ${
                        entry.from === "admin"
                          ? isDarkMode
                            ? "border-emerald-400/20 bg-emerald-500/10"
                            : "border-emerald-200 bg-emerald-50"
                          : isDarkMode
                            ? "border-white/10 bg-white/[0.03]"
                            : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${softText}`}>
                        {entry.from === "admin" ? "You (admin)" : "User"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{entry.body}</p>
                      <p className={`mt-2 text-[11px] ${softText}`}>{new Date(entry.at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <label htmlFor="admin-ticket-reply" className={`text-xs font-medium ${softText}`}>
                    Reply
                  </label>
                  <textarea
                    id="admin-ticket-reply"
                    value={adminReplyDraft}
                    onChange={(event) => setAdminReplyDraft(event.target.value)}
                    rows={4}
                    placeholder="Write a reply to the user…"
                    className={`mt-1.5 w-full resize-y rounded-[var(--radius-lg)] border px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
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
                className={`grid grid-cols-1 gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:grid-cols-3 sm:px-5 ${
                  isDarkMode ? "border-white/10" : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => void handleUpdateTicketStatus(selectedTicket.id, "under_review")}
                  disabled={isTicketActionLoading || selectedTicket.status === "under_review"}
                  className="ui-btn ui-btn-secondary w-full !py-2.5 text-sm disabled:opacity-60"
                >
                  Under review
                </button>
                <button
                  type="button"
                  onClick={() => void handleUpdateTicketStatus(selectedTicket.id, "closed")}
                  disabled={isTicketActionLoading || selectedTicket.status === "closed"}
                  className="ui-btn ui-btn-secondary w-full !py-2.5 text-sm disabled:opacity-60"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteTicket(selectedTicket.id)}
                  disabled={isTicketActionLoading}
                  className="ui-btn ui-btn-danger w-full !py-2.5 text-sm disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
          ) : null}
        </ModalPortal>

        <ModalPortal open={Boolean(userPendingDelete)}>
        {userPendingDelete ? (
          <div className="ui-overlay z-[calc(var(--z-modal-backdrop)+1)] bg-slate-950/50 backdrop-blur-sm p-4">
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
              className={`relative z-10 mx-auto w-full max-w-sm rounded-[var(--radius-xl)] border p-5 shadow-[var(--elev-modal)] ${
                isDarkMode
                  ? "border-rose-500/25 bg-slate-950 text-slate-100"
                  : "border-rose-200 bg-white text-slate-900"
              }`}
            >
              <h2
                id="admin-delete-user-title"
                className={`text-base font-bold sm:text-lg ${isDarkMode ? "text-rose-300" : "text-rose-700"}`}
              >
                Delete user?
              </h2>
              <p className={`mt-2 text-sm leading-relaxed ${softText}`}>
                Permanently delete{" "}
                <strong className={isDarkMode ? "text-white" : "text-slate-900"}>{userPendingDelete.email}</strong>.
                This cannot be undone.
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
        </ModalPortal>

        <header className={`mb-4 rounded-[var(--radius-xl)] border px-4 py-3 sm:px-5 ${glassPanel}`}>
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">Admin</h1>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                onClick={() => {
                  const next = !isDarkMode;
                  setIsDarkMode(next);
                  if (typeof window !== "undefined") {
                    window.localStorage.setItem("cinematch-theme-mode", next ? "dark" : "light");
                  }
                }}
                className="ui-btn ui-btn-secondary !px-2.5 !py-2 text-xs sm:!px-3 sm:text-sm"
              >
                {isDarkMode ? "Light" : "Dark"}
              </button>
              <button
                type="button"
                aria-label="Refresh dashboard"
                onClick={() => void loadDashboard({ keepOldData: true })}
                className="ui-btn ui-btn-secondary !px-2.5 !py-2 text-xs sm:!px-3 sm:text-sm"
                disabled={isLoadingDashboard}
              >
                {isLoadingDashboard ? "…" : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="ui-btn ui-btn-secondary !px-2.5 !py-2 text-xs sm:!px-3 sm:text-sm"
              >
                Out
              </button>
            </div>
          </div>
        </header>

        <nav
          className={`mb-4 flex gap-2 overflow-x-auto rounded-[var(--radius-xl)] border p-2 lg:hidden ${glassPanel}`}
          aria-label="Admin sections"
        >
          {adminTabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? isDarkMode
                      ? "bg-violet-500/25 text-violet-100"
                      : "bg-violet-100 text-violet-800"
                    : isDarkMode
                      ? "text-slate-400 hover:text-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <aside className={`hidden h-fit rounded-[var(--radius-xl)] border p-2 lg:block ${glassPanel}`}>
            <nav className="space-y-0.5" aria-label="Admin sections">
              {adminTabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full rounded-[var(--radius-lg)] px-3 py-2.5 text-left text-sm font-semibold transition ${
                      active
                        ? isDarkMode
                          ? "bg-violet-500/20 text-violet-100"
                          : "bg-violet-50 text-violet-800"
                        : isDarkMode
                          ? "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="min-w-0">
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
          <p
            className={`mb-4 rounded-[14px] border px-4 py-3 text-sm ${
              isDarkMode
                ? "border-amber-400/35 bg-amber-500/15 text-amber-100"
                : "border-amber-300 bg-amber-50 text-amber-900"
            }`}
          >
            Ticket table is not initialized yet. Dashboard still loads, but tickets stay hidden
            until the latest Supabase migration is applied.
          </p>
        ) : null}

        {!dashboardStats ? (
          <section className={`mb-4 rounded-[var(--radius-xl)] border px-4 py-8 text-center text-sm ${glassPanel}`}>
            <div
              className={
                isDarkMode
                  ? "ui-loading-spinner ui-loading-spinner--on-dark mx-auto"
                  : "ui-loading-spinner mx-auto"
              }
              aria-hidden
            />
            <p className={`mt-3 ${softText}`}>Loading…</p>
          </section>
        ) : null}

        {activeTab === "overview" ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <StatCard label="Users" value={dashboardStats?.users ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Swipes" value={dashboardStats?.swipes ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Open tickets" value={dashboardStats?.openTickets ?? 0} isDarkMode={isDarkMode} />
              <StatCard label="Full access" value={dashboardStats?.proUsers ?? 0} isDarkMode={isDarkMode} />
            </div>

            <section className={`overflow-hidden rounded-[var(--radius-xl)] border ${glassPanel}`}>
              <div
                className={`flex items-center justify-between border-b px-4 py-3 ${
                  isDarkMode ? "border-white/10" : "border-slate-200"
                }`}
              >
                <h2 className="text-base font-semibold">Recent tickets</h2>
                {previewTickets.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("tickets")}
                    className={`text-sm font-medium ${accentLink}`}
                  >
                    All
                  </button>
                ) : null}
              </div>

              {previewTickets.length === 0 ? (
                <AdminEmpty softText={softText}>No tickets yet.</AdminEmpty>
              ) : (
                <>
                  <div className={`md:hidden divide-y ${isDarkMode ? "divide-white/10" : "divide-slate-200"}`}>
                    {previewTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => openTicket(ticket)}
                        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:opacity-90"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{ticket.subject}</p>
                          <p className={`mt-0.5 truncate text-xs ${softText}`}>{ticket.userName}</p>
                        </div>
                        <AdminBadge
                          isDarkMode={isDarkMode}
                          tone={ticket.status === "open" ? "warn" : ticket.status === "closed" ? "success" : "accent"}
                        >
                          {ticketStatusLabel[ticket.status]}
                        </AdminBadge>
                      </button>
                    ))}
                  </div>
                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full text-sm">
                      <thead className={theadClass}>
                        <tr>
                          <th className="px-4 py-2.5 text-left font-medium">User</th>
                          <th className="px-4 py-2.5 text-left font-medium">Subject</th>
                          <th className="px-4 py-2.5 text-left font-medium">Status</th>
                          <th className="px-4 py-2.5 text-left font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {previewTickets.map((ticket) => (
                          <tr key={ticket.id} className={`border-t ${rowBorder}`}>
                            <td className="px-4 py-2.5">{ticket.userName}</td>
                            <td className="px-4 py-2.5 font-medium">{ticket.subject}</td>
                            <td className="px-4 py-2.5">{ticketStatusLabel[ticket.status]}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => openTicket(ticket)}
                                className={`text-sm font-medium ${accentLink}`}
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        ) : null}

        {activeTab === "users" ? (
          <section className={`overflow-hidden rounded-[var(--radius-xl)] border ${glassPanel}`}>
            <div
              className={`border-b px-4 py-3 ${
                isDarkMode ? "border-white/10" : "border-slate-200"
              }`}
            >
              <h2 className="text-base font-semibold">Users</h2>
            </div>
            {userRows.length === 0 ? (
              <AdminEmpty softText={softText}>No users found.</AdminEmpty>
            ) : (
              <>
                <div className={`md:hidden divide-y ${isDarkMode ? "divide-white/10" : "divide-slate-200"}`}>
                  {userRows.map((row) => (
                    <div key={row.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.name}</p>
                          <p className={`truncate text-xs ${softText}`}>{row.email}</p>
                        </div>
                        <AdminBadge isDarkMode={isDarkMode} tone={row.accountActivated ? "success" : "warn"}>
                          {row.accountActivated ? "Active" : "Pending"}
                        </AdminBadge>
                      </div>
                      <div className={`mt-2 flex items-center justify-between text-xs ${softText}`}>
                        <span>
                          {row.accepted}↑ · {row.rejected}↓ · {row.links} links
                        </span>
                        <button
                          type="button"
                          disabled={row.id === currentAdminUserId || isDeletingUser}
                          onClick={() => {
                            setUserDeleteError("");
                            setUserPendingDelete(row);
                          }}
                          className={`font-medium disabled:opacity-40 ${dangerLink}`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-sm">
                    <thead className={theadClass}>
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium">Name</th>
                        <th className="px-4 py-2.5 text-left font-medium">Email</th>
                        <th className="px-4 py-2.5 text-right font-medium">Swipes</th>
                        <th className="px-4 py-2.5 text-left font-medium">Status</th>
                        <th className="px-4 py-2.5 text-right font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {userRows.map((row) => (
                        <tr key={row.id} className={`border-t ${rowBorder}`}>
                          <td className="px-4 py-2.5 font-medium">{row.name}</td>
                          <td className="px-4 py-2.5">{row.email}</td>
                          <td className={`px-4 py-2.5 text-right text-xs ${softText}`}>
                            {row.accepted} / {row.rejected}
                          </td>
                          <td className="px-4 py-2.5">
                            <AdminBadge isDarkMode={isDarkMode} tone={row.accountActivated ? "success" : "warn"}>
                              {row.accountActivated ? "Active" : "Pending"}
                            </AdminBadge>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              disabled={row.id === currentAdminUserId || isDeletingUser}
                              onClick={() => {
                                setUserDeleteError("");
                                setUserPendingDelete(row);
                              }}
                              className={`text-xs font-medium disabled:opacity-40 ${dangerLink}`}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        ) : null}

        {activeTab === "tickets" ? (
          <section className={`overflow-hidden rounded-[var(--radius-xl)] border ${glassPanel}`}>
            <div
              className={`border-b px-4 py-3 ${
                isDarkMode ? "border-white/10" : "border-slate-200"
              }`}
            >
              <h2 className="text-base font-semibold">Tickets</h2>
            </div>
            {recentTickets.length === 0 ? (
              <AdminEmpty softText={softText}>No tickets yet.</AdminEmpty>
            ) : (
              <>
                <div className={`md:hidden divide-y ${isDarkMode ? "divide-white/10" : "divide-slate-200"}`}>
                  {recentTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => openTicket(ticket)}
                      className="w-full px-4 py-3 text-left transition hover:opacity-90"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">{ticket.subject}</p>
                        <AdminBadge
                          isDarkMode={isDarkMode}
                          tone={ticket.status === "open" ? "warn" : ticket.status === "closed" ? "success" : "accent"}
                        >
                          {ticketStatusLabel[ticket.status]}
                        </AdminBadge>
                      </div>
                      <p className={`mt-1 truncate text-xs ${softText}`}>
                        {ticket.userName} · {new Date(ticket.createdAt).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-sm">
                    <thead className={theadClass}>
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium">Subject</th>
                        <th className="px-4 py-2.5 text-left font-medium">User</th>
                        <th className="px-4 py-2.5 text-left font-medium">Status</th>
                        <th className="px-4 py-2.5 text-left font-medium">Time</th>
                        <th className="px-4 py-2.5 text-left font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {recentTickets.map((ticket) => (
                        <tr key={ticket.id} className={`border-t ${rowBorder}`}>
                          <td className="px-4 py-2.5 font-medium">{ticket.subject}</td>
                          <td className="px-4 py-2.5">{ticket.userName}</td>
                          <td className="px-4 py-2.5">{ticketStatusLabel[ticket.status]}</td>
                          <td className={`px-4 py-2.5 text-xs ${softText}`}>
                            {new Date(ticket.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5">
                            <button
                              type="button"
                              onClick={() => openTicket(ticket)}
                              className={`text-sm font-medium ${accentLink}`}
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        ) : null}

        {activeTab === "swipes" ? (
          <section className={`overflow-hidden rounded-[var(--radius-xl)] border ${glassPanel}`}>
            <div
              className={`border-b px-4 py-3 ${
                isDarkMode ? "border-white/10" : "border-slate-200"
              }`}
            >
              <h2 className="text-base font-semibold">Swipes</h2>
            </div>
            {recentSwipes.length === 0 ? (
              <AdminEmpty softText={softText}>No swipe activity yet.</AdminEmpty>
            ) : (
              <>
                <div className={`md:hidden divide-y ${isDarkMode ? "divide-white/10" : "divide-slate-200"}`}>
                  {recentSwipes.map((swipe, index) => (
                    <div key={`${swipe.userId}-${swipe.movieId}-${index}`} className="px-4 py-3">
                      <p className="text-sm font-medium">{swipe.movieTitle}</p>
                      <p className={`mt-0.5 text-xs ${softText}`}>
                        {swipe.userName} · {swipe.decision} ·{" "}
                        {new Date(swipe.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-sm">
                    <thead className={theadClass}>
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium">Movie</th>
                        <th className="px-4 py-2.5 text-left font-medium">User</th>
                        <th className="px-4 py-2.5 text-left font-medium">Decision</th>
                        <th className="px-4 py-2.5 text-left font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSwipes.map((swipe, index) => (
                        <tr key={`${swipe.userId}-${swipe.movieId}-${index}`} className={`border-t ${rowBorder}`}>
                          <td className="px-4 py-2.5">{swipe.movieTitle}</td>
                          <td className="px-4 py-2.5">{swipe.userName}</td>
                          <td className="px-4 py-2.5 capitalize">{swipe.decision}</td>
                          <td className={`px-4 py-2.5 text-xs ${softText}`}>
                            {new Date(swipe.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        ) : null}

        {activeTab === "subscriptions" ? (
          <section className={`overflow-hidden rounded-[var(--radius-xl)] border ${glassPanel}`}>
            <div
              className={`border-b px-4 py-3 ${
                isDarkMode ? "border-white/10" : "border-slate-200"
              }`}
            >
              <h2 className="text-base font-semibold">Access</h2>
            </div>
            {userRows.length === 0 ? (
              <AdminEmpty softText={softText}>No users found.</AdminEmpty>
            ) : (
              <>
                <div className={`md:hidden divide-y ${isDarkMode ? "divide-white/10" : "divide-slate-200"}`}>
                  {userRows.map((row) => (
                    <div key={row.id} className="space-y-2 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{row.name}</p>
                        <p className={`text-xs ${softText}`}>{row.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <AdminBadge isDarkMode={isDarkMode} tone={row.subscriptionTier === "pro" ? "success" : "neutral"}>
                          {row.subscriptionTier === "pro" ? "Full" : "Standard"}
                        </AdminBadge>
                        {row.adminModeSimulatePro ? (
                          <AdminBadge isDarkMode={isDarkMode} tone="accent">
                            Test override
                          </AdminBadge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleUpdateSubscription(row.id, { subscriptionTier: "free" })}
                          disabled={subscriptionSavingUserId === row.id}
                          className="ui-btn ui-btn-secondary !px-2.5 !py-1.5 !text-xs"
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUpdateSubscription(row.id, { subscriptionTier: "pro" })}
                          disabled={subscriptionSavingUserId === row.id}
                          className="ui-btn ui-btn-secondary !px-2.5 !py-1.5 !text-xs"
                        >
                          Full
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void handleUpdateSubscription(row.id, {
                              adminModeSimulatePro: !row.adminModeSimulatePro,
                            })
                          }
                          disabled={subscriptionSavingUserId === row.id}
                          className="ui-btn ui-btn-secondary !px-2.5 !py-1.5 !text-xs"
                        >
                          {row.adminModeSimulatePro ? "Clear override" : "Test override"}
                        </button>
                      </div>
                      {subscriptionActionState?.userId === row.id ? (
                        <p
                          className={`text-xs ${
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
                    </div>
                  ))}
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="min-w-full text-sm">
                    <thead className={theadClass}>
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium">User</th>
                        <th className="px-4 py-2.5 text-left font-medium">Tier</th>
                        <th className="px-4 py-2.5 text-left font-medium">Effective</th>
                        <th className="px-4 py-2.5 text-left font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userRows.map((row) => (
                        <tr key={row.id} className={`border-t ${rowBorder}`}>
                          <td className="px-4 py-2.5">
                            <p className="font-medium">{row.name}</p>
                            <p className={`text-xs ${softText}`}>{row.email}</p>
                          </td>
                          <td className="px-4 py-2.5">
                            <AdminBadge isDarkMode={isDarkMode} tone={row.subscriptionTier === "pro" ? "success" : "neutral"}>
                              {row.subscriptionTier === "pro" ? "Full" : "Standard"}
                            </AdminBadge>
                          </td>
                          <td className="px-4 py-2.5">
                            <AdminBadge
                              isDarkMode={isDarkMode}
                              tone={row.effectiveSubscriptionTier === "pro" ? "accent" : "neutral"}
                            >
                              {row.effectiveSubscriptionTier === "pro" ? "Full" : "Standard"}
                            </AdminBadge>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => void handleUpdateSubscription(row.id, { subscriptionTier: "free" })}
                                disabled={subscriptionSavingUserId === row.id}
                                className="ui-btn ui-btn-secondary !px-2.5 !py-1.5 !text-xs"
                              >
                                Standard
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleUpdateSubscription(row.id, { subscriptionTier: "pro" })}
                                disabled={subscriptionSavingUserId === row.id}
                                className="ui-btn ui-btn-secondary !px-2.5 !py-1.5 !text-xs"
                              >
                                Full
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleUpdateSubscription(row.id, {
                                    adminModeSimulatePro: !row.adminModeSimulatePro,
                                  })
                                }
                                disabled={subscriptionSavingUserId === row.id}
                                className="ui-btn ui-btn-secondary !px-2.5 !py-1.5 !text-xs"
                              >
                                {row.adminModeSimulatePro ? "Clear override" : "Override"}
                              </button>
                            </div>
                            {subscriptionActionState?.userId === row.id ? (
                              <p
                                className={`mt-1.5 text-xs ${
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
              </>
            )}
          </section>
        ) : null}
          </section>
        </div>
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
      className={`rounded-[var(--radius-lg)] border px-3 py-2.5 sm:px-4 sm:py-3 ${
        isDarkMode
          ? "border-white/12 bg-white/[0.04]"
          : "border-slate-200/90 bg-white/90"
      }`}
    >
      <p className={`text-[10px] font-semibold uppercase tracking-wide sm:text-xs ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold sm:text-2xl">{value}</p>
    </div>
  );
}

function AdminBadge({
  children,
  tone,
  isDarkMode,
}: {
  children: ReactNode;
  tone: "success" | "warn" | "neutral" | "accent";
  isDarkMode: boolean;
}) {
  const styles = {
    success: isDarkMode ? "bg-emerald-500/20 text-emerald-200" : "bg-emerald-100 text-emerald-800",
    warn: isDarkMode ? "bg-amber-500/20 text-amber-200" : "bg-amber-100 text-amber-800",
    neutral: isDarkMode ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-700",
    accent: isDarkMode ? "bg-violet-500/20 text-violet-100" : "bg-violet-100 text-violet-800",
  } as const;

  return (
    <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${styles[tone]}`}>
      {children}
    </span>
  );
}

function AdminEmpty({ children, softText }: { children: ReactNode; softText: string }) {
  return <p className={`px-4 py-8 text-center text-sm ${softText}`}>{children}</p>;
}

