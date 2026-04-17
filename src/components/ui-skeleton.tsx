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
      className="space-y-3"
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
  return (
    <SurfaceCard className="flex min-h-0 flex-1 flex-col gap-3 rounded-[30px] p-4">
      <Bone className="relative min-h-[11.125rem] shrink-0 rounded-[10px] sm:min-h-[12rem]" />
      <div className="flex flex-wrap gap-2">
        <Bone className="h-6 w-20 rounded-full" />
        <Bone className="h-6 w-14 rounded-full" />
        <Bone className="h-6 w-16 rounded-full" />
      </div>
      <Bone className="h-5 w-[72%] rounded-md" />
      <div className="space-y-2">
        <Bone className="h-3 w-full rounded-md" />
        <Bone className="h-3 w-full rounded-md" />
        <Bone className="h-3 w-[90%] rounded-md" />
      </div>
      <div className="mt-auto flex gap-2 pt-1">
        <Bone className="h-11 min-h-11 flex-1 rounded-[var(--radius-control)]" />
        <Bone className="h-11 min-h-11 flex-1 rounded-[var(--radius-control)]" />
      </div>
    </SurfaceCard>
  );
}
