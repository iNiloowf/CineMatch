"use client";

import { SurfaceCard } from "@/components/surface-card";
import { useAppState } from "@/lib/app-state";

function Bone({ className }: { className?: string }) {
  return <div className={`ui-skeleton-shimmer ${className ?? ""}`} aria-hidden />;
}

export function SearchResultRowSkeleton() {
  const { isDarkMode } = useAppState();
  const shell = isDarkMode
    ? "border-white/10 bg-white/6"
    : "border-white/80 bg-white/80 shadow-[0_14px_34px_rgba(148,163,184,0.08)]";

  return (
    <div
      className={`flex items-start gap-3 rounded-[24px] border px-4 py-4 ${shell}`}
      aria-hidden
    >
      <Bone className="h-16 w-14 shrink-0 rounded-[16px]" />
      <div className="min-w-0 flex-1 space-y-2.5 py-0.5">
        <div className="flex gap-2">
          <Bone className="h-4 min-w-0 flex-1 rounded-md" />
          <Bone className="h-4 w-14 shrink-0 rounded-md" />
        </div>
        <Bone className="h-3 w-full rounded-md" />
        <Bone className="h-3 w-[88%] rounded-md" />
        <div className="flex gap-2 pt-1">
          <Bone className="h-6 w-12 rounded-full" />
          <Bone className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

type SearchResultsSkeletonListProps = {
  rows?: number;
};

export function SearchResultsSkeletonList({ rows = 5 }: SearchResultsSkeletonListProps) {
  return (
    <div
      className="discover-skeleton-dissolve space-y-3"
      role="status"
      aria-live="polite"
      aria-label="Loading search results"
    >
      {Array.from({ length: rows }, (_, index) => (
        <SearchResultRowSkeleton key={index} />
      ))}
    </div>
  );
}

export function DiscoverCardSkeleton() {
  const { isDarkMode } = useAppState();
  const statShell = isDarkMode
    ? "border border-white/14 bg-white/10"
    : "border border-slate-200/90 bg-slate-50/95 shadow-sm";

  return (
    <SurfaceCard
      shimmer={false}
      className="discover-skeleton-dissolve flex min-h-0 flex-1 flex-col gap-2.5 rounded-[30px] p-4"
    >
      <Bone className="relative min-h-[11.125rem] shrink-0 rounded-[10px] sm:min-h-[12rem]" />
      <div className={`grid shrink-0 grid-cols-3 gap-1 rounded-[24px] px-2 py-2 sm:gap-2 sm:px-3 sm:py-2.5 ${statShell}`}>
        <div className="flex flex-col items-center justify-center gap-1 py-0.5">
          <Bone className="h-3.5 w-8 rounded-md" />
          <Bone className="h-2.5 w-12 rounded-md" />
        </div>
        <div
          className={`flex flex-col items-center justify-center gap-1 border-x py-0.5 ${
            isDarkMode ? "border-white/12" : "border-black/8"
          }`}
        >
          <Bone className="h-3.5 w-10 rounded-md" />
          <Bone className="h-2.5 w-14 rounded-md" />
        </div>
        <div className="flex flex-col items-center justify-center gap-1 py-0.5">
          <Bone className="h-3.5 w-7 rounded-md" />
          <Bone className="h-2.5 w-11 rounded-md" />
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5">
        <Bone className="h-6 w-16 rounded-full" />
        <Bone className="h-6 w-20 rounded-full" />
        <Bone className="h-6 w-14 rounded-full" />
      </div>
      <Bone className="h-5 w-[78%] rounded-md" />
      <div className="space-y-2">
        <Bone className="h-3 w-full rounded-md" />
        <Bone className="h-3 w-full rounded-md" />
        <Bone className="h-3 w-[88%] rounded-md" />
      </div>
      <div className="mb-8 mt-auto flex shrink-0 gap-2 sm:gap-3">
        <Bone className="h-11 min-h-11 flex-1 rounded-[22px]" />
        <Bone className="h-11 min-h-11 flex-1 rounded-[22px]" />
      </div>
    </SurfaceCard>
  );
}
