"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

export type UseAccountSyncTriggersOptions = {
  enabled: boolean;
  onRequestSync: () => void;
};

/**
 * Triggers a server data refresh when the tab becomes visible again, the window
 * regains focus, or the browser goes back online — replaces a fixed 7s poll.
 */
export function useAccountSyncTriggers({
  enabled,
  onRequestSync,
}: UseAccountSyncTriggersOptions) {
  const onRequestSyncRef = useRef(onRequestSync);
  useLayoutEffect(() => {
    onRequestSyncRef.current = onRequestSync;
  }, [onRequestSync]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const bumpIfVisible = () => {
      if (document.visibilityState === "visible") {
        onRequestSyncRef.current();
      }
    };

    const onVisibility = () => bumpIfVisible();
    const onFocus = () => bumpIfVisible();
    const onOnline = () => {
      onRequestSyncRef.current();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled]);
}
