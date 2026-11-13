import type { LayerType } from "@/core/config/schema";

/** How each protocol is introduced to someone who does not know the term. */
export const PROTOCOLS: Record<LayerType, { readonly name: string; readonly description: string }> = {
  geojson: {
    name: "Points, lines or areas",
    description: "A GeoJSON file or API, drawn as circles, lines, fills or a heatmap.",
  },
  csv: {
    name: "A table with coordinates",
    description: "A CSV file with latitude and longitude columns, like most science APIs.",
  },
  raster: { name: "Map tiles", description: "Pre-rendered image tiles from a tile server (XYZ or WMTS)." },
  vector: { name: "Vector tiles", description: "Mapbox Vector Tiles, styled here rather than on the server." },
  image: { name: "A single image", description: "One picture pinned to an area of the map, such as a radar snapshot." },
  stac: {
    name: "Satellite scenes",
    description: "A search in a STAC catalog, rendered by a tiler. The richest option.",
  },
};

/** The gallery's order: simplest first. */
export const PROTOCOL_ORDER: readonly LayerType[] = ["geojson", "csv", "raster", "vector", "image", "stac"];
