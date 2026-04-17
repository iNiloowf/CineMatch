"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NetworkStatusBlock } from "@/components/network-status-block";
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
        <NetworkStatusBlock
          variant="loading"
          isDarkMode={isDarkMode}
          title="Starting CineMatch…"
        />
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
        <NetworkStatusBlock
          variant="loading"
          isDarkMode={isDarkMode}
          title={
            isSyncingAccountData
              ? "Syncing your picks, links, and profile…"
              : "Loading your movie lounge…"
          }
        />
      </div>
    );
  }

  if (!currentUserId) {
    return null;
  }

  return <>{children}</>;
}
