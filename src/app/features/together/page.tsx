"use client";

import { FeatureIntroScreen } from "@/components/feature-intro-screen";

export default function FeatureTogetherPage() {
  return (
    <FeatureIntroScreen
      step={2}
      title="Match with people you link"
      summary="When you and someone you connect with both accept the same title, it lands on your shared watchlist."
      demo="together"
      backHref="/features/discover"
      nextHref="/features/yours"
      nextLabel="Next"
    />
  );
}
