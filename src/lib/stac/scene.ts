import type { BBox } from "@/lib/geo/bbox";
import type { StacItem } from "./types";

/** Landsat Collection 2 Level-2 surface temperature band (thermal infrared). */
export const THERMAL_ASSET_KEY = "lwir11";
export const PREVIEW_ASSET_KEY = "rendered_preview";

/** Gryphon's domain model: a thermal scene, decoupled from raw STAC. */
export interface ThermalScene {
  id: string;
  acquiredAt: string | null;
  platform: string | null;
  cloudCover: number | null;
  bbox: BBox | null;
  thermalHref: string | null;
  previewHref: string | null;
}

const toBBox = (values: number[]): BBox | null => {
  const [west, south, east, north] = values;
  return west === undefined || south === undefined || east === undefined || north === undefined
    ? null
    : [west, south, east, north];
};

export const toThermalScene = (item: StacItem): ThermalScene => ({
  id: item.id,
  acquiredAt: item.properties.datetime,
  platform: item.properties.platform ?? null,
  cloudCover: item.properties["eo:cloud_cover"] ?? null,
  bbox: toBBox(item.bbox),
  thermalHref: item.assets[THERMAL_ASSET_KEY]?.href ?? null,
  previewHref: item.assets[PREVIEW_ASSET_KEY]?.href ?? null,
});
