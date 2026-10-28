import type { NextConfig } from "next";

const config: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_DEMO_ACCESS: process.env.VERCEL === "1" ? "false" : "true",
  },
};

export default config;
