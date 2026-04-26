import path from "path";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const supabaseMediaHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
})();

const nextConfig: NextConfig = {
  images: {
    /** Edge/CDN cache for optimized poster URLs (TMDB + Supabase); faster repeat views. */
    minimumCacheTTL: 60 * 60 * 24 * 7,
    formats: ["image/avif", "image/webp"],
    deviceSizes: [400, 640, 750, 828, 1080, 1200],
    imageSizes: [32, 48, 64, 96, 120, 180, 256, 320],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      ...(supabaseMediaHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseMediaHost,
              pathname: "/storage/v1/object/**",
            },
          ]
        : []),
    ],
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

const analyzed = withBundleAnalyzer(nextConfig);

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(analyzed, {
      silent: true,
      widenClientFileUpload: true,
    })
  : analyzed;
