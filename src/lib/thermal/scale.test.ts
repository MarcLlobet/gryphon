import { describe, expect, it } from "vitest";
import { celsiusToDn, dnToCelsius, legendTicks, thermalRescale } from "./scale";

describe("Landsat surface temperature scaling", () => {
  it("converts DN to Celsius with the USGS scale and offset", () => {
    expect(dnToCelsius(36322)).toBeCloseTo(0, 1);
    expect(dnToCelsius(50951)).toBeCloseTo(50, 1);
  });

  it("round-trips Celsius through DN", () => {
    expect(dnToCelsius(celsiusToDn(21.5))).toBeCloseTo(21.5, 6);
  });

  it("builds the tiler rescale range for 0–50 °C", () => {
    expect(thermalRescale()).toBe("36322,50951");
  });

  it("spreads legend ticks evenly", () => {
    expect(legendTicks()).toEqual([0, 10, 20, 30, 40, 50]);
    expect(legendTicks({ min: -10, max: 30 }, 4)).toEqual([-10, 0, 10, 20, 30]);
  });
});
