import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

/** `pnpm analyze` builds once and opens a treemap of every chunk, per route. */
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

/** GitHub Pages serves the project under /gryphon; locally it is the root. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * Gryphon has no backend: it is a renderer, and the browser calls every source
   * directly. Exporting statically makes that explicit and keeps a route handler
   * from quietly reintroducing a server dependency.
   */
  output: "export",
  images: { unoptimized: true },
  basePath,
  // /config/index.html rather than /config.html, which every static host resolves.
  trailingSlash: true,
  // Memoises components and hooks automatically, so correctness does not depend on
  // remembering every useMemo and useCallback.
  reactCompiler: true,
  // A typo in a Link's href becomes a type error.
  typedRoutes: true,
};

export default withBundleAnalyzer(nextConfig);
