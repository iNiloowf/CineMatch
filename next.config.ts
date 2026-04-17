import path from "path";
import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
};

export default withBundleAnalyzer(nextConfig);
