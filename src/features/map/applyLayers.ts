/**
 * A small reconciler for MapLibre: given the layers that *should* be on the map, make
 * it so. Add what is missing, update what changed, remove what is gone, and keep the
 * paint order the document asked for.
 *
 * This is where the renderer-agnostic `LayerSpec` vocabulary meets MapLibre's own
 * types — the single translation point, so nothing upstream depends on MapLibre.
 */
import type { LayerSpecification, Map as MapLibreMap, SourceSpecification, StyleSpecification } from "maplibre-gl";
import { OPACITY_PROPERTY, type LayerSpec, type SourceSpec } from "@/core/render/layerSpec";

/**
 * Everything Gryphon adds is namespaced, so the reconciler can tell its own layers
 * from the basemap's and never removes something it does not own.
 */
const OWNED = "gryphon:";

export const qualify = (id: string): string => `${OWNED}${id}`;

/** The slice of MapLibre's Map this module needs — small enough to fake in tests. */
export type ReconcilableMap = Pick<
  MapLibreMap,
  | "addSource"
  | "addLayer"
  | "getLayer"
  | "removeSource"
  | "removeLayer"
  | "setPaintProperty"
  | "getPaintProperty"
  | "moveLayer"
  | "getStyle"
> & {
  /** Narrower than MapLibre's own signature: only GeoJSON sources can be refreshed. */
  getSource(id: string): { setData?: (data: unknown) => void } | undefined;
};

const toSource = (source: SourceSpec): SourceSpecification => {
  switch (source.kind) {
    case "raster":
      return {
        type: "raster",
        tiles: [...source.tiles],
        tileSize: source.tileSize,
        ...(source.minzoom === undefined ? {} : { minzoom: source.minzoom }),
        ...(source.maxzoom === undefined ? {} : { maxzoom: source.maxzoom }),
        ...(source.attribution === undefined ? {} : { attribution: source.attribution }),
      };
    case "geojson":
      return {
        type: "geojson",
        data: source.data as never,
        ...(source.attribution === undefined ? {} : { attribution: source.attribution }),
      };
    case "image":
      return {
        type: "image",
        url: source.url,
        coordinates: source.coordinates.map(([lng, lat]) => [lng, lat]) as [
          [number, number],
          [number, number],
          [number, number],
          [number, number],
        ],
      };
    case "vector":
      return {
        type: "vector",
        tiles: [...source.tiles],
        ...(source.minzoom === undefined ? {} : { minzoom: source.minzoom }),
        ...(source.maxzoom === undefined ? {} : { maxzoom: source.maxzoom }),
        ...(source.attribution === undefined ? {} : { attribution: source.attribution }),
      };
  }
};

/**
 * A resolved layer plus the presentation the user controls. Kept apart from the spec
 * so moving the opacity slider repaints without re-resolving the source.
 */
export interface PresentedLayer {
  readonly spec: LayerSpec;
  readonly opacity: number;
}

const paintOf = ({ spec, opacity }: PresentedLayer): Record<string, unknown> => ({
  ...spec.paint,
  [OPACITY_PROPERTY[spec.draw]]: opacity,
});

const toLayer = (presented: PresentedLayer): LayerSpecification => {
  const { spec } = presented;
  return {
    id: qualify(spec.id),
    type: spec.draw,
    source: qualify(spec.sourceId),
    ...(spec.sourceLayer === undefined ? {} : { "source-layer": spec.sourceLayer }),
    paint: paintOf(presented),
    ...(spec.layout === undefined ? {} : { layout: spec.layout }),
  } as LayerSpecification;
};

/**
 * Overlays are inserted beneath the basemap's first symbol layer, so place names stay
 * readable through a semi-transparent raster instead of being buried by it.
 */
export const firstLabelLayerId = (style: StyleSpecification | undefined): string | undefined =>
  style?.layers?.find((layer) => layer.type === "symbol" && !layer.id.startsWith(OWNED))?.id;

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const updateSource = (map: ReconcilableMap, sourceId: string, source: SourceSpec): void => {
  if (source.kind !== "geojson") {
    return;
  }
  // GeoJSON is the one source kind that can be refreshed in place; the rest are
  // addressed by URL, and a changed URL means a changed source id.
  map.getSource(sourceId)?.setData?.(source.data);
};

const updatePaint = (map: ReconcilableMap, layerId: string, paint: Record<string, unknown>): void => {
  for (const [property, value] of Object.entries(paint)) {
    if (!sameJson(map.getPaintProperty(layerId, property), value)) {
      map.setPaintProperty(layerId, property, value);
    }
  }
};

export const applyLayers = (map: ReconcilableMap, desired: readonly PresentedLayer[]): void => {
  const style = map.getStyle() as StyleSpecification | undefined;
  const wantedLayers = new Set(desired.map(({ spec }) => qualify(spec.id)));
  const wantedSources = new Set(desired.map(({ spec }) => qualify(spec.sourceId)));

  // Layers first: MapLibre refuses to drop a source that is still painted.
  for (const layer of style?.layers ?? []) {
    if (layer.id.startsWith(OWNED) && !wantedLayers.has(layer.id)) {
      map.removeLayer(layer.id);
    }
  }

  for (const sourceId of Object.keys(style?.sources ?? {})) {
    if (sourceId.startsWith(OWNED) && !wantedSources.has(sourceId)) {
      map.removeSource(sourceId);
    }
  }

  const labelLayerId = firstLabelLayerId(style);

  for (const presented of desired) {
    const { spec } = presented;
    const sourceId = qualify(spec.sourceId);
    const layerId = qualify(spec.id);

    if (map.getSource(sourceId) === undefined) {
      map.addSource(sourceId, toSource(spec.source));
    } else {
      updateSource(map, sourceId, spec.source);
    }

    if (map.getLayer(layerId) === undefined) {
      map.addLayer(toLayer(presented), labelLayerId);
    } else {
      updatePaint(map, layerId, paintOf(presented));
      // Re-asserting position in document order is what makes reordering work.
      map.moveLayer(layerId, labelLayerId);
    }
  }
};
