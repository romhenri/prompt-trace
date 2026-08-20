import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // No server of ours at runtime: `next build` emits plain static files in out/.
  output: "export",
  // Deep links resolve to out/compare/index.html on any dumb static host.
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
