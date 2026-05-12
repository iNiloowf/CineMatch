"use client";

import { type RefObject, useLayoutEffect } from "react";

/**
 * Prevents wheel / trackpad scroll from chaining to ancestor scrollers when this
 * element is already at its top or bottom. Complements `overscroll-behavior`
 * where it is flaky (nested app shells, mobile WebViews).
 */
export function useWheelScrollContain(ref: RefObject<HTMLElement | null>, active: boolean) {
  useLayoutEffect(() => {
    if (!active || typeof window === "undefined") {
      return;
    }
    const el = ref.current;
    if (!el) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      if (el.scrollHeight <= el.clientHeight + 1) {
        return;
      }
      const { scrollTop, scrollHeight, clientHeight } = el;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);
      if (
        (scrollTop <= 0 && event.deltaY < 0) ||
        (scrollTop >= maxScroll - 1 && event.deltaY > 0)
      ) {
        event.preventDefault();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
    };
  }, [active]);
}
