"use client";

import dynamic from "next/dynamic";

function AdminLoadingShell() {
  const isDark =
    typeof document !== "undefined" &&
    (document.documentElement.classList.contains("theme-dark") ||
      window.localStorage.getItem("cinematch-theme-mode") === "dark");

  return (
    <div
      className={`flex min-h-[100dvh] flex-col items-center justify-center px-4 pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] ${
        isDark ? "bg-slate-950 text-slate-200" : "bg-slate-50 text-slate-700"
      }`}
    >
      <div
        className={
          isDark
            ? "ui-loading-spinner ui-loading-spinner--md ui-loading-spinner--on-dark"
            : "ui-loading-spinner ui-loading-spinner--md"
        }
        aria-hidden
      />
      <p className="mt-4 text-sm font-medium">Loading admin…</p>
    </div>
  );
}

const AdminClient = dynamic(() => import("./admin-client"), {
  ssr: false,
  loading: () => <AdminLoadingShell />,
});

export function AdminLoader() {
  return <AdminClient />;
}
