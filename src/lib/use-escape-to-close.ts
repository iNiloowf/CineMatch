"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Calls onClose when Escape is pressed while `open` is true.
 * Uses a ref for the callback so listeners stay stable across renders.
 */
export function useEscapeToClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      onCloseRef.current();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);
}
