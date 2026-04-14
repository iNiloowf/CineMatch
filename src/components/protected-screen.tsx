"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/lib/app-state";

export function ProtectedScreen({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { currentUser, isReady } = useAppState();

  useEffect(() => {
    if (isReady && !currentUser) {
      router.replace("/");
    }
  }, [currentUser, isReady, router]);

  if (!isReady || !currentUser) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-[28px] bg-white/70 text-sm text-slate-500">
        Loading your movie lounge...
      </div>
    );
  }

  return <>{children}</>;
}
