import { describe, expect, it } from "vitest";
import { describeMove, moveInList, targetIndex, toDocumentOrder, toVisualOrder } from "./reorder";

describe("moveInList", () => {
  it("moves an item earlier", () => {
    expect(moveInList(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
  });

  it("moves an item later", () => {
    expect(moveInList(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("clamps past the ends rather than wrapping around", () => {
    expect(moveInList(["a", "b", "c"], 0, -5)).toEqual(["a", "b", "c"]);
    expect(moveInList(["a", "b", "c"], 0, 99)).toEqual(["b", "c", "a"]);
  });

  it("leaves the list alone when the index is not in it", () => {
    expect(moveInList(["a", "b"], 7, 0)).toEqual(["a", "b"]);
  });

  it("does not mutate the input", () => {
    const items = ["a", "b", "c"];
    moveInList(items, 0, 2);
    expect(items).toEqual(["a", "b", "c"]);
  });
});

describe("visual and document order", () => {
  it("are the reverse of each other: the top row paints last", () => {
    expect(toVisualOrder(["bottom", "middle", "top"])).toEqual(["top", "middle", "bottom"]);
    expect(toDocumentOrder(["top", "middle", "bottom"])).toEqual(["bottom", "middle", "top"]);
  });

  it("round-trips", () => {
    const document = ["a", "b", "c", "d"];
    expect(toDocumentOrder(toVisualOrder(document))).toEqual(document);
  });
});

describe("targetIndex", () => {
  const midpoints = [20, 60, 100];

  it("holds position until the neighbour's midpoint is passed", () => {
    // Dragging row 0 down: still row 0 right up to row 1's midpoint.
    expect(targetIndex(midpoints, 0, 25)).toBe(0);
    expect(targetIndex(midpoints, 0, 59)).toBe(0);
    expect(targetIndex(midpoints, 0, 61)).toBe(1);
  });

  it("moves several rows at once when dragged far", () => {
    expect(targetIndex(midpoints, 0, 140)).toBe(2);
  });

  it("works upwards as well as downwards", () => {
    expect(targetIndex(midpoints, 2, 75)).toBe(2);
    expect(targetIndex(midpoints, 2, 55)).toBe(1);
    expect(targetIndex(midpoints, 2, 10)).toBe(0);
  });

  it("clamps beyond either end of the list", () => {
    expect(targetIndex(midpoints, 1, 9999)).toBe(2);
    expect(targetIndex(midpoints, 1, -9999)).toBe(0);
  });
});

describe("describeMove", () => {
  it("says where the layer landed and what it sits above", () => {
    expect(describeMove("Sea ice", 1, 4, "Precipitation")).toBe(
      "Sea ice moved to position 2 of 4, above Precipitation.",
    );
  });

  it("says when it reached the bottom of the stack", () => {
    expect(describeMove("Sea ice", 3, 4)).toBe("Sea ice moved to position 4 of 4, at the bottom.");
  });
});
