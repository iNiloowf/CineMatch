"use client";

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

/** Horizontal movement before we treat the gesture as a pill drag (not a tap). */
const DRAG_LOCK_PX = 10;
/** Max movement for a tap — above this, clicks on the active tab are suppressed. */
const TAP_THRESHOLD_PX = 14;

/**
 * Sliding pill + horizontal drag between segments (same interaction model as the bottom nav).
 * Touch must start on the currently active segment’s hit target (see `activeSlotSelector`).
 */
export function useSegmentedPillDrag(opts: {
  panelRef: RefObject<HTMLDivElement | null>;
  tabCount: number;
  activeIndex: number;
  enabled: boolean;
  reduceMotion: boolean;
  /** Total horizontal padding inside the track (e.g. Tailwind `p-1` → 8, `px-1.5`×2 → 12). */
  trackPaddingPx: number;
  /** `querySelector` within `panelRef` for the active segment cell (hit target for drag start). */
  activeSlotSelector: string;
  onIndexCommit: (index: number) => void;
}) {
  const {
    panelRef,
    tabCount,
    activeIndex,
    enabled,
    reduceMotion,
    trackPaddingPx,
    activeSlotSelector,
    onIndexCommit,
  } = opts;

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
  const activeIndexRef = useRef(activeIndex);
  const tabWidthPxRef = useRef(0);
  const docCleanupRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) {
      return;
    }
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      const tw = Math.max(0, (w - trackPaddingPx) / Math.max(1, tabCount));
      setTabWidthPx(tw);
      tabWidthPxRef.current = tw;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [panelRef, tabCount, trackPaddingPx]);

  useEffect(() => {
    dragOffsetPxRef.current = dragOffsetPx;
  }, [dragOffsetPx]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useLayoutEffect(() => {
    if (optimisticIndex === null) {
      return;
    }
    if (activeIndex === optimisticIndex) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear optimistic override when parent state catches up
      setOptimisticIndex(null);
    }
  }, [activeIndex, optimisticIndex]);

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
      if (!trackingRef.current || !enabled) {
        return;
      }
      const tw = tabWidthPxRef.current;
      if (tw <= 0) {
        return;
      }
      const dx = clientX - startXRef.current;
      const dy = clientY - startYRef.current;
      const idx = activeIndexRef.current;

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
    [enabled, removeDocListeners, resetDragVisual, setOffset, tabCount],
  );

  const finishGesture = useCallback(
    (clientX: number, clientY: number) => {
      removeDocListeners();

      if (!trackingRef.current || !enabled || tabWidthPxRef.current <= 0) {
        resetDragVisual();
        return;
      }

      const wasDrag = dragModeRef.current;
      const dx = clientX - startXRef.current;
      const dy = clientY - startYRef.current;
      const totalMove = Math.hypot(dx, dy);
      const offset = dragOffsetPxRef.current;
      const idx = activeIndexRef.current;
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
        onIndexCommit(target);
        return;
      }

      setOffset(0);
      setIsDragging(false);
      dragModeRef.current = false;
      trackingRef.current = false;
    },
    [enabled, onIndexCommit, removeDocListeners, resetDragVisual, setOffset, tabCount],
  );

  const onTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLDivElement>) => {
      suppressClickRef.current = false;
      removeDocListeners();

      if (!enabled || tabWidthPxRef.current <= 0 || event.touches.length !== 1) {
        return;
      }
      const panel = panelRef.current;
      if (!panel) {
        return;
      }
      const touch = event.touches[0];
      const activeEl = panel.querySelector<HTMLElement>(activeSlotSelector);
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
    [activeSlotSelector, enabled, finishGesture, panelRef, processTouchMove, removeDocListeners],
  );

  const settledIndex =
    optimisticIndex !== null && optimisticIndex !== activeIndex ? optimisticIndex : activeIndex;

  const visualIndexForPill = (() => {
    if (!enabled) {
      return 0;
    }
    if (isDragging && tabWidthPx > 0) {
      return Math.min(tabCount - 1, Math.max(0, activeIndex + dragOffsetPx / tabWidthPx));
    }
    return settledIndex;
  })();

  const visualHighlightIndex = enabled
    ? Math.min(tabCount - 1, Math.max(0, Math.round(visualIndexForPill)))
    : -1;

  const transitionMs = reduceMotion ? 80 : isDragging ? 0 : 320;
  const transitionEasing = reduceMotion ? "ease" : "cubic-bezier(0.34, 1.35, 0.64, 1)";

  const pillTransformStyle = {
    width: `calc((100% - ${trackPaddingPx}px) / ${tabCount})` as const,
    transform: `translateX(calc(${visualIndexForPill} * 100%))`,
    transition: isDragging ? "none" : `transform ${transitionMs}ms ${transitionEasing}`,
  };

  const onSegmentClick = useCallback((e: MouseEvent<HTMLElement>) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
      return true;
    }
    return false;
  }, []);

  return {
    onTouchStart,
    pillTransformStyle,
    onSegmentClick,
    isDragging,
    visualHighlightIndex,
  };
}
