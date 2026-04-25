"use client";

import { DiscoverPageByVariant } from "../discover/discover-route-shell";

/** Always shows Discover variant 2 (alternate layout) for A/B comparison. */
export default function Discover2Page() {
  return <DiscoverPageByVariant variant="discover2" />;
}
