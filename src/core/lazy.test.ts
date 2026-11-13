/**
 * Lazy loading, enforced rather than hoped for.
 *
 * The heavy libraries must never be part of the first load: each may only be reached
 * through a dynamic `import()`, or as `import type`, which leaves nothing behind in
 * the bundle. A static import anywhere would quietly pull it into the page's main
 * chunk, and nothing else would notice. Run `pnpm analyze` to see the result.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");

const sourceFiles = (): string[] =>
  readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => name.replaceAll("\\", "/"));

/** Static value imports of a package: `import x from "pkg"` or `import "pkg/…"`, not `import type`. */
const staticImportsOf = (file: string, pkg: string): string[] => {
  const code = readFileSync(join(SRC, file), "utf8");
  const pattern = new RegExp(String.raw`^\s*import\s+(?!type\b)[^;]*?["'](?:${pkg})(?:/[^"']*)?["']`, "gm");
  return [...code.matchAll(pattern)].map((match) => `${file}: ${match[0].trim()}`);
};

/**
 * Modules allowed to import a heavy library statically, because they are themselves
 * only ever reached through `import()`.
 */
const LAZY_ENTRY = {
  three: ["features/intro/IntroScene.ts"],
  // The stylesheet is imported by the map component, which only the map page renders.
  "maplibre-gl": ["features/map/MapCanvas.tsx"],
} as const;

describe("heavy libraries stay out of the first load", () => {
  it.each(Object.entries(LAZY_ENTRY))("%s is only imported where it is lazy", (pkg, allowed) => {
    const offenders = sourceFiles()
      .filter((file) => !(allowed as readonly string[]).includes(file))
      .flatMap((file) => staticImportsOf(file, pkg));

    expect(offenders).toEqual([]);
  });

  it("only reaches the intro scene through a dynamic import", () => {
    const offenders = sourceFiles()
      .filter((file) => file !== "features/intro/IntroScene.ts")
      .flatMap((file) => staticImportsOf(file, "\\./IntroScene|@/features/intro/IntroScene"));

    expect(offenders).toEqual([]);
  });

  it("lets MapCanvas import only MapLibre's stylesheet statically", () => {
    expect(staticImportsOf("features/map/MapCanvas.tsx", "maplibre-gl")).toEqual([
      'features/map/MapCanvas.tsx: import "maplibre-gl/dist/maplibre-gl.css"',
    ]);
  });
});
