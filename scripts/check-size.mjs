/**
 * First-load JavaScript budget, measured on the static export.
 *
 * For each page, sums the gzipped size of every script its HTML loads up front, and
 * fails if a page goes over budget. Lazy chunks (MapLibre, Three.js, renderers, the
 * add-layer form) are not in the HTML, so this is exactly what a visitor waits for.
 *
 *   pnpm build && pnpm size
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const OUT = "out";
const BUDGET_KB = Number(process.env.FIRST_LOAD_BUDGET_KB ?? 300);
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const PAGES = [
  ["/", "index.html"],
  ["/config", "config/index.html"],
];

const kb = (bytes) => bytes / 1024;
let failed = false;

for (const [route, file] of PAGES) {
  const html = readFileSync(join(OUT, file), "utf8");
  const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => match[1]))];

  let total = 0;
  for (const src of scripts) {
    const path = join(OUT, src.replace(basePath, ""));
    if (existsSync(path)) total += gzipSync(readFileSync(path)).length;
  }

  const over = kb(total) > BUDGET_KB;
  failed ||= over;
  console.log(
    `${over ? "✗" : "✓"} ${route.padEnd(8)} ${kb(total).toFixed(1)} kB gzip (${scripts.length} scripts, budget ${BUDGET_KB} kB)`,
  );
}

if (failed) {
  console.error("\nFirst-load JavaScript is over budget. Run `pnpm analyze` to see what grew.");
  process.exit(1);
}
