import type { NextConfig } from "next";
import { PERMANENT_REDIRECTS } from "./lib/redirects";

const nextConfig: NextConfig = {
  async redirects() {
    // permanent: true is a 308. This Next.js version does not emit a 301 from next.config.
    return PERMANENT_REDIRECTS.map((redirect) => ({
      source: redirect.source,
      destination: redirect.destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
