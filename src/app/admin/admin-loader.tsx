"use client";

import dynamic from "next/dynamic";

const AdminClient = dynamic(() => import("./admin-client"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-950 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-[env(safe-area-inset-top,0px)] text-slate-200">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-white/15 border-t-violet-400"
        aria-hidden
      />
      <p className="mt-4 text-sm font-medium">Loading admin…</p>
    </div>
  ),
});

export function AdminLoader() {
  return <AdminClient />;
}
