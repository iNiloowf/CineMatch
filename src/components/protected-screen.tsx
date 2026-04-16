"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/app-state";

export function ProtectedScreen({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, currentUserId, isReady } = useAppState();

  useEffect(() => {
    if (isReady && !currentUserId) {
      router.replace("/");
    }
  }, [currentUserId, isReady, router]);

  if (!isReady || (!currentUser && currentUserId)) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-[28px] bg-white/70 text-sm text-slate-500">
        Loading your movie lounge...
      </div>
    );
  }

  if (!currentUserId) {
    return null;
  }

  return <>{children}</>;
}
