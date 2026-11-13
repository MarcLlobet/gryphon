import { describe, expect, it } from "vitest";
import { parseCsv, splitLine } from "./parse";

describe("splitLine", () => {
  it("splits plain fields", () => {
    expect(splitLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("keeps commas inside quoted fields", () => {
    expect(splitLine('a,"b,still b",c')).toEqual(["a", "b,still b", "c"]);
  });

  it("unescapes a doubled quote inside a quoted field", () => {
    expect(splitLine('a,"say ""hi""",c')).toEqual(["a", 'say "hi"', "c"]);
  });

  it("keeps empty trailing fields", () => {
    expect(splitLine("a,,")).toEqual(["a", "", ""]);
  });
});

describe("parseCsv", () => {
  it("reads the header and the rows", () => {
    const { columns, rows } = parseCsv("lat,lon\n41.4,2.1\n41.3,2.2\n");

    expect(columns).toEqual(["lat", "lon"]);
    expect(rows).toEqual([
      { lat: "41.4", lon: "2.1" },
      { lat: "41.3", lon: "2.2" },
    ]);
  });

  it("distinguishes an empty file from a header with no rows", () => {
    expect(parseCsv("")).toEqual({ columns: [], rows: [] });
    expect(parseCsv("lat,lon\n")).toEqual({ columns: ["lat", "lon"], rows: [] });
  });

  it("tolerates CRLF line endings", () => {
    expect(parseCsv("lat,lon\r\n41.4,2.1\r\n").rows).toEqual([{ lat: "41.4", lon: "2.1" }]);
  });

  it("pads a short row rather than losing the column", () => {
    expect(parseCsv("a,b,c\n1,2\n").rows).toEqual([{ a: "1", b: "2", c: "" }]);
  });
});
