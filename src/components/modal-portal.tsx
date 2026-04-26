"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

type ModalPortalProps = {
  open: boolean;
  children: ReactNode;
};

/**
 * Renders modal UI under `document.body` with `position: fixed` (viewport-relative),
 * avoiding offset bugs from scrollable routes / CSS transform ancestors.
 */
export function ModalPortal({ open, children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  useBodyScrollLock(open);

  if (!mounted || typeof document === "undefined" || !open) {
    return null;
  }

  return createPortal(children, document.body);
}
