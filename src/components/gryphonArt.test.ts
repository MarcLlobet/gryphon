import { describe, expect, it } from "vitest";
import { HEAD_IN_PATCH, patchPlacement } from "./gryphonArt";

describe("patchPlacement", () => {
  it("puts the patch's head on the same pixels as the bare head", () => {
    const head = { scale: 2.4, tx: 130, ty: -40 };
    const patch = patchPlacement(head);

    for (const [hx, hy] of [
      [134, 81],
      [190, 100],
      [46, 30],
    ] as const) {
      // Head point → patch space, as the patch SVG transforms it.
      const px = HEAD_IN_PATCH.x + HEAD_IN_PATCH.scale * (hx - 100);
      const py = HEAD_IN_PATCH.y + HEAD_IN_PATCH.scale * (hy - 100);

      expect(patch.tx + patch.scale * px).toBeCloseTo(head.tx + head.scale * hx, 6);
      expect(patch.ty + patch.scale * py).toBeCloseTo(head.ty + head.scale * hy, 6);
    }
  });
});
