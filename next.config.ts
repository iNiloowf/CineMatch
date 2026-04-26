import path from "path";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { getContentSecurityPolicy } from "./src/lib/csp";

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

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  /** Drop noisy `console.log` in production; keep `error` / `warn` for monitoring + Sentry. */
  compiler: {
    removeConsole: isProd ? { exclude: ["error", "warn"] } : false,
  },
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
  /**
   * Strict Content-Security-Policy (no inline script in prod; `src/lib/csp.ts`).
   * Capacitor loads the same deployment via `server.url`, so the webview receives
   * these headers from your origin. Use `CSP_*` envs for local/LAN or native quirks.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: getContentSecurityPolicy(),
          },
        ],
      },
    ];
  },
};

const analyzed = withBundleAnalyzer(nextConfig);

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(analyzed, {
      silent: true,
      widenClientFileUpload: true,
    })
  : analyzed;
