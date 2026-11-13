import { describe, expect, it, vi } from "vitest";
import type { LayerSpec } from "@/core/render/layerSpec";
import { applyLayers, qualify, type PresentedLayer, type ReconcilableMap } from "./applyLayers";

/**
 * A fake that keeps real style state, so ordering and ownership can be asserted
 * rather than inferred from call counts. jsdom has no WebGL, and none of this logic
 * needs it.
 */
const createFakeMap = () => {
  const sources = new Map<string, { spec: unknown; setData: ReturnType<typeof vi.fn> }>();
  const layers: { id: string; type: string; source: string; paint: Record<string, unknown> }[] = [
    { id: "background", type: "background", source: "basemap", paint: {} },
    { id: "roads", type: "line", source: "basemap", paint: {} },
    { id: "place-labels", type: "symbol", source: "basemap", paint: {} },
  ];

  const indexOf = (id: string) => layers.findIndex((layer) => layer.id === id);

  const map = {
    getStyle: () => ({ layers: [...layers], sources: Object.fromEntries(sources) }),
    getSource: (id: string) => sources.get(id),
    getLayer: (id: string) => layers.find((layer) => layer.id === id),
    addSource: vi.fn((id: string, spec: unknown) => {
      sources.set(id, { spec, setData: vi.fn() });
    }),
    removeSource: vi.fn((id: string) => {
      sources.delete(id);
    }),
    addLayer: vi.fn(
      (layer: { id: string; type: string; source: string; paint?: Record<string, unknown> }, beforeId?: string) => {
        const entry = { ...layer, paint: layer.paint ?? {} };
        const at = beforeId === undefined ? layers.length : indexOf(beforeId);
        layers.splice(at === -1 ? layers.length : at, 0, entry);
      },
    ),
    removeLayer: vi.fn((id: string) => {
      layers.splice(indexOf(id), 1);
    }),
    moveLayer: vi.fn((id: string, beforeId?: string) => {
      const [moved] = layers.splice(indexOf(id), 1);
      if (moved === undefined) {
        return;
      }
      const at = beforeId === undefined ? layers.length : indexOf(beforeId);
      layers.splice(at === -1 ? layers.length : at, 0, moved);
    }),
    getPaintProperty: (id: string, property: string) => layers[indexOf(id)]?.paint[property],
    setPaintProperty: vi.fn((id: string, property: string, value: unknown) => {
      const layer = layers[indexOf(id)];
      if (layer) {
        layer.paint[property] = value;
      }
    }),
  };

  return { map: map as unknown as ReconcilableMap & typeof map, layerIds: () => layers.map((l) => l.id), sources };
};

const rasterSpec = (id: string, opacity = 1): PresentedLayer => ({
  spec: {
    id,
    sourceId: id,
    source: { kind: "raster", tiles: [`https://tiles.test/${id}/{z}/{x}/{y}.png`], tileSize: 256 },
    draw: "raster",
    paint: { "raster-fade-duration": 200 },
  },
  opacity,
});

const pointsSpec = (
  id: string,
  sourceId: string,
  data: unknown,
  draw: LayerSpec["draw"] = "circle",
): PresentedLayer => ({
  spec: { id, sourceId, source: { kind: "geojson", data }, draw, paint: {} },
  opacity: 1,
});

const emptyCollection = { type: "FeatureCollection", features: [] };

describe("applyLayers", () => {
  it("adds a namespaced source and layer", () => {
    const { map, sources } = createFakeMap();

    applyLayers(map, [rasterSpec("thermal")]);

    expect(sources.has(qualify("thermal"))).toBe(true);
    expect(map.getLayer(qualify("thermal"))).toBeDefined();
  });

  it("inserts overlays beneath the basemap's labels, so place names stay readable", () => {
    const { map, layerIds } = createFakeMap();

    applyLayers(map, [rasterSpec("thermal")]);

    expect(layerIds()).toEqual(["background", "roads", qualify("thermal"), "place-labels"]);
  });

  it("paints layers in document order, bottom first", () => {
    const { map, layerIds } = createFakeMap();

    applyLayers(map, [rasterSpec("thermal"), pointsSpec("quakes", "quakes", emptyCollection)]);

    expect(layerIds()).toEqual(["background", "roads", qualify("thermal"), qualify("quakes"), "place-labels"]);
  });

  it("reorders existing layers when the document order changes", () => {
    const { map, layerIds } = createFakeMap();
    const thermal = rasterSpec("thermal");
    const quakes = pointsSpec("quakes", "quakes", emptyCollection);

    applyLayers(map, [thermal, quakes]);
    applyLayers(map, [quakes, thermal]);

    expect(layerIds()).toEqual(["background", "roads", qualify("quakes"), qualify("thermal"), "place-labels"]);
  });

  it("removes a layer and its source once the document drops it", () => {
    const { map, sources, layerIds } = createFakeMap();

    applyLayers(map, [rasterSpec("thermal"), pointsSpec("quakes", "quakes", emptyCollection)]);
    applyLayers(map, [rasterSpec("thermal")]);

    expect(layerIds()).not.toContain(qualify("quakes"));
    expect(sources.has(qualify("quakes"))).toBe(false);
  });

  it("never touches a layer it does not own", () => {
    const { map, layerIds } = createFakeMap();

    applyLayers(map, [rasterSpec("thermal")]);
    applyLayers(map, []);

    expect(layerIds()).toEqual(["background", "roads", "place-labels"]);
    expect(map.removeLayer).not.toHaveBeenCalledWith("roads");
  });

  it("updates opacity in place rather than reloading tiles", () => {
    const { map } = createFakeMap();

    applyLayers(map, [rasterSpec("thermal", 0.8)]);
    map.addSource.mockClear();
    applyLayers(map, [rasterSpec("thermal", 0.3)]);

    expect(map.setPaintProperty).toHaveBeenCalledWith(qualify("thermal"), "raster-opacity", 0.3);
    expect(map.addSource).not.toHaveBeenCalled();
  });

  it("leaves unchanged paint properties alone", () => {
    const { map } = createFakeMap();

    applyLayers(map, [rasterSpec("thermal", 0.8)]);
    map.setPaintProperty.mockClear();
    applyLayers(map, [rasterSpec("thermal", 0.8)]);

    expect(map.setPaintProperty).not.toHaveBeenCalled();
  });

  it("refreshes GeoJSON in place when the features change", () => {
    const { map, sources } = createFakeMap();
    const next = { type: "FeatureCollection", features: [{ type: "Feature" }] };

    applyLayers(map, [pointsSpec("quakes", "quakes", emptyCollection)]);
    applyLayers(map, [pointsSpec("quakes", "quakes", next)]);

    expect(sources.get(qualify("quakes"))?.setData).toHaveBeenCalledWith(next);
  });

  it("shares one source between two layers over the same data", () => {
    const { map } = createFakeMap();

    applyLayers(map, [
      pointsSpec("fires-heat", "fires", emptyCollection, "heatmap"),
      pointsSpec("fires-points", "fires", emptyCollection, "circle"),
    ]);

    expect(map.addSource).toHaveBeenCalledTimes(1);
    expect(map.getLayer(qualify("fires-heat"))).toBeDefined();
    expect(map.getLayer(qualify("fires-points"))).toBeDefined();
  });
});
