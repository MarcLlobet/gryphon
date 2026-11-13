/**
 * The contract every renderer must satisfy, run against every registry entry.
 *
 * This is the Liskov guarantee made executable: the orchestrator treats renderers
 * interchangeably, so each one must behave the same way at the edges — never throw,
 * always return a typed failure, always emit well-formed specs. A new protocol
 * inherits this whole suite the moment it is registered.
 */
import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { LayerSchema, type LayerType } from "@/core/config/schema";
import { OPACITY_PROPERTY } from "@/core/render/layerSpec";
import { layerSamples, networkedSamples } from "@/mocks/fixtures/layers";
import { server } from "@/mocks/node";
import { testContext } from "@/test/renderContext";
import { loadRenderer, supportedTypes, type AnyLayerRenderer } from "./registry";

/** Every `type` the schema accepts — so a new variant without a renderer fails here. */
const declaredTypes = LayerSchema.options.map((option) => option.shape.type.value) as LayerType[];

describe("the renderer registry", () => {
  it("can paint every layer type the schema accepts", () => {
    expect([...supportedTypes()].sort()).toEqual([...declaredTypes].sort());
  });

  it("knows nothing about a type the schema does not declare", async () => {
    await expect(loadRenderer("wms" as LayerType)).resolves.toBeUndefined();
  });
});

describe.each(declaredTypes)("the %s renderer", (type) => {
  // Renderers load on demand, exactly as in the app.
  let renderer: AnyLayerRenderer | undefined;
  beforeAll(async () => {
    renderer = await loadRenderer(type);
  });
  const sample = layerSamples[type];
  const networked = networkedSamples.find((entry) => entry.type === type);

  it("is registered under the type it claims", () => {
    expect(renderer?.type).toBe(type);
  });

  it("resolves its sample into well-formed specs", async () => {
    const result = await renderer!.resolve(sample, testContext());

    expect(result.ok ? null : result.error).toBeNull();
    if (!result.ok) {
      return;
    }

    expect(result.value.length).toBeGreaterThan(0);
    for (const spec of result.value) {
      expect(spec.id).not.toBe("");
      expect(spec.sourceId).not.toBe("");
      // Presentation is the map's job: baking opacity in here would make the opacity
      // slider invalidate the cache and re-fetch the source on every drag.
      expect(spec.paint).not.toHaveProperty(OPACITY_PROPERTY[spec.draw]);
      // A vector tile source is meaningless without naming a layer inside the tile.
      expect(spec.source.kind === "vector" ? spec.sourceLayer : "n/a").toBeDefined();
    }
  });

  it("gives every emitted layer a unique id", async () => {
    const result = await renderer!.resolve(sample, testContext());
    const ids = result.ok ? result.value.map((spec) => spec.id) : [];

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("reports a missing credential instead of sending an unauthenticated request", async () => {
    if (sample.type !== "csv" && sample.type !== "geojson") {
      return;
    }
    if (sample.auth === undefined) {
      return;
    }

    const result = await renderer!.resolve(sample, testContext({ secret: () => undefined }));

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.error.kind).toBe("auth");
  });

  if (networked) {
    it("turns an upstream failure into a typed error, not a throw", async () => {
      const responder = () => new HttpResponse(null, { status: 503 });
      server.use(
        networked.method === "POST" ? http.post(networked.url, responder) : http.get(networked.url, responder),
      );

      const result = await renderer!.resolve(sample, testContext());

      expect(result.ok).toBe(false);
      expect(result.ok ? {} : { kind: result.error.kind, status: result.error.status }).toEqual({
        kind: "http",
        status: 503,
      });
    });

    it("turns an unreachable source into a typed error, not a throw", async () => {
      const failing = testContext({ fetch: () => Promise.reject(new TypeError("Failed to fetch")) });

      const result = await renderer!.resolve(sample, failing);

      expect(result.ok).toBe(false);
      expect(result.ok ? "" : result.error.kind).toMatch(/network|cors/);
    });

    it("turns a nonsense payload into a typed error, not a throw", async () => {
      const responder = () => HttpResponse.text("<html>not what you asked for</html>");
      server.use(
        networked.method === "POST" ? http.post(networked.url, responder) : http.get(networked.url, responder),
      );

      const result = await renderer!.resolve(sample, testContext());

      expect(result.ok).toBe(false);
      expect(result.ok ? "" : result.error.kind).toBe("parse");
    });
  }
});
