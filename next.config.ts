import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }

    return [
      {
        source: "/api",
        destination: "http://127.0.0.1:8000/api",
      },
    ];
  },
};

export default nextConfig;
