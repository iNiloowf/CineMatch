"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useRef, type TouchEvent } from "react";

export const bottomTabNavItems = [
  { href: "/discover", label: "Discover" },
  { href: "/picks", label: "Picks" },
  { href: "/shared", label: "Shared" },
  { href: "/profile", label: "Profile" },
  { href: "/settings", label: "Settings" },
] as const;

/** Connect lives outside the 5 tabs; highlight Profile while finishing an invite there. */
export const CONNECT_AS_PROFILE_TAB = /^\/connect(\/|$)/;

export function resolveBottomNavHighlight(pathname: string) {
  const items = bottomTabNavItems;
  const exactIndex = items.findIndex((item) => item.href === pathname);
  if (exactIndex >= 0) {
    return {
      pillIndex: exactIndex,
      activeHref: items[exactIndex].href,
    };
  }
  if (pathname.startsWith("/settings")) {
    const settingsIndex = items.findIndex((item) => item.href === "/settings");
    if (settingsIndex >= 0) {
      return { pillIndex: settingsIndex, activeHref: "/settings" };
    }
  }
  if (CONNECT_AS_PROFILE_TAB.test(pathname)) {
    const profileIndex = items.findIndex((item) => item.href === "/profile");
    if (profileIndex >= 0) {
      return { pillIndex: profileIndex, activeHref: "/profile" };
    }
  }
  return { pillIndex: -1, activeHref: null as string | null };
}

/** Minimum horizontal distance (px) before a swipe counts as tab navigation. */
export const TAB_SWIPE_MIN_DISTANCE_PX = 64;
/** Reject gestures where vertical movement dominates (accidental scrolls). */
export const TAB_SWIPE_VERTICAL_DOMINANCE = 1.12;
/** Ignore horizontal swipe if vertical delta exceeds this (px). */
export const TAB_SWIPE_MAX_VERTICAL_PX = 32;
const SWIPE_LOCK_MS = 440;

export function useTabSwipeNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { pillIndex } = resolveBottomNavHighlight(pathname);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const swipeLockUntil = useRef(0);

  const resolveSwipeTabIndex = useCallback(() => {
    if (pillIndex >= 0) {
      return pillIndex;
    }
    const loose = bottomTabNavItems.findIndex(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    if (loose >= 0) {
      return loose;
    }
    return 0;
  }, [pathname, pillIndex]);

  const onTouchStart = useCallback((event: TouchEvent) => {
    if (event.touches.length !== 1) {
      return;
    }
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (touchStartX.current === null || Date.now() < swipeLockUntil.current) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }
      const t = event.changedTouches[0];
      const dx = t.clientX - touchStartX.current;
      const dy = t.clientY - (touchStartY.current ?? t.clientY);
      touchStartX.current = null;
      touchStartY.current = null;

      if (Math.abs(dx) < TAB_SWIPE_MIN_DISTANCE_PX) {
        return;
      }
      if (Math.abs(dy) > Math.abs(dx) * TAB_SWIPE_VERTICAL_DOMINANCE && Math.abs(dy) > TAB_SWIPE_MAX_VERTICAL_PX) {
        return;
      }

      const idx = resolveSwipeTabIndex();
      const items = bottomTabNavItems;
      if (dx < 0) {
        const next = Math.min(items.length - 1, idx + 1);
        if (next !== idx) {
          swipeLockUntil.current = Date.now() + SWIPE_LOCK_MS;
          router.push(items[next].href);
        }
      } else {
        const prev = Math.max(0, idx - 1);
        if (prev !== idx) {
          swipeLockUntil.current = Date.now() + SWIPE_LOCK_MS;
          router.push(items[prev].href);
        }
      }
    },
    [resolveSwipeTabIndex, router],
  );

  return { onTouchStart, onTouchEnd };
}
