// @vitest-environment node
import { http, HttpResponse } from "msw";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import type { ApiErrorResponse, ScenesResponse } from "@/lib/api/types";
import { STAC_API_URL } from "@/lib/stac/client";
import { thermalScenesFixture } from "@/mocks/fixtures/stac-items";
import { server } from "@/mocks/node";
import { GET } from "./route";

const get = (query = "") => GET(new NextRequest(`http://localhost/api/scenes${query}`));

describe("GET /api/scenes", () => {
  it("returns thermal scenes for the default area", async () => {
    const response = await get();

    expect(response.status).toBe(200);
    await expect(response.json() as Promise<ScenesResponse>).resolves.toEqual({ scenes: thermalScenesFixture });
  });

  it("rejects an invalid bbox with 400", async () => {
    const response = await get("?bbox=nope");
    const body = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/invalid bbox/i);
  });

  it("returns 502 when the STAC API fails", async () => {
    server.use(http.post(`${STAC_API_URL}/search`, () => new HttpResponse(null, { status: 500 })));

    const response = await get("?bbox=1.9,41.25,2.3,41.5");

    expect(response.status).toBe(502);
  });
});
