"use client";

import { AppErrorScreen } from "@/components/app-error-screen";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[80svh] w-full flex-1 flex-col items-center justify-center px-4 py-8">
      <AppErrorScreen error={error} reset={reset} variant="embedded" />
    </div>
  );
}
