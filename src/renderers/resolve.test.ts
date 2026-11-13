import { describe, expect, it } from "vitest";
import { LayerSchema, type LayerConfig } from "@/core/config/schema";
import { renderError, type LayerRenderer } from "@/core/render/renderer";
import { err, ok } from "@/core/result";
import { testContext } from "@/test/renderContext";
import type { AnyLayerRenderer } from "./registry";
import { resolveLayer } from "./resolve";

const geoJsonLayer = (id: string, extra: Record<string, unknown> = {}): LayerConfig =>
  LayerSchema.parse({ id, title: id, type: "geojson", url: `https://sample.test/${id}.geojson`, ...extra });

const collection = (id: string) => ({ type: "FeatureCollection", features: [{ type: "Feature", id }] });

/** A stand-in renderer, so the orchestrator is tested without any network. */
const stubRenderer = (
  behaviour: (...args: Parameters<LayerRenderer["resolve"]>) => ReturnType<LayerRenderer["resolve"]>,
): AnyLayerRenderer => ({
  type: "geojson",
  resolve: (config, context) => behaviour(config, context),
});

const succeedsWith = (data: (id: string) => unknown) =>
  stubRenderer(async (config) =>
    ok([
      {
        id: config.id,
        sourceId: config.type === "geojson" && config.sourceOf ? config.sourceOf : config.id,
        source: { kind: "geojson" as const, data: data(config.id) },
        draw: "circle" as const,
        paint: { "circle-opacity": 1 },
      },
    ]),
  );

describe("resolveLayer", () => {
  it("reports an upstream failure as the layer's own error, with nothing painted", async () => {
    const lookup = () => stubRenderer(async () => err(renderError("http", "The source answered 500.", 500)));

    const resolved = await resolveLayer(geoJsonLayer("broken"), testContext(), lookup);

    expect(resolved.error).toMatchObject({ kind: "http", status: 500 });
    expect(resolved.specs).toEqual([]);
    expect(resolved.config.id).toBe("broken");
  });

  it("keeps the layer's specs when it succeeds", async () => {
    const resolved = await resolveLayer(geoJsonLayer("good"), testContext(), () => succeedsWith(collection));

    expect(resolved.error).toBeNull();
    expect(resolved.specs).toHaveLength(1);
  });

  it("reports an unknown layer type instead of silently skipping it", async () => {
    const resolved = await resolveLayer(geoJsonLayer("mystery"), testContext(), () => undefined);

    expect(resolved.error).toMatchObject({ kind: "config" });
    expect(resolved.error?.message).toMatch(/cannot paint/i);
  });

  it("contains a renderer that throws, because a bug must not take the map down", async () => {
    const throwing = () =>
      stubRenderer(() => {
        throw new Error("renderer blew up");
      });

    const resolved = await resolveLayer(geoJsonLayer("boom"), testContext(), throwing);

    expect(resolved.error?.message).toBe("renderer blew up");
    expect(resolved.specs).toEqual([]);
  });

  it("passes the caller's shared lookup through to the renderer", async () => {
    let offered: unknown;
    const lookup = () =>
      stubRenderer(async (config, context) => {
        offered = context.shared("fires");
        return ok([
          {
            id: config.id,
            sourceId: "fires",
            source: { kind: "geojson" as const, data: collection(config.id) },
            draw: "heatmap" as const,
            paint: {},
          },
        ]);
      });

    await resolveLayer(
      geoJsonLayer("fires-heat", { sourceOf: "fires", draw: "heatmap" }),
      { ...testContext(), shared: (id) => (id === "fires" ? collection("fires") : undefined) },
      lookup,
    );

    expect(offered).toEqual(collection("fires"));
  });
});
