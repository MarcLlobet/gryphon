import { http, HttpResponse } from "msw";
import { SAMPLE_ORIGIN } from "@/mocks/fixtures/layers";

const pointFeature = (lon: number, lat: number, mag: number) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [lon, lat] },
  properties: { mag },
});

const stacItem = (id: string, datetime: string) => ({
  type: "Feature",
  stac_version: "1.0.0",
  id,
  collection: "sample-collection",
  bbox: [1.9, 41.25, 2.3, 41.5],
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [1.9, 41.25],
        [2.3, 41.25],
        [2.3, 41.5],
        [1.9, 41.5],
        [1.9, 41.25],
      ],
    ],
  },
  properties: { datetime, platform: "landsat-9", "eo:cloud_cover": 4.2 },
  assets: { lwir11: { href: `${SAMPLE_ORIGIN}/${id}_ST_B10.TIF` } },
  links: [],
});

/** Upstreams for the one sample layer of each type, used by the conformance suite. */
export const sampleHandlers = [
  http.get(`${SAMPLE_ORIGIN}/points.geojson`, () =>
    HttpResponse.json({
      type: "FeatureCollection",
      features: [pointFeature(2.1, 41.4, 3.2), pointFeature(2.2, 41.3, 6.1)],
    }),
  ),

  http.get(`${SAMPLE_ORIGIN}/points.csv`, () =>
    HttpResponse.text("latitude,longitude,bright_ti4\n41.4,2.1,330.2\n41.3,2.2,altitude\n"),
  ),

  http.post(`${SAMPLE_ORIGIN}/stac/v1/search`, () =>
    HttpResponse.json({
      type: "FeatureCollection",
      features: [
        stacItem("sample-2026-01-02", "2026-01-02T10:30:00Z"),
        stacItem("sample-2026-01-01", "2026-01-01T10:30:00Z"),
      ],
    }),
  ),
];
