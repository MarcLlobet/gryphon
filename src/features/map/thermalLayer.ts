import type { Map as MapLibreMap, RasterLayerSpecification, RasterSourceSpecification } from "maplibre-gl";
import type { BBox } from "@/lib/geo/bbox";
import type { ThermalScene } from "@/lib/stac/scene";
import { buildThermalTileUrl } from "@/lib/thermal/tiles";

export const THERMAL_SOURCE_ID = "thermal";
export const THERMAL_LAYER_ID = "thermal-layer";

/** Free dark basemap, no API key required. */
export const BASEMAP_STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

/** The slice of MapLibre's Map that the thermal layer needs (easy to fake in tests). */
export type ThermalLayerMap = Pick<
  MapLibreMap,
  "addSource" | "addLayer" | "getSource" | "getLayer" | "removeSource" | "removeLayer" | "setPaintProperty"
>;

export const toLngLatBounds = ([west, south, east, north]: BBox): [[number, number], [number, number]] => [
  [west, south],
  [east, north],
];

export const thermalRasterSource = (scene: ThermalScene): RasterSourceSpecification => ({
  type: "raster",
  tiles: [buildThermalTileUrl(scene.id)],
  tileSize: 256,
  attribution: "Landsat C2 L2 © USGS · Microsoft Planetary Computer",
});

export const thermalRasterLayer = (opacity: number): RasterLayerSpecification => ({
  id: THERMAL_LAYER_ID,
  type: "raster",
  source: THERMAL_SOURCE_ID,
  paint: { "raster-opacity": opacity, "raster-fade-duration": 200 },
});

/** Replaces whatever thermal scene is on the map with `scene` (or clears it). */
export const syncThermalLayer = (map: ThermalLayerMap, scene: ThermalScene | null, opacity: number): void => {
  if (map.getLayer(THERMAL_LAYER_ID)) {
    map.removeLayer(THERMAL_LAYER_ID);
  }
  if (map.getSource(THERMAL_SOURCE_ID)) {
    map.removeSource(THERMAL_SOURCE_ID);
  }
  if (scene === null) {
    return;
  }

  map.addSource(THERMAL_SOURCE_ID, thermalRasterSource(scene));
  map.addLayer(thermalRasterLayer(opacity));
};

export const setThermalOpacity = (map: ThermalLayerMap, opacity: number): void => {
  if (map.getLayer(THERMAL_LAYER_ID)) {
    map.setPaintProperty(THERMAL_LAYER_ID, "raster-opacity", opacity);
  }
};
