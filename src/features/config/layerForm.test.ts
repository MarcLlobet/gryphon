import { describe, expect, it } from "vitest";
import { ConfigSchema, LayerSchema, type LayerType } from "@/core/config/schema";
import { supportedTypes } from "@/renderers/registry";
import {
  buildLayer,
  emptyValues as cleared,
  EXAMPLE_VALUES as EXAMPLES,
  extrasOf,
  toFormValues,
  fieldForIssue,
  fieldsFor,
  type FormValues,
} from "./layerForm";

/** A filled-in form for each protocol, as a user would complete it. */
const completedForms: Record<LayerType, FormValues> = {
  geojson: {
    id: "quakes",
    title: "Earthquakes",
    url: "https://example.com/quakes.geojson",
    draw: "circle",
    color: "#fca50a",
    radius: "6",
  },
  raster: {
    id: "basemap-overlay",
    title: "Overlay",
    tiles: "https://tiles.example.com/{z}/{x}/{y}.png",
    tileSize: "512",
  },
  vector: {
    id: "parcels",
    title: "Parcels",
    tiles: "https://tiles.example.com/{z}/{x}/{y}.pbf",
    sourceLayer: "parcels",
    draw: "fill",
    color: "#932667",
  },
  csv: {
    id: "fires",
    title: "Active fire",
    url: "https://firms.example.com/csv",
    lat: "latitude",
    lon: "longitude",
    draw: "heatmap",
    authName: "MAP_KEY",
    authIn: "query",
  },
  image: {
    id: "scan",
    title: "Scanned map",
    url: "https://example.com/scan.png",
    bbox: "1.9,41.25,2.3,41.5",
  },
  stac: {
    id: "sentinel",
    title: "Sentinel-2",
    endpoint: "https://earth-search.example.com/v1",
    tiler: "https://tiler.example.com/v1",
    collection: "sentinel-2-l2a",
    assets: "red, green, blue",
    colormap: "",
    rescaleMin: "0",
    rescaleMax: "3000",
    maxCloudCover: "20",
    footprints: true,
  },
};

describe("the guided form", () => {
  it("offers fields for every protocol this build can paint", () => {
    expect(Object.keys(fieldsFor).sort()).toEqual([...supportedTypes()].sort());
  });

  it("always asks for an identifier and a title", () => {
    for (const fields of Object.values(fieldsFor)) {
      const names = fields.map((field) => field.name);
      expect(names.slice(0, 2)).toEqual(["id", "title"]);
    }
  });

  it("only offers fields the assembler knows how to read", () => {
    for (const [type, fields] of Object.entries(fieldsFor)) {
      const candidate = buildLayer(type as LayerType, completedForms[type as LayerType]);
      expect(candidate.ok || candidate.error).toBeTruthy();
      expect(fields.length).toBeGreaterThan(2);
    }
  });
});

describe.each(supportedTypes())("a completed %s form", (type) => {
  it("produces a layer the schema accepts", () => {
    const built = buildLayer(type, completedForms[type]);

    expect(built.ok ? [] : built.error).toEqual([]);
  });

  it("round-trips: what it produces parses again unchanged", () => {
    const built = buildLayer(type, completedForms[type]);
    if (!built.ok) {
      throw new Error("expected a valid layer");
    }

    expect(LayerSchema.parse(built.value)).toEqual(built.value);
  });

  it("produces a layer a whole document will accept", () => {
    const built = buildLayer(type, completedForms[type]);
    if (!built.ok) {
      throw new Error("expected a valid layer");
    }

    const document = ConfigSchema.safeParse({ version: 1, layers: [built.value] });
    expect(document.success).toBe(true);
  });
});

describe("validation", () => {
  it("rejects an empty form rather than adding a broken layer", () => {
    const built = buildLayer("geojson", {});

    expect(built.ok).toBe(false);
  });

  it("rejects a malformed URL", () => {
    const built = buildLayer("geojson", { ...completedForms.geojson, url: "not a url" });

    expect(built.ok).toBe(false);
    expect(built.ok ? "" : fieldForIssue(built.error[0]!)).toBe("url");
  });

  it("points a nested failure back at the field the user can fix", () => {
    const built = buildLayer("stac", { ...completedForms.stac, assets: "" });

    expect(built.ok).toBe(false);
    expect(built.ok ? "" : fieldForIssue(built.error[0]!)).toBe("assets");
  });

  it("rejects an image area that is not four numbers", () => {
    const built = buildLayer("image", { ...completedForms.image, bbox: "1.9,41.25" });

    expect(built.ok).toBe(false);
    expect(built.ok ? "" : fieldForIssue(built.error[0]!)).toBe("bbox");
  });

  it("keeps a credential slot without ever holding its value", () => {
    const built = buildLayer("csv", completedForms.csv);

    expect(built.ok && built.value.auth).toEqual({ in: "query", name: "MAP_KEY" });
    expect(JSON.stringify(built.ok ? built.value : {})).not.toContain("secret");
  });

  it("treats an open source as needing no credential", () => {
    const built = buildLayer("csv", { ...completedForms.csv, authName: "" });

    expect(built.ok && built.value.auth).toBeUndefined();
  });
});

describe("the prefilled examples", () => {
  it.each(Object.keys(EXAMPLES) as (keyof typeof EXAMPLES)[])("builds a valid %s layer", (type) => {
    const built = buildLayer(type, EXAMPLES[type]);
    expect(built.ok).toBe(true);
  });

  it("only fills fields the form actually shows", () => {
    for (const [type, values] of Object.entries(EXAMPLES) as [keyof typeof EXAMPLES, Record<string, unknown>][]) {
      const shown = Object.keys(cleared(type));
      expect(Object.keys(values).every((name) => shown.includes(name))).toBe(true);
    }
  });
});

describe("icons", () => {
  it("accepts any Lucide icon name", () => {
    expect(buildLayer("geojson", { ...EXAMPLES.geojson, icon: "flame" }).ok).toBe(true);
  });

  it("refuses a name Lucide does not have, on the icon field", () => {
    const built = buildLayer("geojson", { ...EXAMPLES.geojson, icon: "weather" });

    expect(built.ok).toBe(false);
    if (!built.ok) {
      expect(built.error.map(fieldForIssue)).toEqual(["icon"]);
    }
  });

  it("leaves the icon optional", () => {
    expect(buildLayer("geojson", { ...EXAMPLES.geojson, icon: "" }).ok).toBe(true);
  });
});

describe("showing a stored layer in its form", () => {
  it.each(Object.keys(EXAMPLES) as (keyof typeof EXAMPLES)[])("round-trips the %s example", (type) => {
    const built = buildLayer(type, EXAMPLES[type]);
    if (!built.ok) throw new Error("example should build");

    const values = toFormValues(built.value);
    const rebuilt = buildLayer(type, values);

    expect(rebuilt.ok && rebuilt.value).toEqual(built.value);
  });

  it("lists what the form does not show, as declared", () => {
    const layer = LayerSchema.parse({
      id: "quakes",
      title: "Quakes",
      type: "geojson",
      url: "https://example.com/q.geojson",
      opacity: 0.6,
      style: {
        color: "#fff",
        radiusBy: {
          property: "mag",
          stops: [
            [1, 2],
            [8, 16],
          ],
        },
      },
      legend: { kind: "categories", items: [{ label: "Quake", color: "#fff" }] },
    });

    const extras = extrasOf(layer);

    expect(extras).toMatchObject({
      opacity: 0.6,
      style: { radiusBy: { property: "mag" } },
      legend: { kind: "categories" },
    });
    expect(extras).not.toHaveProperty("url");
    expect(extras.style).not.toHaveProperty("color");
  });
});
