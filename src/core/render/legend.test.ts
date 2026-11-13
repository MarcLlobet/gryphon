import { describe, expect, it } from "vitest";
import { rampTicks } from "./legend";

describe("rampTicks", () => {
  it("spaces ticks evenly across the range, inclusive of both ends", () => {
    expect(rampTicks(0, 50)).toEqual([0, 10, 20, 30, 40, 50]);
  });

  it("honours a custom number of steps", () => {
    expect(rampTicks(0, 10, 2)).toEqual([0, 5, 10]);
  });

  it("handles a negative range", () => {
    expect(rampTicks(-20, 20, 4)).toEqual([-20, -10, 0, 10, 20]);
  });
});
