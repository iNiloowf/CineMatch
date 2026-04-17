"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type AdminTab = "overview" | "tickets" | "users" | "swipes";

export default function AdminDesktopPage() {
  const { isDarkMode } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const attemptedSessionLoadRef = useRef(false);

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
    if (
      !isAuthenticated ||
      dashboard ||
      isLoadingDashboard ||
      attemptedSessionLoadRef.current
    ) {
      return;
    }
    attemptedSessionLoadRef.current = true;
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
    attemptedSessionLoadRef.current = true;
    setErrorMessage("");
    setIsAuthenticated(true);
    setActiveTab("overview");
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
    attemptedSessionLoadRef.current = false;
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

  const shell = isDarkMode
    ? "min-h-screen bg-[radial-gradient(circle_at_10%_15%,rgba(129,140,248,0.2),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(236,72,153,0.18),transparent_30%),linear-gradient(180deg,#080916_0%,#0b1020_42%,#05060f_100%)] text-slate-100"
    : "min-h-screen bg-[radial-gradient(circle_at_8%_12%,rgba(99,102,241,0.2),transparent_34%),radial-gradient(circle_at_85%_10%,rgba(236,72,153,0.15),transparent_28%),linear-gradient(180deg,#f9fbff_0%,#eef4ff_42%,#e9ecff_100%)] text-slate-900";
  const glassPanel = isDarkMode
    ? "border-white/15 bg-white/[0.06] backdrop-blur-xl shadow-[0_24px_60px_rgba(2,8,24,0.45)]"
    : "border-white/70 bg-white/75 backdrop-blur-xl shadow-[0_24px_60px_rgba(15,23,42,0.14)]";
  const softText = isDarkMode ? "text-slate-300" : "text-slate-600";

  if (!isAuthenticated) {
    return (
      <main className={shell}>
        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center justify-center px-4 py-10">
          <section className={`w-full rounded-[30px] border p-6 ${glassPanel}`}>
            <h1 className="text-2xl font-bold">Admin Desktop</h1>
            <p className={`mt-2 text-sm ${softText}`}>
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
                      ? "border-white/15 bg-white/[0.06] text-white placeholder:text-slate-400"
                      : "border-white/60 bg-white/80 text-slate-900"
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
                      ? "border-white/15 bg-white/[0.06] text-white placeholder:text-slate-400"
                      : "border-white/60 bg-white/80 text-slate-900"
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
                    </tr>
                  </thead>
                  <tbody>
                    {previewTickets.length === 0 ? (
                      <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                        <td colSpan={3} className="px-4 py-4 text-center">
                          No support tickets yet.
                        </td>
                      </tr>
                    ) : (
                      previewTickets.map((ticket) => (
                        <tr key={ticket.id} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                          <td className="px-4 py-2">{ticket.userName}</td>
                          <td className="px-4 py-2 font-medium">{ticket.subject}</td>
                          <td className="px-4 py-2">{ticketPriorityLabel[ticket.priority]}</td>
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
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className={isDarkMode ? "bg-white/5 text-slate-300" : "bg-slate-50/70 text-slate-600"}>
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
                    <tr key={row.id} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                      <td className="px-4 py-2 font-medium">{row.name}</td>
                      <td className="px-4 py-2">{row.email}</td>
                      <td className="px-4 py-2">{row.city}</td>
                      <td className="px-4 py-2 text-right">{row.accepted}</td>
                      <td className="px-4 py-2 text-right">{row.rejected}</td>
                      <td className="px-4 py-2 text-right">{row.links}</td>
                    </tr>
                  ))}
                  {userRows.length === 0 ? (
                    <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                      <td colSpan={6} className="px-4 py-4 text-center">
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
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.length === 0 ? (
                    <tr className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200/60"}>
                      <td colSpan={6} className="px-4 py-4 text-center">
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
                        <td className="px-4 py-2">{ticket.status.replace("_", " ")}</td>
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
