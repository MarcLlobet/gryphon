import { describe, expect, it } from "vitest";
import { paintFor } from "./paint";

describe("paintFor", () => {
  it("leaves opacity out, because presentation is applied when the map repaints", () => {
    for (const draw of ["raster", "circle", "line", "fill", "heatmap"] as const) {
      expect(paintFor(draw, {})).not.toHaveProperty(`${draw}-opacity`);
    }
  });

  it("uses a flat colour when one is given", () => {
    expect(paintFor("circle", { color: "#abcdef" })).toMatchObject({ "circle-color": "#abcdef" });
  });

  it("interpolates a colour from a feature property", () => {
    const paint = paintFor("circle", {
      colorBy: {
        property: "mag",
        stops: [
          [2, "#111111"],
          [8, "#ffffff"],
        ],
      },
    });

    expect(paint["circle-color"]).toEqual(["interpolate", ["linear"], ["get", "mag"], 2, "#111111", 8, "#ffffff"]);
  });

  it("interpolates a radius from a feature property", () => {
    const paint = paintFor("circle", {
      radiusBy: {
        property: "mag",
        stops: [
          [2, 3],
          [8, 28],
        ],
      },
    });

    expect(paint["circle-radius"]).toEqual(["interpolate", ["linear"], ["get", "mag"], 2, 3, 8, 28]);
  });

  it("weights a heatmap by the same property a circle layer would size by", () => {
    const paint = paintFor("heatmap", {
      radiusBy: {
        property: "frp",
        stops: [
          [0, 0],
          [100, 1],
        ],
      },
    });

    expect(paint["heatmap-weight"]).toEqual(["interpolate", ["linear"], ["get", "frp"], 0, 0, 100, 1]);
  });

  it("lets the raw paint escape hatch win, so the typed fields are never a ceiling", () => {
    const paint = paintFor("circle", { color: "#abcdef", paint: { "circle-color": "#000000" } });

    expect(paint["circle-color"]).toBe("#000000");
  });
});
