"use client";

import { useEffect } from "react";
import { ErrorFallbackContent } from "@/components/error-fallback-content";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CineMatch] route error:", error);
  }, [error]);

  return (
    <ErrorFallbackContent
      onReset={reset}
      errorDigest={error.digest}
      errorMessage={error.message}
    />
  );
}
