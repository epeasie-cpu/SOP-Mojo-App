import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev HMR and client bundles are blocked when the browser uses 127.0.0.1
  // instead of localhost. Preview deploys are production builds and ignore this.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
