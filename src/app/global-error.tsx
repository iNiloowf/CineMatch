"use client";

import { useEffect } from "react";
import { ErrorFallbackContent } from "@/components/error-fallback-content";
import "./globals.css";

/**
 * Root-level error boundary — renders when the root layout or its parents fail.
 * Must define `html` / `body` because it replaces the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CineMatch] global error:", error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full">
        <ErrorFallbackContent
          onReset={reset}
          errorDigest={error.digest}
          errorMessage={error.message}
        />
      </body>
    </html>
  );
}
