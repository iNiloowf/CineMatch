"use client";

import { DiscoverPageByVariant } from "../discover/discover-route-shell";

/** Always shows Discover variant 1 (original layout) for A/B comparison. */
export default function Discover1Page() {
  return <DiscoverPageByVariant variant="discover1" />;
}
