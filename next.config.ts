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
