"use client";

import { useRouter } from "next/navigation";
import { useCallback, type RefObject } from "react";
import { bottomTabNavItems } from "@/lib/bottom-tab-nav";
import { useSegmentedPillDrag } from "@/lib/use-segmented-pill-drag";

/** Total horizontal padding inside the pill track (matches `px-1.5` × 2). */
const PILL_TRACK_PADDING_PX = 12;

export function useBottomNavPillDrag(opts: {
  panelRef: RefObject<HTMLDivElement | null>;
  pillIndex: number;
  hasTabMatch: boolean;
  reduceMotion: boolean;
}) {
  const { panelRef, pillIndex, hasTabMatch, reduceMotion } = opts;
  const router = useRouter();

  const onIndexCommit = useCallback(
    (index: number) => {
      router.push(bottomTabNavItems[index].href);
    },
    [router],
  );

  const { onSegmentClick, ...segmented } = useSegmentedPillDrag({
    panelRef,
    tabCount: bottomTabNavItems.length,
    activeIndex: pillIndex,
    enabled: hasTabMatch,
    reduceMotion,
    trackPaddingPx: PILL_TRACK_PADDING_PX,
    activeSlotSelector: '[data-bottom-nav-link="true"][data-active="true"]',
    onIndexCommit,
  });

  return {
    ...segmented,
    onLinkClick: onSegmentClick,
  };
}
