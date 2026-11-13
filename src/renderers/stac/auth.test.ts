import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { LayerSchema } from "@/core/config/schema";
import { SAMPLE_ORIGIN } from "@/mocks/fixtures/layers";
import { server } from "@/mocks/node";
import { testContext } from "@/test/renderContext";
import { stacRenderer } from "./index";

const catalog = (extra: Record<string, unknown> = {}) =>
  LayerSchema.parse({
    id: "private-catalog",
    title: "Private catalog",
    type: "stac",
    endpoint: `${SAMPLE_ORIGIN}/stac/v1`,
    tiler: `${SAMPLE_ORIGIN}/data/v1`,
    collection: "sample-collection",
    render: { assets: ["lwir11"] },
    ...extra,
  }) as Extract<ReturnType<typeof LayerSchema.parse>, { type: "stac" }>;

describe("a STAC catalog behind a credential", () => {
  it("asks for the credential instead of sending an unauthenticated search", async () => {
    const layer = catalog({ auth: { in: "header", name: "Authorization" } });

    const result = await stacRenderer.resolve(layer, testContext({ secret: () => undefined }));

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error.kind).toBe("auth");
  });

  it("sends a header credential on the search request", async () => {
    let seen: string | null = null;
    server.use(
      http.post(`${SAMPLE_ORIGIN}/stac/v1/search`, ({ request }) => {
        seen = request.headers.get("Authorization");
        return HttpResponse.json({ type: "FeatureCollection", features: [] });
      }),
    );

    await stacRenderer.resolve(
      catalog({ auth: { in: "header", name: "Authorization" } }),
      testContext({ secret: () => "Bearer token-123" }),
    );

    expect(seen).toBe("Bearer token-123");
  });

  it("refuses a header credential for tiles, which MapLibre cannot authenticate", async () => {
    server.use(
      http.post(`${SAMPLE_ORIGIN}/stac/v1/search`, () =>
        HttpResponse.json({
          type: "FeatureCollection",
          features: [{ id: "item-1", properties: {}, assets: {}, geometry: null }],
        }),
      ),
    );

    const result = await stacRenderer.resolve(
      catalog({ auth: { in: "header", name: "Authorization" } }),
      testContext({ secret: () => "Bearer token-123" }),
    );

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error.message).toMatch(/cannot be sent with map tiles/i);
  });

  it("carries a query credential through to the tile URL", async () => {
    server.use(
      http.post(`${SAMPLE_ORIGIN}/stac/v1/search`, () =>
        HttpResponse.json({
          type: "FeatureCollection",
          features: [{ id: "item-1", properties: {}, assets: {}, geometry: null }],
        }),
      ),
    );

    const result = await stacRenderer.resolve(
      catalog({ auth: { in: "query", name: "api_key" } }),
      testContext({ secret: () => "k-999" }),
    );

    const source = result.ok ? result.value[0]?.source : undefined;
    expect(source?.kind === "raster" && source.tiles[0]).toContain("api_key=k-999");
  });

  it("reports a rejected credential as an auth failure, not a generic error", async () => {
    server.use(http.post(`${SAMPLE_ORIGIN}/stac/v1/search`, () => new HttpResponse(null, { status: 401 })));

    const result = await stacRenderer.resolve(
      catalog({ auth: { in: "query", name: "api_key" } }),
      testContext({ secret: () => "wrong" }),
    );

    expect(result.ok ? "" : result.error.kind).toBe("auth");
  });
});
