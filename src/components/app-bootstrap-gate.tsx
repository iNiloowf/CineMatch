"use client";

import type { ReactNode } from "react";
import { useLayoutEffect, useState } from "react";
import { AppRouteLoading } from "@/components/app-route-status";
import { useAppState } from "@/lib/app-state";

export function AppBootstrapGate({ children }: { children: ReactNode }) {
  const { isReady, isDarkMode } = useAppState();
  const [isHydrated, setIsHydrated] = useState(false);
  const [bootThemeDarkMode, setBootThemeDarkMode] = useState(false);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const darkFromBoot =
      root.classList.contains("theme-dark") || root.style.colorScheme === "dark";
    setBootThemeDarkMode(darkFromBoot);
    setIsHydrated(true);
  }, []);

  if (!isHydrated || !isReady) {
    return (
      <AppRouteLoading
        ariaLabel="Loading app"
        message="Preparing your movie lounge…"
        isDarkMode={isReady ? isDarkMode : bootThemeDarkMode}
        visual="spinner"
        frameClassName="app-safe-x flex min-w-0 flex-1 items-center justify-center py-8"
      />
    );
  }

  return <>{children}</>;
}
