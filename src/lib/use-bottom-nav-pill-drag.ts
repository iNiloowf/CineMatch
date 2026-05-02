"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { bottomTabNavItems } from "@/lib/bottom-tab-nav";

/** Horizontal movement before we treat the gesture as a pill drag (not a tap). */
const DRAG_LOCK_PX = 10;
/** Max movement for a tap — above this, clicks on the active tab are suppressed. */
const TAP_THRESHOLD_PX = 14;
/** Total horizontal padding inside the pill track (matches `px-1.5` × 2). */
const PILL_TRACK_PADDING_PX = 12;

export function useBottomNavPillDrag(opts: {
  panelRef: RefObject<HTMLDivElement | null>;
  pillIndex: number;
  hasTabMatch: boolean;
  reduceMotion: boolean;
}) {
  const { panelRef, pillIndex, hasTabMatch, reduceMotion } = opts;
  const router = useRouter();

  const [tabWidthPx, setTabWidthPx] = useState(0);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);

  const trackingRef = useRef(false);
  const dragModeRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const suppressClickRef = useRef(false);
  const dragOffsetPxRef = useRef(0);
  const pillIndexRef = useRef(pillIndex);
  const tabWidthPxRef = useRef(0);
  const docCleanupRef = useRef<(() => void) | null>(null);

  const tabCount = bottomTabNavItems.length;

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      const tw = Math.max(0, (w - PILL_TRACK_PADDING_PX) / tabCount);
      setTabWidthPx(tw);
      tabWidthPxRef.current = tw;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [panelRef, tabCount]);

  useEffect(() => {
    dragOffsetPxRef.current = dragOffsetPx;
  }, [dragOffsetPx]);

  useEffect(() => {
    pillIndexRef.current = pillIndex;
  }, [pillIndex]);

  useLayoutEffect(() => {
    if (optimisticIndex === null) {
      return;
    }
    if (pillIndex === optimisticIndex) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear optimistic override when route catches up
      setOptimisticIndex(null);
    }
  }, [pillIndex, optimisticIndex]);

  useEffect(() => {
    return () => {
      docCleanupRef.current?.();
      docCleanupRef.current = null;
    };
  }, []);

  const setOffset = useCallback((next: number) => {
    dragOffsetPxRef.current = next;
    setDragOffsetPx(next);
  }, []);

  const resetDragVisual = useCallback(() => {
    setOffset(0);
    setIsDragging(false);
    dragModeRef.current = false;
    trackingRef.current = false;
  }, [setOffset]);

  const removeDocListeners = useCallback(() => {
    docCleanupRef.current?.();
    docCleanupRef.current = null;
  }, []);

  const processTouchMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!trackingRef.current || !hasTabMatch) {
        return;
      }
      const tw = tabWidthPxRef.current;
      if (tw <= 0) {
        return;
      }
      const dx = clientX - startXRef.current;
      const dy = clientY - startYRef.current;
      const idx = pillIndexRef.current;

      if (!dragModeRef.current) {
        if (Math.abs(dx) < DRAG_LOCK_PX && Math.abs(dy) < DRAG_LOCK_PX) {
          return;
        }
        if (Math.abs(dy) >= Math.abs(dx) * 1.15) {
          trackingRef.current = false;
          removeDocListeners();
          resetDragVisual();
          return;
        }
        dragModeRef.current = true;
        setIsDragging(true);
      }

      if (dragModeRef.current) {
        const maxOffset = (tabCount - 1 - idx) * tw;
        const minOffset = -idx * tw;
        const next = Math.min(maxOffset, Math.max(minOffset, dx));
        setOffset(next);
      }
    },
    [hasTabMatch, removeDocListeners, resetDragVisual, setOffset, tabCount],
  );

  const finishGesture = useCallback(
    (clientX: number, clientY: number) => {
      removeDocListeners();

      if (!trackingRef.current || !hasTabMatch || tabWidthPxRef.current <= 0) {
        resetDragVisual();
        return;
      }

      const wasDrag = dragModeRef.current;
      const dx = clientX - startXRef.current;
      const dy = clientY - startYRef.current;
      const totalMove = Math.hypot(dx, dy);
      const offset = dragOffsetPxRef.current;
      const idx = pillIndexRef.current;
      const tw = tabWidthPxRef.current;

      if (!wasDrag) {
        if (totalMove > TAP_THRESHOLD_PX) {
          suppressClickRef.current = true;
        }
        resetDragVisual();
        return;
      }

      const visualIndex = idx + offset / tw;
      const target = Math.round(Math.min(tabCount - 1, Math.max(0, visualIndex)));

      suppressClickRef.current = totalMove > TAP_THRESHOLD_PX;

      if (target !== idx) {
        setOptimisticIndex(target);
        setOffset(0);
        setIsDragging(false);
        dragModeRef.current = false;
        trackingRef.current = false;
        router.push(bottomTabNavItems[target].href);
        return;
      }

      setOffset(0);
      setIsDragging(false);
      dragModeRef.current = false;
      trackingRef.current = false;
    },
    [hasTabMatch, removeDocListeners, resetDragVisual, router, setOffset, tabCount],
  );

  const onTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      suppressClickRef.current = false;
      removeDocListeners();

      if (!hasTabMatch || tabWidthPxRef.current <= 0 || event.touches.length !== 1) {
        return;
      }
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const touch = event.touches[0];
      const activeEl = panel.querySelector<HTMLElement>('[data-bottom-nav-link="true"][data-active="true"]');
      if (!activeEl) {
        return;
      }
      const r = activeEl.getBoundingClientRect();
      if (
        touch.clientX < r.left ||
        touch.clientX > r.right ||
        touch.clientY < r.top ||
        touch.clientY > r.bottom
      ) {
        return;
      }

      trackingRef.current = true;
      dragModeRef.current = false;
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;

      const onMove = (ev: globalThis.TouchEvent) => {
        if (ev.touches.length !== 1) {
          return;
        }
        processTouchMove(ev.touches[0].clientX, ev.touches[0].clientY);
        if (dragModeRef.current) {
          ev.preventDefault();
        }
      };

      const onEnd = (ev: globalThis.TouchEvent) => {
        const t = ev.changedTouches[0];
        finishGesture(t.clientX, t.clientY);
      };

      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
      document.addEventListener("touchcancel", onEnd);

      docCleanupRef.current = () => {
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
        document.removeEventListener("touchcancel", onEnd);
      };
    },
    [finishGesture, hasTabMatch, panelRef, processTouchMove, removeDocListeners],
  );

  const settledPillIndex =
    optimisticIndex !== null && optimisticIndex !== pillIndex ? optimisticIndex : pillIndex;

  const visualIndexForPill = (() => {
    if (!hasTabMatch) {
      return 0;
    }
    if (isDragging && tabWidthPx > 0) {
      return Math.min(
        tabCount - 1,
        Math.max(0, pillIndex + dragOffsetPx / tabWidthPx),
      );
    }
    return settledPillIndex;
  })();

  /** Nearest tab index — drives label/icon “active” styling so it stays aligned with the pill while dragging. */
  const visualHighlightIndex = hasTabMatch
    ? Math.min(tabCount - 1, Math.max(0, Math.round(visualIndexForPill)))
    : -1;

  const transitionMs = reduceMotion ? 80 : isDragging ? 0 : 320;
  const transitionEasing = reduceMotion ? "ease" : "cubic-bezier(0.34, 1.35, 0.64, 1)";

  const pillTransformStyle = {
    width: `calc((100% - ${PILL_TRACK_PADDING_PX}px) / ${tabCount})` as const,
    transform: `translateX(calc(${visualIndexForPill} * 100%))`,
    transition: isDragging ? "none" : `transform ${transitionMs}ms ${transitionEasing}`,
  };

  const onLinkClick = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
    }
  }, []);

  return {
    onTouchStart,
    pillTransformStyle,
    onLinkClick,
    isDragging,
    visualHighlightIndex,
  };
}
