"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/app-state";

const items = [
  { href: "/discover", label: "Discover" },
  { href: "/picks", label: "Picks" },
  { href: "/shared", label: "Shared" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

function NavIcon({ href }: { href: string }) {
  if (href === "/discover") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
        <path d="m4 7 8 4 8-4" />
        <path d="M12 11v10" />
      </svg>
    );
  }

  if (href === "/picks") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="m12 20-6.2-3.6A4.4 4.4 0 0 1 3.6 12c0-2.4 1.9-4.4 4.3-4.4 1.5 0 2.9.8 3.6 2 0 0 .8-2 3.6-2 2.4 0 4.3 2 4.3 4.4 0 1.8-.9 3.4-2.2 4.4L12 20Z" />
      </svg>
    );
  }

  if (href === "/shared") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M17 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M13 19a4.5 4.5 0 0 1 7.5-3.3" />
      </svg>
    );
  }

  if (href === "/profile") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M12 3v3" />
      <path d="M18.4 5.6 16.3 7.7" />
      <path d="M21 12h-3" />
      <path d="m18.4 18.4-2.1-2.1" />
      <path d="M12 21v-3" />
      <path d="m7.7 16.3-2.1 2.1" />
      <path d="M6 12H3" />
      <path d="m7.7 7.7-2.1-2.1" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { isDarkMode, hasProAccess } = useAppState();

  return (
    <nav
      data-bottom-nav="true"
      className="z-[var(--z-nav)] mt-auto shrink-0 pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div
        data-bottom-nav-panel="true"
        className={`mx-auto flex max-w-md items-center justify-between rounded-[26px] px-1.5 py-2 backdrop-blur-2xl max-[380px]:px-1 sm:px-2 ${
          isDarkMode
            ? "border border-white/16 bg-black/42 shadow-[0_22px_50px_rgba(0,0,0,0.35)]"
            : "border border-white/70 bg-white/90 shadow-[0_22px_50px_rgba(124,91,191,0.2)]"
        }`}
      >
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-bottom-nav-link="true"
              data-active={active ? "true" : "false"}
              className={`flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] px-0.5 py-2 transition max-[380px]:px-0 sm:gap-1 sm:px-1 ${
                active
                  ? "bg-[linear-gradient(180deg,#c084fc,#8b5cf6_55%,#6d28d9)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_12px_24px_rgba(109,40,217,0.28)]"
                  : isDarkMode
                    ? "text-slate-300"
                    : "text-slate-400"
              }`}
              aria-label={item.label}
              title={item.label}
              >
              <span
                data-bottom-nav-icon="true"
                aria-hidden="true"
                className={`flex h-6 w-6 items-center justify-center ${
                  active
                    ? "text-white"
                    : isDarkMode
                      ? "text-slate-300"
                      : "text-slate-500"
                }`}
              >
                <NavIcon href={item.href} />
              </span>
              <span
                aria-hidden="true"
                className="max-w-full truncate text-center text-[10px] font-medium leading-none max-[380px]:text-[9px]"
              >
                {item.label}
                {item.href === "/shared" && !hasProAccess ? " *" : ""}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
