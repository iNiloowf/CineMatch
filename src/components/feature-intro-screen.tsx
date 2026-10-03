"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAppState } from "@/lib/app-state";
import { markFeatureIntroSeen } from "@/lib/feature-intro-seen";

type FeatureDemo = "discover" | "together" | "yours";

type FeatureIntroScreenProps = {
  step: 1 | 2 | 3;
  title: string;
  /** Read by screen readers. The visible page is the animation. */
  summary: string;
  demo: FeatureDemo;
  nextHref: string;
  nextLabel: string;
  backHref?: string;
};

function FeatureBlobs({ isDarkMode }: { isDarkMode: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className={`auth-landing-blob -left-24 top-[-18%] h-[min(52vw,22rem)] w-[min(52vw,22rem)] ${
          isDarkMode
            ? "bg-[radial-gradient(circle_at_30%_30%,rgba(139,92,246,0.55),transparent_62%)]"
            : "bg-[radial-gradient(circle_at_30%_30%,rgba(167,139,250,0.5),transparent_62%)]"
        }`}
      />
      <div
        className={`auth-landing-blob auth-landing-blob--b right-[-20%] bottom-[-10%] h-[min(60vw,26rem)] w-[min(60vw,26rem)] ${
          isDarkMode
            ? "bg-[radial-gradient(circle_at_40%_40%,rgba(217,70,239,0.38),transparent_58%)]"
            : "bg-[radial-gradient(circle_at_40%_40%,rgba(192,132,252,0.45),transparent_58%)]"
        }`}
      />
    </div>
  );
}

const POSTERS = [
  "/features/poster-1.jpg",
  "/features/poster-2.jpg",
  "/features/poster-3.jpg",
] as const;

function PosterFace({ src }: { src: string }) {
  return (
    <div className="feature-poster">
      <img src={src} alt="" />
      <span className="feature-poster-play" aria-hidden>
        ▶
      </span>
    </div>
  );
}

function DiscoverDemo() {
  return (
    <div className="feature-demo feature-demo--discover">
      <img className="feature-stage-profile" src="/features/profile-a.jpg" alt="" />
      <div className="feature-swipe-card feature-swipe-card--yes">
        <PosterFace src={POSTERS[0]} />
      </div>
      <div className="feature-swipe-card feature-swipe-card--no">
        <PosterFace src={POSTERS[1]} />
      </div>
      <div className="feature-swipe-card feature-swipe-card--hold">
        <PosterFace src={POSTERS[2]} />
      </div>
      <span className="feature-stamp feature-stamp--yes">♥</span>
      <span className="feature-stamp feature-stamp--no">✕</span>
    </div>
  );
}

function TogetherDemo() {
  return (
    <div className="feature-demo feature-demo--together">
      <span className="feature-person feature-person--left">
        <img src="/features/profile-a.jpg" alt="" />
      </span>
      <span className="feature-person feature-person--right">
        <img src="/features/profile-b.jpg" alt="" />
      </span>
      <span className="feature-fly-heart feature-fly-heart--left">♥</span>
      <span className="feature-fly-heart feature-fly-heart--right">♥</span>
      <div className="feature-match-card">
        <PosterFace src={POSTERS[0]} />
      </div>
      <div className="feature-shared-row">
        <img className="feature-shared-thumb" src={POSTERS[0]} alt="" />
        <span className="feature-shared-people">
          <img src="/features/profile-a.jpg" alt="" />
          <img src="/features/profile-b.jpg" alt="" />
        </span>
      </div>
    </div>
  );
}

function YoursDemo() {
  return (
    <div className="feature-demo feature-demo--yours">
      <div className="feature-you-header">
        <img src="/features/profile-a.jpg" alt="" />
      </div>
      {POSTERS.map((src, index) => (
        <div key={src} className={`feature-pick-row feature-pick-row--${index}`}>
          <img className="feature-pick-thumb" src={src} alt="" />
          <span className="feature-pick-lines" />
          <span className="feature-pick-check">✓</span>
        </div>
      ))}
    </div>
  );
}

const DEMOS: Record<FeatureDemo, () => ReactNode> = {
  discover: DiscoverDemo,
  together: TogetherDemo,
  yours: YoursDemo,
};

export function FeatureIntroScreen({
  step,
  title,
  summary,
  demo,
  nextHref,
  nextLabel,
  backHref,
}: FeatureIntroScreenProps) {
  const router = useRouter();
  const { isDarkMode, currentUserId, isReady } = useAppState();
  const Demo = DEMOS[demo];

  useEffect(() => {
    if (!isReady || currentUserId) {
      return;
    }
    markFeatureIntroSeen();
  }, [currentUserId, isReady]);

  useEffect(() => {
    if (!isReady || !currentUserId) {
      return;
    }
    router.replace("/discover");
  }, [currentUserId, isReady, router]);

  const pageBg = isDarkMode
    ? "bg-[linear-gradient(180deg,#0f0b1a_0%,#181127_38%,#09090f_100%)]"
    : "bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.45),transparent_32%),linear-gradient(180deg,#fcfbff_0%,#f5f7ff_36%,#eef4ff_72%,#fef7ff_100%)]";

  if (!isReady || currentUserId) {
    return (
      <div className={`auth-landing-stage ${pageBg}`}>
        <FeatureBlobs isDarkMode={isDarkMode} />
        <div className="relative z-[1] mx-auto flex w-full min-w-0 max-w-md flex-1 items-center justify-center">
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-600"}`}>
            {!isReady ? "Loading…" : "Taking you to Discover…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`auth-landing-stage ${pageBg}`}>
      <FeatureBlobs isDarkMode={isDarkMode} />
      <div className="relative z-[1] mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col justify-between gap-5">
        <div className="flex items-center justify-between gap-3">
          <p
            className={`text-xs font-semibold uppercase tracking-[0.28em] ${
              isDarkMode ? "text-violet-300" : "text-violet-600"
            }`}
          >
            CineMatch
          </p>
          <p className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            {step} of 3
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
          <h1
            className={`text-center text-[1.65rem] font-semibold tracking-tight ${
              isDarkMode ? "text-white" : "text-slate-900"
            }`}
          >
            {title}
          </h1>
          <p className="sr-only">{summary}</p>
          <div
            className={isDarkMode ? "feature-demo-shell feature-demo-shell--dark" : "feature-demo-shell"}
            aria-hidden
          >
            <Demo />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2" aria-hidden>
            {[1, 2, 3].map((index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index === step
                    ? "bg-violet-500"
                    : isDarkMode
                      ? "bg-white/15"
                      : "bg-violet-200"
                }`}
              />
            ))}
          </div>
          <Link
            href={nextHref}
            className={`block w-full rounded-[22px] px-4 py-3.5 text-center text-sm font-semibold text-white shadow-[0_20px_40px_rgba(109,40,217,0.35)] ${
              isDarkMode
                ? "bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-700"
                : "bg-gradient-to-br from-violet-600 via-violet-600 to-fuchsia-600"
            }`}
          >
            {nextLabel}
          </Link>
          <div className="flex items-center justify-between gap-3 text-sm">
            <Link
              href={backHref ?? "/"}
              className={`font-medium underline-offset-2 hover:underline ${
                isDarkMode ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {backHref ? "Back" : "Sign in"}
            </Link>
            <Link
              href="/signup"
              className={`font-semibold underline-offset-2 hover:underline ${
                isDarkMode ? "text-violet-200" : "text-violet-700"
              }`}
            >
              Skip to sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
