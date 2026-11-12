// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/mocks/node";
import { thermalScenesFixture } from "@/mocks/fixtures/stac-items";
import { DEFAULT_BBOX } from "@/lib/geo/bbox";
import { buildSearchBody, LANDSAT_COLLECTION, searchThermalScenes, STAC_API_URL, StacRequestError } from "./client";
import type { StacSearchBody } from "./types";

describe("buildSearchBody", () => {
  it("asks for recent, low-cloud Landsat scenes in the area", () => {
    expect(buildSearchBody({ bbox: DEFAULT_BBOX, limit: 5, maxCloudCover: 10 })).toEqual({
      collections: [LANDSAT_COLLECTION],
      bbox: [...DEFAULT_BBOX],
      limit: 5,
      query: { "eo:cloud_cover": { lt: 10 } },
      sortby: [{ field: "datetime", direction: "desc" }],
    });
  });
});

describe("searchThermalScenes", () => {
  it("maps STAC items to thermal scenes", async () => {
    await expect(searchThermalScenes({ bbox: DEFAULT_BBOX })).resolves.toEqual(thermalScenesFixture);
  });

  it("sends the search body to the STAC API", async () => {
    let received: StacSearchBody | undefined;
    server.use(
      http.post<never, StacSearchBody>(`${STAC_API_URL}/search`, async ({ request }) => {
        received = await request.json();
        return HttpResponse.json({ type: "FeatureCollection", features: [] });
      }),
    );

    await searchThermalScenes({ bbox: DEFAULT_BBOX, limit: 2 });

    expect(received?.limit).toBe(2);
    expect(received?.collections).toEqual([LANDSAT_COLLECTION]);
  });

  it("throws a StacRequestError when the API fails", async () => {
    server.use(http.post(`${STAC_API_URL}/search`, () => new HttpResponse(null, { status: 503 })));

    await expect(searchThermalScenes({ bbox: DEFAULT_BBOX })).rejects.toBeInstanceOf(StacRequestError);
  });
});
