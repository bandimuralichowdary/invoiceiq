import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-expect-error - standard next.js config for ignoring linting
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
