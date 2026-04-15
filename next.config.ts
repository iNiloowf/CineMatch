import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Clear-Site-Data",
            value: "\"cookies\"",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
