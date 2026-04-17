"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useAppState } from "@/lib/app-state";

const ADMIN_EMAIL = "iniloowf@gmail.com";
const ADMIN_PASSWORD = "Mishka123!";
const ADMIN_SESSION_KEY = "cinematch-admin-desktop-session-v1";

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
};

type DashboardUserRow = {
  id: string;
  name: string;
  email: string;
  city: string;
  accepted: number;
  rejected: number;
  links: number;
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
  subject: string;
  message: string;
  priority: "low" | "normal" | "high";
  status: "open" | "in_progress" | "closed";
  createdAt: string;
};

type DashboardPayload = {
  stats: DashboardStats;
  userRows: DashboardUserRow[];
  recentSwipes: DashboardSwipeRow[];
  tickets: DashboardTicketRow[];
};

export default function AdminDesktopPage() {
  const { isDarkMode } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const hasSession = window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "ok";
    setIsAuthenticated(hasSession);
    if (hasSession) {
      setEmail(ADMIN_EMAIL);
      setPassword(ADMIN_PASSWORD);
    }
  }, []);

  const loadDashboard = useCallback(
    async (
      credentials: { email: string; password: string },
      options?: { keepOldData?: boolean },
    ) => {
      if (!options?.keepOldData) {
        setDashboard(null);
      }
      setIsLoadingDashboard(true);
      setDashboardError("");

      try {
        const response = await fetch("/api/admin/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email.trim().toLowerCase(),
            password: credentials.password,
          }),
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
    [],
  );

  useEffect(() => {
    if (!isAuthenticated || dashboard || isLoadingDashboard) {
      return;
    }
    void loadDashboard(
      { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      { keepOldData: true },
    );
  }, [dashboard, isAuthenticated, isLoadingDashboard, loadDashboard]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      setErrorMessage("Invalid admin credentials.");
      return;
    }

    const didLoad = await loadDashboard({ email: normalizedEmail, password });
    if (!didLoad) {
      setErrorMessage("Admin dashboard could not be loaded.");
      return;
    }

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(ADMIN_SESSION_KEY, "ok");
    }
    setErrorMessage("");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
    setIsAuthenticated(false);
    setDashboard(null);
    setDashboardError("");
    setEmail("");
    setPassword("");
    setErrorMessage("");
  };

  const dashboardStats = dashboard?.stats;
  const userRows = dashboard?.userRows ?? [];
  const recentSwipes = dashboard?.recentSwipes ?? [];
  const recentTickets = dashboard?.tickets ?? [];

  const ticketPriorityLabel = useMemo(
    () =>
      ({
        low: "Low",
        normal: "Normal",
        high: "High",
      }) as const,
    [],
  );

  const shell = isDarkMode
    ? "min-h-screen bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)] text-slate-100"
    : "min-h-screen bg-[linear-gradient(180deg,#f8f7ff_0%,#eff3ff_100%)] text-slate-900";

  if (!isAuthenticated) {
    return (
      <main className={shell}>
        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
          <section
            className={`w-full rounded-[26px] border p-6 shadow-[0_20px_60px_rgba(15,23,42,0.15)] ${
              isDarkMode
                ? "border-white/10 bg-slate-950/80"
                : "border-slate-200 bg-white"
            }`}
          >
            <h1 className="text-2xl font-bold">Admin Desktop</h1>
            <p className={`mt-2 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Sign in to view only real Supabase operational data and user support tickets.
            </p>
            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <label className="block space-y-2 text-sm font-semibold">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={`w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none ${
                    isDarkMode
                      ? "border-white/12 bg-white/8 text-white placeholder:text-slate-400"
                      : "border-slate-200 bg-slate-50 text-slate-900"
                  }`}
                  placeholder="admin email"
                />
              </label>
              <label className="block space-y-2 text-sm font-semibold">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`w-full rounded-[14px] border px-3 py-2.5 text-sm outline-none ${
                    isDarkMode
                      ? "border-white/12 bg-white/8 text-white placeholder:text-slate-400"
                      : "border-slate-200 bg-slate-50 text-slate-900"
                  }`}
                  placeholder="admin password"
                />
              </label>
              {errorMessage ? (
                <p className={isDarkMode ? "text-sm text-rose-300" : "text-sm text-rose-700"}>
                  {errorMessage}
                </p>
              ) : null}
              {dashboardError ? (
                <p className={isDarkMode ? "text-sm text-rose-300" : "text-sm text-rose-700"}>
                  {dashboardError}
                </p>
              ) : null}
              <button type="submit" className="ui-btn ui-btn-primary w-full">
                Open admin dashboard
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={shell}>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CineMatch Admin Desktop</h1>
            <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              Live users, engagement, support tickets, and recent swipe activity.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void loadDashboard(
                  { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
                  { keepOldData: true },
                )
              }
              className="ui-btn ui-btn-secondary"
              disabled={isLoadingDashboard}
            >
              {isLoadingDashboard ? "Refreshing..." : "Refresh"}
            </button>
            <button type="button" onClick={handleLogout} className="ui-btn ui-btn-secondary">
              Log out
            </button>
          </div>
        </div>

        {dashboardError ? (
          <p
            className={`mb-4 rounded-[14px] border px-4 py-3 text-sm ${
              isDarkMode
                ? "border-rose-500/30 bg-rose-500/15 text-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {dashboardError}
          </p>
        ) : null}

        {!dashboardStats ? (
          <section
            className={`mb-6 rounded-[22px] border px-4 py-6 text-center text-sm ${
              isDarkMode ? "border-white/10 bg-slate-950/75 text-slate-300" : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            Loading dashboard data...
          </section>
        ) : null}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Users" value={dashboardStats?.users ?? 0} isDarkMode={isDarkMode} />
          <StatCard label="Movies" value={dashboardStats?.movies ?? 0} isDarkMode={isDarkMode} />
          <StatCard label="Swipes" value={dashboardStats?.swipes ?? 0} isDarkMode={isDarkMode} />
          <StatCard label="Watched" value={dashboardStats?.watchedEntries ?? 0} isDarkMode={isDarkMode} />
          <StatCard label="Accepted swipes" value={dashboardStats?.acceptedSwipes ?? 0} isDarkMode={isDarkMode} />
          <StatCard label="Rejected swipes" value={dashboardStats?.rejectedSwipes ?? 0} isDarkMode={isDarkMode} />
          <StatCard label="Accepted links" value={dashboardStats?.acceptedLinks ?? 0} isDarkMode={isDarkMode} />
          <StatCard label="Open tickets" value={dashboardStats?.openTickets ?? 0} isDarkMode={isDarkMode} />
        </div>

        <section
          className={`mb-6 overflow-hidden rounded-[22px] border ${
            isDarkMode ? "border-white/10 bg-slate-950/75" : "border-slate-200 bg-white"
          }`}
        >
          <div className={`border-b px-4 py-3 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
            <h2 className="text-lg font-semibold">Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className={isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-600"}>
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Name</th>
                  <th className="px-4 py-2 text-left font-semibold">Email</th>
                  <th className="px-4 py-2 text-left font-semibold">City</th>
                  <th className="px-4 py-2 text-right font-semibold">Accepted</th>
                  <th className="px-4 py-2 text-right font-semibold">Rejected</th>
                  <th className="px-4 py-2 text-right font-semibold">Links</th>
                </tr>
              </thead>
              <tbody>
                {userRows.map((row) => (
                  <tr key={row.id} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200"}>
                    <td className="px-4 py-2 font-medium">{row.name}</td>
                    <td className="px-4 py-2">{row.email}</td>
                    <td className="px-4 py-2">{row.city}</td>
                    <td className="px-4 py-2 text-right">{row.accepted}</td>
                    <td className="px-4 py-2 text-right">{row.rejected}</td>
                    <td className="px-4 py-2 text-right">{row.links}</td>
                  </tr>
                ))}
                {userRows.length === 0 ? (
                  <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200"}>
                    <td colSpan={6} className="px-4 py-4 text-center">
                      No users found in database.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className={`mb-6 overflow-hidden rounded-[22px] border ${
            isDarkMode ? "border-white/10 bg-slate-950/75" : "border-slate-200 bg-white"
          }`}
        >
          <div className={`border-b px-4 py-3 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
            <h2 className="text-lg font-semibold">Support Tickets</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className={isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-600"}>
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Time</th>
                  <th className="px-4 py-2 text-left font-semibold">User</th>
                  <th className="px-4 py-2 text-left font-semibold">Subject</th>
                  <th className="px-4 py-2 text-left font-semibold">Message</th>
                  <th className="px-4 py-2 text-left font-semibold">Priority</th>
                  <th className="px-4 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.length === 0 ? (
                  <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200"}>
                    <td colSpan={6} className="px-4 py-4 text-center">
                      No support tickets yet.
                    </td>
                  </tr>
                ) : (
                  recentTickets.map((ticket) => (
                    <tr key={ticket.id} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200"}>
                      <td className="px-4 py-2">{new Date(ticket.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2">{ticket.userName}</td>
                      <td className="px-4 py-2 font-medium">{ticket.subject}</td>
                      <td className="px-4 py-2">
                        <span className="line-clamp-2">{ticket.message}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            ticket.priority === "high"
                              ? "bg-rose-500/20 text-rose-400"
                              : ticket.priority === "low"
                                ? "bg-sky-500/20 text-sky-400"
                                : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {ticketPriorityLabel[ticket.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            ticket.status === "closed"
                              ? "bg-slate-500/25 text-slate-300"
                              : ticket.status === "in_progress"
                                ? "bg-violet-500/20 text-violet-300"
                                : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className={`overflow-hidden rounded-[22px] border ${
            isDarkMode ? "border-white/10 bg-slate-950/75" : "border-slate-200 bg-white"
          }`}
        >
          <div className={`border-b px-4 py-3 ${isDarkMode ? "border-white/10" : "border-slate-200"}`}>
            <h2 className="text-lg font-semibold">Recent Swipes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className={isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-600"}>
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Time</th>
                  <th className="px-4 py-2 text-left font-semibold">User</th>
                  <th className="px-4 py-2 text-left font-semibold">Movie</th>
                  <th className="px-4 py-2 text-left font-semibold">Decision</th>
                </tr>
              </thead>
              <tbody>
                {recentSwipes.length === 0 ? (
                  <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200"}>
                    <td colSpan={4} className="px-4 py-4 text-center">
                      No swipe activity yet.
                    </td>
                  </tr>
                ) : (
                  recentSwipes.map((swipe, index) => (
                    <tr key={`${swipe.userId}-${swipe.movieId}-${index}`} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200"}>
                      <td className="px-4 py-2">{new Date(swipe.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-2">{swipe.userName}</td>
                      <td className="px-4 py-2">{swipe.movieTitle}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            swipe.decision === "accepted"
                              ? "bg-emerald-500/20 text-emerald-500"
                              : "bg-rose-500/20 text-rose-500"
                          }`}
                        >
                          {swipe.decision}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
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
      className={`rounded-[18px] border px-4 py-3 ${
        isDarkMode ? "border-white/10 bg-slate-950/75" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

