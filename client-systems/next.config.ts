import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/pricing",
        destination: "/client-systems-kit",
        permanent: true,
      },
      {
        source: "/agency-client-onboarding",
        destination: "/client-onboarding",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
