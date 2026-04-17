"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NetworkStatusBlock } from "@/components/network-status-block";
import { DiscoverCardSkeleton } from "@/components/ui-skeleton";
import { useAppState } from "@/lib/app-state";

export function ProtectedScreen({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const {
    currentUser,
    currentUserId,
    isReady,
    isDarkMode,
    isSyncingAccountData,
    accountSyncError,
    retryAccountSync,
  } = useAppState();

  useEffect(() => {
    if (isReady && !currentUserId) {
      router.replace("/");
    }
  }, [currentUserId, isReady, router]);

  if (!isReady) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div
          className="mx-auto w-full max-w-md space-y-4"
          role="status"
          aria-live="polite"
          aria-label="Loading app"
        >
          <DiscoverCardSkeleton />
          <p
            className={`text-center text-sm font-medium ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Starting CineMatch…
          </p>
        </div>
      </div>
    );
  }

  if (accountSyncError && currentUserId && !currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <NetworkStatusBlock
          variant="error"
          isDarkMode={isDarkMode}
          title="Couldn’t sync your account"
          description={accountSyncError}
          onRetry={retryAccountSync}
        />
      </div>
    );
  }

  if (!currentUser && currentUserId) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <div
          className="mx-auto w-full max-w-md space-y-4"
          role="status"
          aria-live="polite"
          aria-label="Loading your profile"
        >
          <DiscoverCardSkeleton />
          <p
            className={`text-center text-sm font-medium ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {isSyncingAccountData
              ? "Syncing your picks, links, and profile…"
              : "Loading your movie lounge…"}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUserId) {
    return null;
  }

  return <>{children}</>;
}
