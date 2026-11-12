import { toThermalScene, type ThermalScene } from "@/lib/stac/scene";
import type { StacItem } from "@/lib/stac/types";

/** Illustrative Landsat C2 L2 items over Barcelona (WRS-2 path 197 / row 031). */
const landsatItem = (id: string, datetime: string, platform: string, cloudCover: number): StacItem => ({
  type: "Feature",
  stac_version: "1.0.0",
  id,
  collection: "landsat-c2-l2",
  bbox: [1.05, 40.55, 3.85, 42.45],
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [1.05, 40.55],
        [3.85, 40.55],
        [3.85, 42.45],
        [1.05, 42.45],
        [1.05, 40.55],
      ],
    ],
  },
  properties: { datetime, platform, "eo:cloud_cover": cloudCover },
  assets: {
    lwir11: {
      href: `https://example.com/landsat/${id}_ST_B10.TIF`,
      type: "image/tiff; application=geotiff; profile=cloud-optimized",
      title: "Surface Temperature Band",
      roles: ["data", "temperature"],
    },
    rendered_preview: {
      href: `https://example.com/landsat/${id}_preview.png`,
      type: "image/png",
      title: "Rendered preview",
      roles: ["overview"],
    },
  },
  links: [],
});

export const stacItemsFixture: StacItem[] = [
  landsatItem("LC09_L2SP_197031_20261103_02_T1", "2026-11-03T10:32:41Z", "landsat-9", 3.2),
  landsatItem("LC08_L2SP_197031_20261026_02_T1", "2026-10-26T10:32:15Z", "landsat-8", 11.7),
  landsatItem("LC09_L2SP_197031_20261018_02_T1", "2026-10-18T10:32:40Z", "landsat-9", 0.4),
];

export const thermalScenesFixture: ThermalScene[] = stacItemsFixture.map(toThermalScene);
