import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BBOX } from "@/lib/geo/bbox";
import { buildThermalTileUrl } from "@/lib/thermal/tiles";
import { thermalScenesFixture } from "@/mocks/fixtures/stac-items";
import { ThermalMap } from "./ThermalMap";
import { THERMAL_LAYER_ID, THERMAL_SOURCE_ID } from "./thermalLayer";

// jsdom has no WebGL, so MapLibre is replaced by a recording fake.
const mapInstances = vi.hoisted(() => [] as Array<Record<string, ReturnType<typeof vi.fn>> & { fireLoad: () => void }>);

vi.mock("maplibre-gl", () => {
  class FakeMap {
    private loadHandler: (() => void) | undefined;
    private hasLayer = false;
    options: unknown;
    addControl = vi.fn();
    fitBounds = vi.fn();
    remove = vi.fn();
    removeLayer = vi.fn();
    removeSource = vi.fn(() => {
      this.hasLayer = false;
    });
    addSource = vi.fn(() => {
      this.hasLayer = true;
    });
    addLayer = vi.fn();
    setPaintProperty = vi.fn();
    getLayer = vi.fn(() => (this.hasLayer ? {} : undefined));
    getSource = vi.fn(() => (this.hasLayer ? {} : undefined));

    constructor(options: unknown) {
      this.options = options;
      mapInstances.push(this as never);
    }

    on(event: string, handler: () => void) {
      if (event === "load") {
        this.loadHandler = handler;
      }
    }

    fireLoad() {
      this.loadHandler?.();
    }
  }

  class NavigationControl {}

  return { Map: FakeMap, NavigationControl };
});

const [firstScene, secondScene] = thermalScenesFixture;

const loadMap = async () => {
  await waitFor(() => expect(mapInstances).toHaveLength(1));
  const map = mapInstances[0]!;
  act(() => map.fireLoad());
  return map;
};

describe("ThermalMap", () => {
  beforeEach(() => {
    mapInstances.length = 0;
  });

  it("frames the area and shows a loading state until the basemap loads", async () => {
    render(<ThermalMap bbox={DEFAULT_BBOX} scene={null} opacity={0.8} />);

    expect(screen.getByRole("status")).toHaveTextContent(/loading map/i);
    const map = await loadMap();

    expect(map.options).toEqual(expect.objectContaining({ bounds: [[1.9, 41.25], [2.3, 41.5]] }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: /thermal map/i })).toBeInTheDocument();
  });

  it("paints the selected scene and swaps it when the selection changes", async () => {
    const { rerender } = render(<ThermalMap bbox={DEFAULT_BBOX} scene={firstScene ?? null} opacity={0.8} />);
    const map = await loadMap();

    expect(map.addSource).toHaveBeenLastCalledWith(
      THERMAL_SOURCE_ID,
      expect.objectContaining({ tiles: [buildThermalTileUrl(firstScene?.id ?? "")] }),
    );

    rerender(<ThermalMap bbox={DEFAULT_BBOX} scene={secondScene ?? null} opacity={0.8} />);

    expect(map.removeLayer).toHaveBeenCalledWith(THERMAL_LAYER_ID);
    expect(map.addSource).toHaveBeenLastCalledWith(
      THERMAL_SOURCE_ID,
      expect.objectContaining({ tiles: [buildThermalTileUrl(secondScene?.id ?? "")] }),
    );
  });

  it("changes opacity without reloading the tiles", async () => {
    const { rerender } = render(<ThermalMap bbox={DEFAULT_BBOX} scene={firstScene ?? null} opacity={0.8} />);
    const map = await loadMap();
    const sourcesAdded = map.addSource.mock.calls.length;

    rerender(<ThermalMap bbox={DEFAULT_BBOX} scene={firstScene ?? null} opacity={0.3} />);

    expect(map.setPaintProperty).toHaveBeenLastCalledWith(THERMAL_LAYER_ID, "raster-opacity", 0.3);
    expect(map.addSource).toHaveBeenCalledTimes(sourcesAdded);
  });

  it("removes the map on unmount", async () => {
    const { unmount } = render(<ThermalMap bbox={DEFAULT_BBOX} scene={null} opacity={0.8} />);
    const map = await loadMap();

    unmount();

    expect(map.remove).toHaveBeenCalled();
  });
});
