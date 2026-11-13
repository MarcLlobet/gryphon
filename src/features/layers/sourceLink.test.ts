import { describe, expect, it } from "vitest";
import { LayerSchema } from "@/core/config/schema";
import { sourceLinkOf } from "./sourceLink";

const layer = (input: Record<string, unknown>) => LayerSchema.parse({ id: "l", title: "L", ...input });

describe("sourceLinkOf", () => {
  it("links to the file or API a layer fetches", () => {
    expect(sourceLinkOf(layer({ type: "geojson", url: "https://example.com/a.geojson" }))).toEqual({
      href: "https://example.com/a.geojson",
      label: "https://example.com/a.geojson",
    });
  });

  it("shows a tile template without pretending it can be opened", () => {
    expect(sourceLinkOf(layer({ type: "raster", tiles: ["https://t.example/{z}/{x}/{y}.png"] }))).toEqual({
      href: null,
      label: "https://t.example/{z}/{x}/{y}.png",
    });
  });

  it("links a STAC layer to its collection", () => {
    const stac = layer({
      type: "stac",
      endpoint: "https://stac.example/v1",
      tiler: "https://tiler.example",
      collection: "landsat-c2-l2",
      render: { assets: ["lwir11"] },
    });

    expect(sourceLinkOf(stac)).toEqual({
      href: "https://stac.example/v1/collections/landsat-c2-l2",
      label: "https://stac.example/v1 · landsat-c2-l2",
    });
  });

  it("explains a layer that borrows another layer's data", () => {
    expect(sourceLinkOf(layer({ type: "geojson", sourceOf: "quakes" })).label).toMatch(/quakes/);
  });
});
