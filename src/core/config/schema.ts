/**
 * The Gryphon configuration document.
 *
 * This schema is the application's single source of truth. Three things are derived
 * from it and therefore cannot drift:
 *
 *   z.infer<>        → the TypeScript types used everywhere
 *   z.toJSONSchema() → JSON Schema, for external config authors and editor autocomplete
 *   zodResolver()    → the in-app "add layer" forms
 *
 * Gryphon renders whatever this document declares. Adding a dataset is a JSON edit;
 * only a new *protocol* costs code (one renderer plus one variant below).
 */
import { z } from "zod";
import { BBoxSchema } from "@/core/geo/bbox";

/** Free dark basemap, no API key required. */
export const DEFAULT_BASEMAP = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

const Color = z.string().min(1).describe("A CSS colour, e.g. #fca50a");

/**
 * Declares *that* a layer needs a credential, never the credential itself.
 * The value is supplied at runtime and never written to the document: a secret
 * baked into a static bundle is not a secret.
 */
export const AuthSchema = z.object({
  in: z.enum(["query", "header"]).describe("Where to put the secret on the request"),
  name: z.string().min(1).describe("Query parameter or header name, e.g. MAP_KEY"),
});
export type Auth = z.infer<typeof AuthSchema>;

/** How a layer explains itself. Drives the legend UI; no layer is required to have one. */
export const LegendSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("ramp"),
    unit: z.string().optional(),
    min: z.number(),
    max: z.number(),
    colors: z.array(Color).min(2),
  }),
  z.object({
    kind: z.literal("categories"),
    items: z.array(z.object({ label: z.string(), color: Color })).min(1),
  }),
  z.object({
    kind: z.literal("scaled-circle"),
    unit: z.string().optional(),
    color: Color,
    stops: z.array(z.object({ value: z.number(), radius: z.number().positive() })).min(2),
  }),
]);
export type Legend = z.infer<typeof LegendSchema>;

/** Interpolate a paint property from a feature property — how a vector layer encodes a value. */
const dataDrivenOf = <T extends z.ZodTypeAny>(output: T) =>
  z.object({
    property: z.string().min(1),
    stops: z.array(z.tuple([z.number(), output])).min(2),
  });

/**
 * The styling knobs the guided form edits, plus `paint` as a raw MapLibre escape
 * hatch. `paint` is merged last and wins, so the typed fields stay the easy path
 * without ever becoming a ceiling.
 */
export const StyleSchema = z.object({
  color: Color.optional(),
  colorBy: dataDrivenOf(Color).optional(),
  radius: z.number().positive().optional(),
  radiusBy: dataDrivenOf(z.number().positive()).optional(),
  width: z.number().positive().optional(),
  paint: z.record(z.string(), z.unknown()).optional(),
});
export type Style = z.infer<typeof StyleSchema>;

/** The MapLibre primitives a vector source can be drawn with. */
export const DrawSchema = z.enum(["circle", "line", "fill", "heatmap", "symbol"]);
export type Draw = z.infer<typeof DrawSchema>;

const layerBase = {
  id: z.string().min(1),
  title: z.string().min(1),
  attribution: z.string().optional(),
  visible: z.boolean().default(true),
  opacity: z.number().min(0).max(1).default(1),
  legend: LegendSchema.optional(),
  auth: AuthSchema.optional(),
  /**
   * Optional same-origin proxy. Unset in the static build; in a fullstack deployment
   * it points at a backend, and nothing else in the document changes.
   */
  proxy: z.url().optional(),
  /**
   * Load this layer during boot even while it is hidden, so switching it on is
   * instant. It costs bandwidth up front, so reserve it for light layers people are
   * likely to open. Visible layers always load.
   */
  preload: z.boolean().default(false),
  /**
   * A Lucide icon name for the layer panel, e.g. "thermometer" or "cloud-rain"
   * (https://lucide.dev/icons). Core only checks the shape of the name; the UI checks
   * it against the icon set and falls back to a glyph for the draw type.
   */
  icon: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use a Lucide icon name in kebab-case, e.g. cloud-rain")
    .optional(),
};

/** A vector source drawn from GeoJSON — fetched, inlined, or borrowed from another layer. */
export const GeoJsonLayerSchema = z.object({
  ...layerBase,
  type: z.literal("geojson"),
  url: z.url().optional(),
  data: z.unknown().optional(),
  /** Reuse another layer's fetched features instead of requesting them again. */
  sourceOf: z.string().min(1).optional(),
  draw: DrawSchema.default("circle"),
  style: StyleSchema.default({}),
});

const zoomRange = {
  /**
   * Many tiled archives only publish a few zoom levels. Declaring the range lets the
   * map overzoom the deepest tile instead of the layer vanishing when you zoom in.
   */
  minzoom: z.number().int().min(0).max(24).optional(),
  maxzoom: z.number().int().min(0).max(24).optional(),
};

/** Pre-rendered XYZ/WMTS tiles. */
export const RasterLayerSchema = z.object({
  ...layerBase,
  ...zoomRange,
  type: z.literal("raster"),
  tiles: z.array(z.string().min(1)).min(1),
  tileSize: z.number().int().positive().default(256),
});

/** A single georeferenced image pinned to four corners. */
export const ImageLayerSchema = z.object({
  ...layerBase,
  type: z.literal("image"),
  url: z.url(),
  coordinates: z
    .tuple([
      z.tuple([z.number(), z.number()]),
      z.tuple([z.number(), z.number()]),
      z.tuple([z.number(), z.number()]),
      z.tuple([z.number(), z.number()]),
    ])
    .describe("[top-left, top-right, bottom-right, bottom-left] as [lng, lat]"),
});

/** Mapbox Vector Tiles. */
export const VectorLayerSchema = z.object({
  ...layerBase,
  ...zoomRange,
  type: z.literal("vector"),
  tiles: z.array(z.string().min(1)).min(1),
  sourceLayer: z.string().min(1),
  draw: DrawSchema.default("fill"),
  style: StyleSchema.default({}),
});

/** Latitude/longitude columns in a CSV — the shape most science APIs still speak. */
export const CsvLayerSchema = z.object({
  ...layerBase,
  type: z.literal("csv"),
  url: z.url(),
  lat: z.string().min(1).describe("Latitude column name"),
  lon: z.string().min(1).describe("Longitude column name"),
  draw: DrawSchema.default("circle"),
  style: StyleSchema.default({}),
});

/**
 * How a tiler should paint a raster asset. Modelled on the STAC `renders` extension,
 * so catalogs that publish it describe their own styling and Gryphon stops guessing.
 */
export const RenderProfileSchema = z.object({
  assets: z.array(z.string().min(1)).min(1),
  colormap_name: z.string().optional(),
  rescale: z.array(z.tuple([z.number(), z.number()])).optional(),
  nodata: z.union([z.number(), z.string()]).optional(),
});
export type RenderProfile = z.infer<typeof RenderProfileSchema>;

/** A STAC search, rendered through a dynamic tiler. One request, up to two layers. */
export const StacLayerSchema = z.object({
  ...layerBase,
  type: z.literal("stac"),
  endpoint: z.url().describe("STAC API root, e.g. https://planetarycomputer.microsoft.com/api/stac/v1"),
  tiler: z.url().describe("TiTiler root that renders the collection's COGs"),
  collection: z.string().min(1),
  render: RenderProfileSchema,
  bbox: BBoxSchema.optional().describe("Search area; defaults to the document's view"),
  limit: z.number().int().positive().max(100).default(12),
  maxCloudCover: z.number().min(0).max(100).optional(),
  /** Emit the matched items' footprints as a second, outlined layer. */
  footprints: z.boolean().default(false),
});

export const LayerSchema = z.discriminatedUnion("type", [
  GeoJsonLayerSchema,
  RasterLayerSchema,
  ImageLayerSchema,
  VectorLayerSchema,
  CsvLayerSchema,
  StacLayerSchema,
]);
export type LayerConfig = z.infer<typeof LayerSchema>;
export type LayerType = LayerConfig["type"];

export const ViewSchema = z.object({
  bbox: BBoxSchema.optional(),
  zoom: z.number().min(0).max(24).optional(),
});
export type View = z.infer<typeof ViewSchema>;

export const ConfigSchema = z.object({
  $schema: z.string().optional(),
  version: z.literal(1),
  title: z.string().optional(),
  basemap: z.url().default(DEFAULT_BASEMAP),
  view: ViewSchema.optional(),
  layers: z.array(LayerSchema).default([]),
});

/** What a document looks like once defaults are filled in — what renderers consume. */
export type GryphonConfig = z.infer<typeof ConfigSchema>;
/** What an author may write — every defaulted field optional. */
export type GryphonConfigInput = z.input<typeof ConfigSchema>;
