"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppState } from "@/lib/app-state";

const ADMIN_EMAIL = "iniloowf@gmail.com";
const ADMIN_PASSWORD = "Mishka123!";
const ADMIN_SESSION_KEY = "cinematch-admin-desktop-session-v1";

export default function AdminDesktopPage() {
  const { data, isDarkMode } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    setIsAuthenticated(window.sessionStorage.getItem(ADMIN_SESSION_KEY) === "ok");
  }, []);

  const userById = useMemo(
    () => new Map(data.users.map((user) => [user.id, user])),
    [data.users],
  );
  const movieById = useMemo(
    () => new Map(data.movies.map((movie) => [movie.id, movie])),
    [data.movies],
  );

  const stats = useMemo(() => {
    const acceptedSwipes = data.swipes.filter((swipe) => swipe.decision === "accepted").length;
    const rejectedSwipes = data.swipes.filter((swipe) => swipe.decision === "rejected").length;
    const acceptedLinks = data.links.filter((link) => link.status === "accepted").length;
    const pendingLinks = data.links.filter((link) => link.status === "pending").length;
    const watchedEntries = data.sharedWatch.filter((entry) => entry.watched).length;

    return {
      users: data.users.length,
      movies: data.movies.length,
      swipes: data.swipes.length,
      acceptedSwipes,
      rejectedSwipes,
      acceptedLinks,
      pendingLinks,
      watchedEntries,
    };
  }, [data]);

  const userRows = useMemo(() => {
    return data.users.map((user) => {
      const accepted = data.swipes.filter(
        (swipe) => swipe.userId === user.id && swipe.decision === "accepted",
      ).length;
      const rejected = data.swipes.filter(
        (swipe) => swipe.userId === user.id && swipe.decision === "rejected",
      ).length;
      const links = data.links.filter((link) => link.users.includes(user.id)).length;
      return { user, accepted, rejected, links };
    });
  }, [data]);

  const recentSwipes = useMemo(() => {
    return [...data.swipes]
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, 12);
  }, [data.swipes]);

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      setErrorMessage("Invalid admin credentials.");
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
    setEmail("");
    setPassword("");
    setErrorMessage("");
  };

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
              Sign in with the admin credentials to view CineMatch operational data.
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
              Users, engagement, links, and recent swipes.
            </p>
          </div>
          <button type="button" onClick={handleLogout} className="ui-btn ui-btn-secondary">
            Log out
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Users" value={stats.users} isDarkMode={isDarkMode} />
          <StatCard label="Movies" value={stats.movies} isDarkMode={isDarkMode} />
          <StatCard label="Swipes" value={stats.swipes} isDarkMode={isDarkMode} />
          <StatCard label="Watched" value={stats.watchedEntries} isDarkMode={isDarkMode} />
          <StatCard label="Accepted swipes" value={stats.acceptedSwipes} isDarkMode={isDarkMode} />
          <StatCard label="Rejected swipes" value={stats.rejectedSwipes} isDarkMode={isDarkMode} />
          <StatCard label="Accepted links" value={stats.acceptedLinks} isDarkMode={isDarkMode} />
          <StatCard label="Pending links" value={stats.pendingLinks} isDarkMode={isDarkMode} />
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
                {userRows.map(({ user, accepted, rejected, links }) => (
                  <tr key={user.id} className={isDarkMode ? "border-t border-white/10" : "border-t border-slate-200"}>
                    <td className="px-4 py-2 font-medium">{user.name}</td>
                    <td className="px-4 py-2">{user.email}</td>
                    <td className="px-4 py-2">{user.city}</td>
                    <td className="px-4 py-2 text-right">{accepted}</td>
                    <td className="px-4 py-2 text-right">{rejected}</td>
                    <td className="px-4 py-2 text-right">{links}</td>
                  </tr>
                ))}
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
                      <td className="px-4 py-2">{userById.get(swipe.userId)?.name ?? swipe.userId}</td>
                      <td className="px-4 py-2">{movieById.get(swipe.movieId)?.title ?? swipe.movieId}</td>
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

