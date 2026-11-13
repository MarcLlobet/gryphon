import { describe, expect, it } from "vitest";
import { celsiusToDn, dnToCelsius, thermalRescale } from "./temperature";

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
});
