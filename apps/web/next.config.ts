import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production
  output: "standalone",

  // API URL from environment
  env: {
    API_BASE_URL: process.env.API_BASE_URL || "http://localhost:8080",
  },

  // Image domains (update when adding remote images)
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },

  // Disable x-powered-by header
  poweredByHeader: false,

  // Redirect convenience shortcuts
  async redirects() {
    return [
      {
        source: "/pos",
        destination: "/admin/payments?tab=pos",
        permanent: false,
      },
      {
        source: "/login/pos",
        destination: "/admin/payments?tab=pos",
        permanent: false,
      },
      {
        source: "/admin/pos",
        destination: "/admin/payments?tab=pos",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
