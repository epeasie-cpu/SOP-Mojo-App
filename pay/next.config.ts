import type { NextConfig } from "next";
import { embedFramePolicy } from "./lib/embed-frame";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/checkout/:slug",
        has: [{ type: "query", key: "embed", value: "1" }],
        headers: [{ key: "Content-Security-Policy", value: embedFramePolicy() }],
      },
    ];
  },
};

export default nextConfig;
