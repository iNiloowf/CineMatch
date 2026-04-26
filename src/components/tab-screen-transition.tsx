"use client";

/* eslint-disable react-hooks/refs --
  Previous pathname is read during render while the ref still holds the last committed value;
  useLayoutEffect then stores the new pathname so the next navigation can compare again.
*/

import { usePathname } from "next/navigation";
import { type ReactNode, useLayoutEffect, useRef } from "react";
import { resolveBottomNavHighlight } from "@/lib/bottom-tab-nav";

type SlideDir = "forward" | "back" | null;

/**
 * Wraps main tab content: slide animation direction matches bottom tab index (same order as the pill).
 * Skips enter motion when the route has not changed (including initial mount).
 */
export function TabScreenTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  const prevPathname = prevPathnameRef.current;
  let animate = false;
  let dir: SlideDir = null;

  if (prevPathname !== pathname) {
    animate = true;
    const prevIdx = resolveBottomNavHighlight(prevPathname).pillIndex;
    const nextIdx = resolveBottomNavHighlight(pathname).pillIndex;
    if (prevIdx >= 0 && nextIdx >= 0 && prevIdx !== nextIdx) {
      dir = nextIdx > prevIdx ? "forward" : "back";
    }
  }

  useLayoutEffect(() => {
    prevPathnameRef.current = pathname;
  }, [pathname]);

  const { pillIndex } = resolveBottomNavHighlight(pathname);

  const transitionClass = !animate
    ? "tab-route-surface"
    : dir === "forward"
      ? "tab-route-surface tab-route-enter tab-route-enter--forward"
      : dir === "back"
        ? "tab-route-surface tab-route-enter tab-route-enter--back"
        : "tab-route-surface tab-route-enter tab-route-enter--fade";

  /**
   * /discover: `min-h-0` so the swipe stack can size to the viewport. Everywhere else: `min-h-min`
   * so the flex child’s height is at least its content; with `min-h-0` alone, WebKit often
   * under-measures `scrollHeight` and the last cards sit under the fixed bottom nav.
   */
  const isDiscoverRoute = pathname === "/discover";
  const layoutClass = `${transitionClass} flex w-full min-w-0 max-w-full ${
    isDiscoverRoute ? "min-h-0" : "min-h-min"
  } flex-1 flex-col overflow-x-clip`;

  return (
    <div
      key={pathname}
      data-tab-route-active-index={pillIndex >= 0 ? pillIndex : undefined}
      className={layoutClass}
    >
      {children}
    </div>
  );
}
