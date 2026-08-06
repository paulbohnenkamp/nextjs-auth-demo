import type { NextConfig } from "next";

/** Next.js build, routing, and Turbopack settings for this repository. */
const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
