import { LANDSAT_COLLECTION } from "@/lib/stac/client";
import { THERMAL_ASSET_KEY } from "@/lib/stac/scene";
import { thermalRescale } from "./scale";

/** Planetary Computer's data API (TiTiler) renders COGs as XYZ tiles. */
export const PC_DATA_API_URL = "https://planetarycomputer.microsoft.com/api/data/v1";

/** A perceptually uniform "black → purple → orange → yellow" heat palette. */
export const THERMAL_COLORMAP = "inferno";

/** Matches the tiler's `inferno` colormap, for the legend. */
export const THERMAL_GRADIENT = ["#000004", "#420a68", "#932667", "#dd513a", "#fca50a", "#fcffa4"] as const;

export const buildThermalTileUrl = (sceneId: string): string => {
  const params = new URLSearchParams({
    collection: LANDSAT_COLLECTION,
    item: sceneId,
    assets: THERMAL_ASSET_KEY,
    colormap_name: THERMAL_COLORMAP,
    rescale: thermalRescale(),
    nodata: "0",
    format: "png",
  });

  return `${PC_DATA_API_URL}/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?${params.toString()}`;
};
