import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build output goes to `dist/` (instead of `.next/`) so `ts-only`,
  // which ignores `node_modules` and `dist`, never trips over generated JS.
  distDir: "dist",
  reactStrictMode: true,
};

export default nextConfig;
