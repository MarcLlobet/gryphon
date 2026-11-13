/**
 * The composition root: the only module in the app that names a concrete renderer.
 *
 * Adding a dataset does not touch this file: that is a JSON edit. Adding a *protocol*
 * adds one line here, which is the whole cost of extending the app.
 *
 * Each renderer is loaded on demand, so a document that only uses GeoJSON and raster
 * tiles never downloads the CSV parser or the STAC client. The record is keyed by
 * every layer type the schema declares, so a type without a renderer does not compile.
 */
import type { LayerConfig, LayerType } from "@/core/config/schema";
import type { LayerRenderer } from "@/core/render/renderer";

export type AnyLayerRenderer = LayerRenderer<LayerConfig>;

const as = (renderer: unknown) => renderer as AnyLayerRenderer;

const loaders: Record<LayerType, () => Promise<AnyLayerRenderer>> = {
  geojson: () => import("./geojson").then((module) => as(module.geoJsonRenderer)),
  raster: () => import("./raster").then((module) => as(module.rasterRenderer)),
  image: () => import("./image").then((module) => as(module.imageRenderer)),
  vector: () => import("./vector").then((module) => as(module.vectorRenderer)),
  csv: () => import("./csv").then((module) => as(module.csvRenderer)),
  stac: () => import("./stac").then((module) => as(module.stacRenderer)),
};

const loaded = new Map<LayerType, Promise<AnyLayerRenderer>>();

/** Loads (once) and returns the renderer for a type, or undefined for an unknown one. */
export const loadRenderer = (type: LayerType): Promise<AnyLayerRenderer | undefined> => {
  const loader = loaders[type] as (() => Promise<AnyLayerRenderer>) | undefined;
  if (loader === undefined) {
    return Promise.resolve(undefined);
  }
  let pending = loaded.get(type);
  if (pending === undefined) {
    pending = loader();
    loaded.set(type, pending);
  }
  return pending;
};

/** The protocols this build can paint. Useful for telling an author what is available. */
export const supportedTypes = (): LayerType[] => Object.keys(loaders) as LayerType[];
