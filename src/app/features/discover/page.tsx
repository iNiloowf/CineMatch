"use client";

import { FeatureIntroScreen } from "@/components/feature-intro-screen";

export default function FeatureDiscoverPage() {
  return (
    <FeatureIntroScreen
      step={1}
      title="Find movies and series"
      summary="Swipe right to keep a title, or left to skip it. Open a poster for the trailer."
      demo="discover"
      nextHref="/features/together"
      nextLabel="Next"
    />
  );
}
