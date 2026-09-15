"use client";

import { useLayoutEffect } from "react";
import {
  handleHardwareBackPress,
  type HardwareBackDecision,
} from "@/lib/android-hardware-back";

declare global {
  interface Window {
    __cinematchHardwareBack?: (canGoBack: boolean) => HardwareBackDecision;
  }
}

function closeOverlayViaEscape(): boolean {
  const event = new KeyboardEvent("keydown", {
    key: "Escape",
    code: "Escape",
    bubbles: true,
    cancelable: true,
  });
  const propagated = document.dispatchEvent(event);
  return !propagated || event.defaultPrevented;
}

/**
 * Exposes a hardware-back hook for the Android Capacitor shell.
 * MainActivity calls `window.__cinematchHardwareBack` so overlays close and
 * Next.js history is used instead of finishing the Activity.
 */
export function AndroidHardwareBackHandler() {
  useLayoutEffect(() => {
    let spaDepth = 0;
    const historyProto = window.history;
    const originalPushState = historyProto.pushState.bind(historyProto);

    historyProto.pushState = ((data, unused, url) => {
      spaDepth += 1;
      return originalPushState(data, unused, url);
    }) as History["pushState"];

    const onPopState = () => {
      spaDepth = Math.max(0, spaDepth - 1);
    };
    window.addEventListener("popstate", onPopState);

    window.__cinematchHardwareBack = (canGoBack: boolean) =>
      handleHardwareBackPress({
        canGoBack: Boolean(canGoBack) || spaDepth > 0,
        pathname: window.location.pathname,
        closeOverlay: closeOverlayViaEscape,
        goBack: () => {
          window.history.back();
        },
        goToParent: (parent) => {
          window.location.replace(new URL(parent, window.location.origin).toString());
        },
      });

    return () => {
      delete window.__cinematchHardwareBack;
      historyProto.pushState = originalPushState;
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
