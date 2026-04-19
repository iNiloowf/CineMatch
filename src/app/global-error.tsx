"use client";

import { useEffect } from "react";
import { AppErrorScreen } from "@/components/app-error-screen";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      const currentUserId = window.localStorage.getItem("cinematch-current-user-v5");
      const userTheme = currentUserId
        ? window.localStorage.getItem(`cinematch-user-theme-${currentUserId}`)
        : null;
      const globalTheme = window.localStorage.getItem("cinematch-theme-mode");
      const shouldUseDark = userTheme ? userTheme === "dark" : globalTheme === "dark";
      document.documentElement.classList.toggle("theme-dark", !!shouldUseDark);
      document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
      if (document.body) {
        document.body.style.background = shouldUseDark ? "#0d0a14" : "#f6f7fb";
        document.body.style.color = shouldUseDark ? "#f8fafc" : "#0f172a";
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <AppErrorScreen error={error} reset={reset} variant="global" />
      </body>
    </html>
  );
}
