"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "iframe",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function listFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.closest('[aria-hidden="true"]')) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") {
      return false;
    }
    return true;
  });
}

/**
 * Keeps keyboard focus inside `containerRef` while `active` is true.
 * Restores focus to the previously focused element on cleanup.
 */
export function useFocusTrap(active: boolean, containerRef: RefObject<HTMLElement | null>) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) {
      return;
    }

    const root = containerRef.current;
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = listFocusable(root);
    const first = focusables[0];
    if (first) {
      first.focus();
    } else {
      if (!root.hasAttribute("tabindex")) {
        root.setAttribute("tabindex", "-1");
      }
      root.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") {
        return;
      }
      const nodes = listFocusable(root);
      if (nodes.length === 0) {
        return;
      }
      const firstEl = nodes[0];
      const lastEl = nodes[nodes.length - 1];
      const activeEl = document.activeElement;
      if (event.shiftKey) {
        if (activeEl === firstEl) {
          event.preventDefault();
          lastEl.focus();
        }
      } else if (activeEl === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.removeAttribute("tabindex");
      previousFocusRef.current?.focus?.();
    };
  }, [active, containerRef]);
}
