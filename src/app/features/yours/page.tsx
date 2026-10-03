"use client";

import { FeatureIntroScreen } from "@/components/feature-intro-screen";

export default function FeatureYoursPage() {
  return (
    <FeatureIntroScreen
      step={3}
      title="Keep what you picked"
      summary="Accepted titles stay in Picks. Mark one watched when you finish it."
      demo="yours"
      backHref="/features/together"
      nextHref="/signup"
      nextLabel="Create an account"
    />
  );
}
