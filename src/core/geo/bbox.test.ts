import { describe, expect, it } from "vitest";
import { DEFAULT_BBOX, formatBBox, isValidBBox, parseBBox } from "./bbox";

describe("parseBBox", () => {
  it("parses a valid west,south,east,north string", () => {
    expect(parseBBox("1.9, 41.25, 2.3, 41.5")).toEqual([1.9, 41.25, 2.3, 41.5]);
  });

  it.each([
    ["too few values", "1,2,3"],
    ["too many values", "1,2,3,4,5"],
    ["empty value", "1,,3,4"],
    ["not a number", "a,41,2,42"],
    ["west after east", "3,41,2,42"],
    ["south after north", "1,43,2,42"],
    ["longitude out of range", "-181,41,2,42"],
    ["latitude out of range", "1,-91,2,42"],
  ])("returns null for %s", (_label, input) => {
    expect(parseBBox(input)).toBeNull();
  });
});

describe("isValidBBox", () => {
  it("accepts the default area", () => {
    expect(isValidBBox(DEFAULT_BBOX)).toBe(true);
  });
});

describe("formatBBox", () => {
  it("round-trips with parseBBox", () => {
    expect(parseBBox(formatBBox(DEFAULT_BBOX))).toEqual(DEFAULT_BBOX);
  });
});
