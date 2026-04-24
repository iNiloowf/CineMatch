"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReactNode } from "react";
import { useRef } from "react";

/** Use virtual scrolling only when lists are long enough to benefit (avoids extra layout work for short lists). */
export const LIST_VIRTUALIZE_THRESHOLD = 24;

export function shouldVirtualizeList(length: number) {
  return length >= LIST_VIRTUALIZE_THRESHOLD;
}

type VirtualScrollListProps = {
  count: number;
  estimateItemSize: number;
  className?: string;
  children: (index: number) => ReactNode;
};

export function VirtualScrollList({
  count,
  estimateItemSize,
  className,
  children,
}: VirtualScrollListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateItemSize,
    overscan: 8,
  });

  return (
    <div
      ref={parentRef}
      className={
        className ??
        "max-h-[min(70vh,40rem)] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
      }
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            className="absolute left-0 top-0 w-full"
            style={{
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div className="pb-3 sm:pb-3.5">{children(virtualRow.index)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
