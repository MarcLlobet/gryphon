import { http, HttpResponse } from "msw";

/**
 * Upstreams named by the shipped default document, so `pnpm dev:mock` runs the app
 * offline exactly as it ships.
 */
const PLANETARY_COMPUTER = "https://planetarycomputer.microsoft.com/api";
const USGS_FEED = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
/** The feed the config page's example layer points at. */
const USGS_WEEK_M45 = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson";

const landsatItem = (id: string, datetime: string) => ({
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
  properties: { datetime, platform: "landsat-9", "eo:cloud_cover": 3.1 },
  assets: { lwir11: { href: `https://example.com/landsat/${id}_ST_B10.TIF` } },
  links: [],
});

const quake = (lon: number, lat: number, mag: number, place: string) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lon, lat, 10] },
  properties: { mag, place, time: Date.UTC(2026, 0, 1) },
});

export const defaultDocumentHandlers = [
  http.post(`${PLANETARY_COMPUTER}/stac/v1/search`, () =>
    HttpResponse.json({
      type: "FeatureCollection",
      features: [
        landsatItem("LC09_L2SP_198031_20261028_02_T1", "2026-10-28T10:30:00Z"),
        landsatItem("LC08_L2SP_198031_20261020_02_T1", "2026-10-20T10:30:00Z"),
      ],
    }),
  ),

  http.get(USGS_FEED, () =>
    HttpResponse.json({
      type: "FeatureCollection",
      features: [
        quake(-155.3, 19.4, 3.1, "Island of Hawaii"),
        quake(141.2, 38.3, 5.4, "near the east coast of Honshu"),
        quake(-70.7, -32.1, 6.8, "Valparaíso, Chile"),
      ],
    }),
  ),

  http.get(USGS_WEEK_M45, () =>
    HttpResponse.json({
      type: "FeatureCollection",
      features: [
        quake(141.2, 38.3, 5.4, "near the east coast of Honshu"),
        quake(-70.7, -32.1, 6.8, "Valparaíso, Chile"),
        quake(26.4, 45.7, 4.6, "Romania"),
      ],
    }),
  ),
];
