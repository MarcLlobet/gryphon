import { describe, expect, it } from "vitest";
import { buildThermalTileUrl, PC_DATA_API_URL } from "./tiles";

describe("buildThermalTileUrl", () => {
  const url = buildThermalTileUrl("LC09_L2SP_197031_20261103_02_T1");

  it("keeps the XYZ placeholders un-encoded for MapLibre", () => {
    expect(url.startsWith(`${PC_DATA_API_URL}/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?`)).toBe(true);
  });

  it("asks for the surface temperature band of that scene, painted with the thermal palette", () => {
    const params = new URL(url.replace("{z}/{x}/{y}", "0/0/0")).searchParams;

    expect(Object.fromEntries(params)).toEqual({
      collection: "landsat-c2-l2",
      item: "LC09_L2SP_197031_20261103_02_T1",
      assets: "lwir11",
      colormap_name: "inferno",
      rescale: "36322,50951",
      nodata: "0",
      format: "png",
    });
  });
});
