"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useRef } from "react";
import { useAppState } from "@/lib/app-state";
import { bottomTabNavItems, resolveBottomNavHighlight } from "@/lib/bottom-tab-nav";
import { useBottomNavPillDrag } from "@/lib/use-bottom-nav-pill-drag";

/** Tab icons as emoji (experiment; keeps labels for accessibility). */
const BOTTOM_TAB_EMOJI: Record<string, string> = {
  "/discover": "🎬",
  "/picks": "💜",
  "/shared": "🤝",
  "/friends": "👥",
  "/profile": "👤",
  "/settings": "⚙️",
};

function NavIcon({ href }: { href: string }) {
  const char = BOTTOM_TAB_EMOJI[href] ?? "◆";
  return (
    <span
      className="select-none text-[1.15rem] leading-none [filter:drop-shadow(0_1px_0_rgba(0,0,0,0.12))] max-[380px]:text-[1.05rem] sm:text-[1.2rem]"
      role="img"
      aria-hidden
    >
      {char}
    </span>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const { isDarkMode, data, currentUserId, linkedUsers } = useAppState();
  const panelRef = useRef<HTMLDivElement>(null);

  const reduceMotion = useMemo(() => {
    if (!currentUserId) {
      return false;
    }
    return data.settings[currentUserId]?.reduceMotion ?? false;
  }, [currentUserId, data.settings]);

  const incomingFriendRequestCount = useMemo(
    () =>
      currentUserId
        ? linkedUsers.filter(
            (entry) => entry.status === "pending" && entry.requesterId !== currentUserId,
          ).length
        : 0,
    [currentUserId, linkedUsers],
  );

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
      className="app-safe-x pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-nav)] pb-[calc(env(safe-area-inset-bottom,0px)+0.25rem)]"
    >
      <div
        ref={panelRef}
        data-bottom-nav-panel="true"
        data-bottom-nav-pill="true"
        data-pill-dragging={isDragging ? "true" : undefined}
        onTouchStart={onTouchStart}
        className={`pointer-events-auto relative mx-auto flex w-full max-w-md items-stretch overflow-hidden rounded-[var(--radius-surface)] px-1.5 py-2 backdrop-blur-2xl transition-[box-shadow] duration-500 ease-out motion-reduce:duration-0 max-[380px]:px-1 sm:px-2 ${
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
              aria-label={
                item.href === "/friends" && incomingFriendRequestCount > 0
                  ? `${item.label}, ${incomingFriendRequestCount} pending friend request${
                      incomingFriendRequestCount === 1 ? "" : "s"
                    }`
                  : item.label
              }
              title={item.label}
            >
              <span
                data-bottom-nav-icon="true"
                aria-hidden="true"
                className={`relative flex h-6 min-h-6 w-6 min-w-6 items-center justify-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none ${
                  visualActive
                    ? "scale-110 motion-reduce:scale-100"
                    : "opacity-90 group-active:scale-95 [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105"
                }`}
              >
                <NavIcon href={item.href} />
                {item.href === "/friends" && incomingFriendRequestCount > 0 ? (
                  <span
                    className={`pointer-events-none absolute -right-0.5 -top-0.5 z-10 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ${
                      isDarkMode ? "ring-[#0f0b1a]" : "ring-white"
                    }`}
                    aria-hidden
                  />
                ) : null}
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
