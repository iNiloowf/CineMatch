"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/app-state";

const items = [
  { href: "/discover", label: "Discover", icon: "D" },
  { href: "/picks", label: "Picks", icon: "P" },
  { href: "/shared", label: "Shared", icon: "S" },
  { href: "/profile", label: "Profile", icon: "P" },
  { href: "/settings", label: "Settings", icon: "S" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isDarkMode } = useAppState();

  return (
    <nav className="z-20 mt-auto shrink-0 pb-[env(safe-area-inset-bottom,0px)]">
      <div
        className={`mx-auto flex max-w-md items-center justify-between rounded-[30px] px-2 py-2 backdrop-blur-2xl ${
          isDarkMode
            ? "border border-white/10 bg-black/35 shadow-[0_22px_50px_rgba(0,0,0,0.35)]"
            : "border border-white/70 bg-white/90 shadow-[0_22px_50px_rgba(124,91,191,0.2)]"
        }`}
      >
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[22px] px-1 py-2 text-[11px] font-medium transition ${
                active
                  ? "bg-violet-100 text-violet-700"
                  : isDarkMode
                    ? "text-slate-400"
                    : "text-slate-400"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  active
                    ? "bg-violet-600 text-white"
                    : isDarkMode
                      ? "bg-white/8 text-slate-300"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
