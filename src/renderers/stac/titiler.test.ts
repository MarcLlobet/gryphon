import { describe, expect, it } from "vitest";
import { buildTileUrl } from "./titiler";

const params = (url: string) => new URLSearchParams(url.split("?")[1] ?? "");

const base = {
  tiler: "https://tiler.test/data/v1",
  collection: "landsat-c2-l2",
  itemId: "LC09_L2SP_197031",
};

describe("buildTileUrl", () => {
  it("keeps the XYZ placeholders the map substitutes", () => {
    const url = buildTileUrl({ ...base, render: { assets: ["lwir11"] } });

    expect(url).toContain("/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?");
  });

  it("carries the render profile's styling rather than a hardcoded palette", () => {
    const url = buildTileUrl({
      ...base,
      render: { assets: ["lwir11"], colormap_name: "inferno", rescale: [[36322, 50951]], nodata: 0 },
    });

    expect(params(url).get("colormap_name")).toBe("inferno");
    expect(params(url).get("rescale")).toBe("36322,50951");
    expect(params(url).get("nodata")).toBe("0");
  });

  it("repeats multi-valued parameters instead of joining them", () => {
    const url = buildTileUrl({ ...base, render: { assets: ["red", "green", "blue"] } });

    expect(params(url).getAll("assets")).toEqual(["red", "green", "blue"]);
  });

  it("does not double the slash when the tiler root has a trailing one", () => {
    const url = buildTileUrl({ ...base, tiler: "https://tiler.test/data/v1/", render: { assets: ["lwir11"] } });

    expect(url).not.toContain("v1//item");
  });

  it("omits styling the profile does not declare", () => {
    const url = buildTileUrl({ ...base, render: { assets: ["lwir11"] } });

    expect(params(url).has("colormap_name")).toBe(false);
    expect(params(url).has("nodata")).toBe(false);
  });
});
