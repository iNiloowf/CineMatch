"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef } from "react";
import { useAppState } from "@/lib/app-state";
import { bottomTabNavItems, resolveBottomNavHighlight } from "@/lib/bottom-tab-nav";
import { useBottomNavPillDrag } from "@/lib/use-bottom-nav-pill-drag";

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
  const { isDarkMode, data, currentUserId } = useAppState();
  const panelRef = useRef<HTMLDivElement>(null);

  const reduceMotion = useMemo(() => {
    if (!currentUserId) {
      return false;
    }
    return data.settings[currentUserId]?.reduceMotion ?? false;
  }, [currentUserId, data.settings]);

  const { pillIndex, activeHref } = resolveBottomNavHighlight(pathname);
  const hasTabMatch = pillIndex >= 0 && activeHref !== null;

  const { onTouchStart, pillTransformStyle, onActiveLinkClick, isDragging, visualHighlightIndex } =
    useBottomNavPillDrag({
      panelRef,
      pillIndex: hasTabMatch ? pillIndex : 0,
      hasTabMatch,
      reduceMotion,
    });

  const items = bottomTabNavItems;

  return (
    <nav
      data-bottom-nav="true"
      aria-label="Main navigation"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-nav)] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)] sm:px-4"
    >
      <div
        ref={panelRef}
        data-bottom-nav-panel="true"
        data-bottom-nav-pill="true"
        data-pill-dragging={isDragging ? "true" : undefined}
        onTouchStart={onTouchStart}
        className={`pointer-events-auto relative mx-auto flex w-full max-w-md items-stretch overflow-hidden rounded-[26px] px-1.5 py-2 backdrop-blur-2xl transition-[box-shadow] duration-500 ease-out motion-reduce:duration-0 max-[380px]:px-1 sm:px-2 ${
          isDragging ? "touch-none" : "touch-manipulation"
        } ${
          isDarkMode
            ? "border border-white/16 bg-black/42 shadow-[0_22px_50px_rgba(0,0,0,0.35)]"
            : "border border-white/70 bg-white/90 shadow-[0_22px_50px_rgba(124,91,191,0.2)]"
        }`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute bottom-2 left-1.5 top-2 z-0 rounded-[16px] will-change-transform motion-reduce:will-change-auto ${
            isDarkMode
              ? "bg-gradient-to-b from-violet-400/95 via-violet-600 to-violet-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_14px_32px_rgba(109,40,217,0.42)]"
              : "bg-gradient-to-b from-violet-400 via-violet-500 to-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_26px_rgba(109,40,217,0.28)]"
          } ${hasTabMatch ? "opacity-100" : "opacity-0"}`}
          style={pillTransformStyle}
        />
        {items.map((item, index) => {
          const routeActive = Boolean(activeHref && item.href === activeHref);
          const visualActive = hasTabMatch && index === visualHighlightIndex;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-bottom-nav-link="true"
              data-active={visualActive ? "true" : "false"}
              aria-current={routeActive ? "page" : undefined}
              onClick={routeActive ? onActiveLinkClick : undefined}
              className={`group relative z-10 flex min-h-[44px] min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-[18px] px-0.5 py-2 transition-[transform,color] duration-300 ease-out motion-reduce:transition-colors motion-reduce:duration-150 max-[380px]:px-0 sm:gap-1 sm:px-1 ${
                visualActive
                  ? "text-white motion-reduce:scale-100"
                  : isDarkMode
                    ? "text-slate-300 active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-white/[0.06]"
                    : "text-slate-500 active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-slate-900/[0.05]"
              }`}
              aria-label={item.label}
              title={item.label}
            >
              <span
                data-bottom-nav-icon="true"
                aria-hidden="true"
                className={`flex h-6 w-6 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none ${
                  visualActive
                    ? "scale-110 text-white motion-reduce:scale-100"
                    : isDarkMode
                      ? "text-slate-300 group-active:scale-95 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
                      : "text-slate-500 group-active:scale-95 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
                }`}
              >
                <NavIcon href={item.href} />
              </span>
              <span
                aria-hidden="true"
                className="max-w-full truncate text-center text-[10px] font-semibold leading-none transition-colors duration-200 max-[380px]:text-[9px]"
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
