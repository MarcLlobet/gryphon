import { describe, expect, it, vi } from "vitest";
import { thermalScenesFixture } from "@/mocks/fixtures/stac-items";
import { buildThermalTileUrl } from "@/lib/thermal/tiles";
import {
  setThermalOpacity,
  syncThermalLayer,
  THERMAL_LAYER_ID,
  THERMAL_SOURCE_ID,
  toLngLatBounds,
  type ThermalLayerMap,
} from "./thermalLayer";

const createFakeMap = (hasThermalLayer = false) => {
  let present = hasThermalLayer;
  const map = {
    getLayer: vi.fn(() => (present ? {} : undefined)),
    getSource: vi.fn(() => (present ? {} : undefined)),
    removeLayer: vi.fn(),
    removeSource: vi.fn(() => {
      present = false;
    }),
    addSource: vi.fn(() => {
      present = true;
    }),
    addLayer: vi.fn(),
    setPaintProperty: vi.fn(),
  };
  return map as typeof map & ThermalLayerMap;
};

const [scene] = thermalScenesFixture;

describe("syncThermalLayer", () => {
  it("adds the scene's thermal tiles as a raster layer", () => {
    const map = createFakeMap();

    syncThermalLayer(map, scene ?? null, 0.8);

    expect(map.addSource).toHaveBeenCalledWith(
      THERMAL_SOURCE_ID,
      expect.objectContaining({ type: "raster", tiles: [buildThermalTileUrl(scene?.id ?? "")] }),
    );
    expect(map.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: THERMAL_LAYER_ID, paint: expect.objectContaining({ "raster-opacity": 0.8 }) }),
    );
  });

  it("removes the previous scene before adding the next one", () => {
    const map = createFakeMap(true);

    syncThermalLayer(map, scene ?? null, 1);

    expect(map.removeLayer).toHaveBeenCalledWith(THERMAL_LAYER_ID);
    expect(map.removeSource).toHaveBeenCalledWith(THERMAL_SOURCE_ID);
    expect(map.addSource).toHaveBeenCalledTimes(1);
  });

  it("only clears the map when there is no scene", () => {
    const map = createFakeMap(true);

    syncThermalLayer(map, null, 1);

    expect(map.removeLayer).toHaveBeenCalled();
    expect(map.addSource).not.toHaveBeenCalled();
  });
});

describe("setThermalOpacity", () => {
  it("updates the opacity only when the layer exists", () => {
    const empty = createFakeMap();
    setThermalOpacity(empty, 0.5);
    expect(empty.setPaintProperty).not.toHaveBeenCalled();

    const withLayer = createFakeMap(true);
    setThermalOpacity(withLayer, 0.5);
    expect(withLayer.setPaintProperty).toHaveBeenCalledWith(THERMAL_LAYER_ID, "raster-opacity", 0.5);
  });
});

describe("toLngLatBounds", () => {
  it("turns a bbox into south-west / north-east corners", () => {
    expect(toLngLatBounds([1.9, 41.25, 2.3, 41.5])).toEqual([
      [1.9, 41.25],
      [2.3, 41.5],
    ]);
  });
});
