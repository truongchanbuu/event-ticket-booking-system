import type { NextConfig } from "next";
import path from "path";

const nextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/events",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
