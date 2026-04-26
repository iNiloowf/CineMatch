"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppRouteLoading } from "@/components/app-route-status";
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
    logout,
  } = useAppState();

  useEffect(() => {
    if (isReady && !currentUserId) {
      router.replace("/");
    }
  }, [currentUserId, isReady, router]);

  if (!isReady) {
    return (
      <AppRouteLoading
        ariaLabel="Loading app"
        message="Starting CineMatch…"
        isDarkMode={isDarkMode}
        visual="skeleton"
        slowHintMessage="This is taking a while. Check that you are online, then try refreshing the page if needed."
      />
    );
  }

  if (accountSyncError && currentUserId && !currentUser) {
    return (
      <div className="app-safe-x flex min-w-0 flex-1 items-center justify-center py-8">
        <NetworkStatusBlock
          variant="error"
          isDarkMode={isDarkMode}
          title="Couldn’t sync your account"
          description={accountSyncError}
          onRetry={retryAccountSync}
          secondaryAction={{
            label: "Back to sign in",
            onClick: () => {
              void logout().then(() => router.replace("/"));
            },
          }}
        />
      </div>
    );
  }

  if (!currentUser && currentUserId) {
    return (
      <AppRouteLoading
        ariaLabel="Loading your profile"
        message={
          isSyncingAccountData
            ? "Syncing your picks, links, and profile…"
            : "Loading your movie lounge…"
        }
        isDarkMode={isDarkMode}
        visual="skeleton"
        slowHintMessage="Still syncing… A slow or offline connection can delay this. We’ll show your data as soon as it’s ready."
      />
    );
  }

  if (!currentUserId) {
    return (
      <div className="app-safe-x flex min-w-0 flex-1 items-center justify-center py-8">
        <div
          className="mx-auto flex w-full min-w-0 max-w-md flex-col items-center gap-4"
          role="status"
          aria-live="polite"
          aria-label="Redirecting to sign in"
        >
          <div
            className={`h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-t-transparent ${
              isDarkMode ? "border-white/20 border-t-violet-300" : "border-slate-200 border-t-violet-600"
            }`}
            aria-hidden
          />
          <p
            className={`text-center text-sm font-medium ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            Redirecting to sign in…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
