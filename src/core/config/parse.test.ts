import { describe, expect, it } from "vitest";
import { parseConfig, parseConfigJson } from "./parse";
import { DEFAULT_BASEMAP } from "./schema";

const minimal = { version: 1, layers: [] };

describe("parseConfig", () => {
  it("fills in documented defaults", () => {
    const result = parseConfig(minimal);

    expect(result.ok && result.value.basemap).toBe(DEFAULT_BASEMAP);
  });

  it("defaults a layer's visibility and opacity", () => {
    const result = parseConfig({
      version: 1,
      layers: [{ id: "a", title: "A", type: "geojson", url: "https://example.com/a.geojson" }],
    });

    expect(result.ok && result.value.layers[0]).toMatchObject({ visible: true, opacity: 1, draw: "circle" });
  });

  it("addresses each issue by a path the editor can highlight", () => {
    const result = parseConfig({
      version: 1,
      layers: [{ id: "a", title: "A", type: "raster", tiles: [] }],
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error[0]?.path).toBe("layers/0/tiles");
  });

  it("rejects an unknown layer type rather than rendering nothing", () => {
    const result = parseConfig({ version: 1, layers: [{ id: "a", title: "A", type: "wms" }] });

    expect(result.ok).toBe(false);
  });

  it("keeps a credential slot but never a credential value", () => {
    const result = parseConfig({
      version: 1,
      layers: [
        {
          id: "fires",
          title: "Fires",
          type: "csv",
          url: "https://example.com/fires.csv",
          lat: "latitude",
          lon: "longitude",
          auth: { in: "query", name: "MAP_KEY", value: "s3cret" },
        },
      ],
    });

    expect(result.ok).toBe(true);
    // `value` is not in the schema, so Zod strips it: a secret cannot be written down.
    expect(result.ok && result.value.layers[0]?.auth).toEqual({ in: "query", name: "MAP_KEY" });
  });
});

describe("parseConfigJson", () => {
  it("reads a document from text", () => {
    const result = parseConfigJson(JSON.stringify(minimal));

    expect(result.ok).toBe(true);
  });

  it("reports malformed JSON as one root issue instead of throwing", () => {
    const result = parseConfigJson("{ nope");

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error[0]?.path).toBe("");
  });
});
