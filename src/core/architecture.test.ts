/**
 * The dependency rule, enforced rather than documented.
 *
 * Gryphon's layers point inward: core knows nothing about renderers, renderers know
 * nothing about React, and the registry is the single place that names a concrete
 * handler. Those are the properties that make "adding a dataset is a JSON edit" true,
 * so they are asserted, not trusted.
 *
 * The rules below are written to hold as directories appear — a layer that does not
 * exist yet simply has no files to violate it.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Vitest runs from the repo root; `import.meta.url` is not a file URL under jsdom.
const SRC = join(process.cwd(), "src");

const sourceFiles = (): string[] =>
  readdirSync(SRC, { recursive: true, encoding: "utf8" })
    .filter((name) => /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name))
    .map((name) => name.replaceAll("\\", "/"));

const IMPORT = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/g;

const importsOf = (file: string): string[] => {
  const code = readFileSync(join(SRC, file), "utf8");
  return [...code.matchAll(IMPORT)].map((match) => match[1] ?? match[2] ?? "");
};

/** Every (file, import) pair under a directory, as readable "file -> specifier" strings. */
const edgesFrom = (prefix: string, forbidden: (specifier: string) => boolean): string[] =>
  sourceFiles()
    .filter((file) => file.startsWith(prefix))
    .flatMap((file) =>
      importsOf(file)
        .filter(forbidden)
        .map((specifier) => `${file} -> ${specifier}`),
    );

const startsWithAny = (specifier: string, prefixes: string[]): boolean =>
  prefixes.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`));

describe("the dependency rule", () => {
  it("finds the source tree (guards against the scan silently matching nothing)", () => {
    expect(sourceFiles().filter((file) => file.startsWith("core/")).length).toBeGreaterThan(0);
  });

  it("keeps core free of every outer layer", () => {
    const outer = ["@/renderers", "@/features", "@/app", "@/transport", "@/lib", "@/mocks", "@/test"];

    expect(edgesFrom("core/", (specifier) => startsWithAny(specifier, outer))).toEqual([]);
  });

  it("keeps core free of frameworks, so the domain is testable on its own", () => {
    const frameworks = ["react", "react-dom", "next", "maplibre-gl", "@tanstack/react-query"];

    expect(edgesFrom("core/", (specifier) => startsWithAny(specifier, frameworks))).toEqual([]);
  });

  it("names a concrete renderer only in the composition root", () => {
    // The renderers layer has exactly two entry points. Everything else inside it is
    // an implementation detail: if a feature could import `@/renderers/stac`, then
    // "adding a dataset is a JSON edit" would stop being true.
    const entryPoints = ["@/renderers/registry", "@/renderers/resolve"];

    const direct = sourceFiles()
      // A renderer may reach its own siblings; the rule is about crossing into the layer.
      .filter((file) => !file.startsWith("renderers/"))
      .flatMap((file) =>
        importsOf(file)
          .filter((specifier) => specifier.startsWith("@/renderers/") && !entryPoints.includes(specifier))
          .map((specifier) => `${file} -> ${specifier}`),
      );

    expect(direct).toEqual([]);
  });

  it("keeps renderers free of React, so they stay plain functions", () => {
    const frameworks = ["react", "react-dom", "next", "@tanstack/react-query"];

    expect(edgesFrom("renderers/", (specifier) => startsWithAny(specifier, frameworks))).toEqual([]);
  });
});
