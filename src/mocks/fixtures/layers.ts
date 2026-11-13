/**
 * One valid sample per layer type, parsed through the schema so defaults are applied.
 *
 * The conformance suite runs every registered renderer against its sample, so a new
 * protocol inherits the whole contract the moment it is added here.
 */
import { LayerSchema, type LayerConfig, type LayerType } from "@/core/config/schema";

export const SAMPLE_ORIGIN = "https://sample.test";

const parse = (input: unknown): LayerConfig => LayerSchema.parse(input);

export const layerSamples: Record<LayerType, LayerConfig> = {
  geojson: parse({
    id: "sample-geojson",
    title: "Sample points",
    type: "geojson",
    url: `${SAMPLE_ORIGIN}/points.geojson`,
    draw: "circle",
    style: { radiusBy: { property: "mag", stops: [[1, 2] as [number, number], [8, 20] as [number, number]] } },
  }),
  raster: parse({
    id: "sample-raster",
    title: "Sample tiles",
    type: "raster",
    tiles: [`${SAMPLE_ORIGIN}/tiles/{z}/{x}/{y}.png`],
  }),
  image: parse({
    id: "sample-image",
    title: "Sample image",
    type: "image",
    url: `${SAMPLE_ORIGIN}/overlay.png`,
    coordinates: [
      [1.9, 41.5],
      [2.3, 41.5],
      [2.3, 41.25],
      [1.9, 41.25],
    ],
  }),
  vector: parse({
    id: "sample-vector",
    title: "Sample vector tiles",
    type: "vector",
    tiles: [`${SAMPLE_ORIGIN}/mvt/{z}/{x}/{y}.pbf`],
    sourceLayer: "things",
    draw: "fill",
  }),
  csv: parse({
    id: "sample-csv",
    title: "Sample CSV points",
    type: "csv",
    url: `${SAMPLE_ORIGIN}/points.csv`,
    lat: "latitude",
    lon: "longitude",
    auth: { in: "query", name: "MAP_KEY" },
  }),
  stac: parse({
    id: "sample-stac",
    title: "Sample catalog",
    type: "stac",
    endpoint: `${SAMPLE_ORIGIN}/stac/v1`,
    tiler: `${SAMPLE_ORIGIN}/data/v1`,
    collection: "sample-collection",
    render: { assets: ["lwir11"], colormap_name: "inferno", rescale: [[36322, 50951]], nodata: 0 },
    footprints: true,
  }),
};

/** Sample layers that reach the network, and the URL a test should break to fail them. */
export const networkedSamples: { type: LayerType; url: string; method: "GET" | "POST" }[] = [
  { type: "geojson", url: `${SAMPLE_ORIGIN}/points.geojson`, method: "GET" },
  { type: "csv", url: `${SAMPLE_ORIGIN}/points.csv`, method: "GET" },
  { type: "stac", url: `${SAMPLE_ORIGIN}/stac/v1/search`, method: "POST" },
];
