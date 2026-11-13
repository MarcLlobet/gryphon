import { describe, expect, it } from "vitest";
import { mergeConfig } from "./merge";
import type { GryphonConfigInput } from "./schema";

const layer = (id: string, title = id) =>
  ({ id, title, type: "geojson", url: `https://example.com/${id}.geojson` }) as const;

const base: GryphonConfigInput = {
  version: 1,
  layers: [layer("thermal"), layer("quakes")],
};

const merged = (overrides: unknown) => {
  const result = mergeConfig(base, overrides);
  if (!result.ok) {
    throw new Error(`merge failed: ${JSON.stringify(result.error)}`);
  }
  return result.value;
};

describe("mergeConfig", () => {
  it("returns the base document when there is nothing to override", () => {
    expect(merged({}).layers.map((l) => l.id)).toEqual(["thermal", "quakes"]);
  });

  it("appends a layer the user added", () => {
    const config = merged({ layers: [layer("fires")] });

    expect(config.layers.map((l) => l.id)).toEqual(["thermal", "quakes", "fires"]);
  });

  it("replaces a base layer when the ids match, keeping its position", () => {
    const config = merged({ layers: [{ ...layer("quakes"), title: "My quakes" }] });

    expect(config.layers.map((l) => l.id)).toEqual(["thermal", "quakes"]);
    expect(config.layers[1]?.title).toBe("My quakes");
  });

  it("suppresses removed base layers", () => {
    expect(merged({ removed: ["thermal"] }).layers.map((l) => l.id)).toEqual(["quakes"]);
  });

  it("applies per-layer visibility and opacity without cloning the layer", () => {
    const config = merged({ settings: { thermal: { visible: false, opacity: 0.25 } } });

    expect(config.layers[0]).toMatchObject({ id: "thermal", visible: false, opacity: 0.25 });
    // The untouched layer keeps the schema's defaults.
    expect(config.layers[1]).toMatchObject({ id: "quakes", visible: true, opacity: 1 });
  });

  it("reorders listed layers and leaves the rest in place", () => {
    const config = merged({ layers: [layer("fires")], order: ["quakes", "fires"] });

    expect(config.layers.map((l) => l.id)).toEqual(["quakes", "fires", "thermal"]);
  });

  it("overrides the basemap and view", () => {
    const config = merged({ basemap: "https://example.com/style.json", view: { zoom: 3 } });

    expect(config.basemap).toBe("https://example.com/style.json");
    expect(config.view).toEqual({ zoom: 3 });
  });

  it("reports issues instead of throwing when the base is invalid", () => {
    const result = mergeConfig({ version: 2, layers: [] });

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.error[0]?.path).toBe("version");
  });

  it("refuses an override that would smuggle in an invalid layer", () => {
    const result = mergeConfig(base, { layers: [{ id: "bad", title: "Bad", type: "geojson", url: "not-a-url" }] });

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error[0]?.path).toBe("layers/0/url");
  });
});
