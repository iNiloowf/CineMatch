import type { ProfileSettings } from "@/lib/types";

export type SubscriptionTier = "free" | "pro";

export function getEffectiveSubscriptionTier(settings?: ProfileSettings): SubscriptionTier {
  void settings;
  // Temporary product flag: unlock all Pro-gated surfaces for every account.
  return "pro";
}
