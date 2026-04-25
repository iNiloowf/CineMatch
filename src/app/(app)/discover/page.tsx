"use client";

import { DISCOVER_DEFAULT_VARIANT } from "@/lib/discover-ab";
import { DiscoverPageByVariant } from "./discover-route-shell";

export default function DiscoverPage() {
  return <DiscoverPageByVariant variant={DISCOVER_DEFAULT_VARIANT} />;
}
