import type { ProfileSettings } from "@/lib/types";

export type SubscriptionTier = "free" | "pro";

export function getEffectiveSubscriptionTier(settings?: ProfileSettings): SubscriptionTier {
  if (!settings) {
    return "free";
  }
  if (settings.adminModeSimulatePro) {
    return "pro";
  }
  return settings.subscriptionTier;
}
