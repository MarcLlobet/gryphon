/**
 * The closed set of things Gryphon can paint.
 *
 * Config types are open — a client may declare any layer we have a renderer for, and
 * more renderers can be added. What they all collapse into is this fixed vocabulary,
 * so the map never learns about a provider, only about primitives.
 *
 * Deliberately independent of MapLibre's own types: core stays framework-free, and
 * `src/features/map` does the one translation.
 */

export interface RasterSourceSpec {
  readonly kind: "raster";
  readonly tiles: readonly string[];
  readonly tileSize: number;
  readonly minzoom?: number;
  readonly maxzoom?: number;
  readonly attribution?: string;
}

export interface GeoJsonSourceSpec {
  readonly kind: "geojson";
  readonly data: unknown;
  readonly attribution?: string;
}

export interface ImageSourceSpec {
  readonly kind: "image";
  readonly url: string;
  readonly coordinates: readonly [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ];
  readonly attribution?: string;
}

export interface VectorSourceSpec {
  readonly kind: "vector";
  readonly tiles: readonly string[];
  readonly minzoom?: number;
  readonly maxzoom?: number;
  readonly attribution?: string;
}

export type SourceSpec = RasterSourceSpec | GeoJsonSourceSpec | ImageSourceSpec | VectorSourceSpec;

/** The MapLibre layer types Gryphon emits. */
export type DrawKind = "raster" | "circle" | "line" | "fill" | "heatmap" | "symbol";

/**
 * One painted layer and the source it reads from.
 *
 * Several specs may share a `sourceId` — a heatmap and a circle layer over the same
 * points, or a thermal raster and its footprints. `applyLayers` adds such a source
 * once, so sharing costs one request, not two.
 */
export interface LayerSpec {
  readonly id: string;
  readonly sourceId: string;
  readonly source: SourceSpec;
  readonly draw: DrawKind;
  /** Required by vector tile sources, which bundle several named layers per tile. */
  readonly sourceLayer?: string;
  readonly paint: Readonly<Record<string, unknown>>;
  readonly layout?: Readonly<Record<string, unknown>>;
}

/** Paint property carrying each draw kind's opacity, so one control fits every layer. */
export const OPACITY_PROPERTY: Record<DrawKind, string> = {
  raster: "raster-opacity",
  circle: "circle-opacity",
  line: "line-opacity",
  fill: "fill-opacity",
  heatmap: "heatmap-opacity",
  symbol: "icon-opacity",
};
