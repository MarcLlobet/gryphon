import type { BBox } from "@/lib/geo/bbox";
import { toThermalScene, type ThermalScene } from "./scene";
import type { StacItemCollection, StacSearchBody } from "./types";

/** Microsoft Planetary Computer — a public, STAC-compliant catalog. */
export const STAC_API_URL = "https://planetarycomputer.microsoft.com/api/stac/v1";
export const LANDSAT_COLLECTION = "landsat-c2-l2";

export interface SearchThermalScenesParams {
  bbox: BBox;
  limit?: number;
  maxCloudCover?: number;
}

export class StacRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`STAC search failed with status ${status}`);
    this.name = "StacRequestError";
    this.status = status;
  }
}

export const buildSearchBody = ({
  bbox,
  limit = 12,
  maxCloudCover = 20,
}: SearchThermalScenesParams): StacSearchBody => ({
  collections: [LANDSAT_COLLECTION],
  bbox: [...bbox],
  limit,
  query: { "eo:cloud_cover": { lt: maxCloudCover } },
  sortby: [{ field: "datetime", direction: "desc" }],
});

export const searchThermalScenes = async (
  params: SearchThermalScenesParams,
): Promise<ThermalScene[]> => {
  const response = await fetch(`${STAC_API_URL}/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(buildSearchBody(params)),
  });

  if (!response.ok) {
    throw new StacRequestError(response.status);
  }

  const collection = (await response.json()) as StacItemCollection;
  return collection.features.map(toThermalScene);
};
