import { describe, expect, it } from "vitest";
import { artPlacement, EYE, finalFov, placeOnRay, STROKES, uniqueStars } from "./asterism";

/** Pinhole projection from the origin, looking down -Z. */
const project = ([x, y, z]: [number, number, number], width: number, height: number, fov: number) => {
  const focal = height / 2 / Math.tan((fov * Math.PI) / 360);
  return [width / 2 + (x / -z) * focal, height / 2 - (y / -z) * focal];
};

describe("the perspective trick", () => {
  it("lands every star on its art position whatever its depth", () => {
    const placement = artPlacement(1440, 900, 50);

    for (const star of uniqueStars()) {
      for (const depth of [60, 140, 250]) {
        const [sx, sy] = project(placeOnRay(star.point, depth), 1440, 900, 50);
        expect(sx).toBeCloseTo(placement.tx + placement.scale * star.point[0], 6);
        expect(sy).toBeCloseTo(placement.ty + placement.scale * star.point[1], 6);
      }
    }
  });

  it("does not line up from anywhere else", () => {
    const near = placeOnRay(EYE, 60);
    const far = placeOnRay(EYE, 240);
    const shift = (p: [number, number, number]) => [p[0] - 20, p[1], p[2]] as [number, number, number];

    const [a] = project(shift(near), 1440, 900, 50);
    const [b] = project(shift(far), 1440, 900, 50);

    expect(Math.abs((a ?? 0) - (b ?? 0))).toBeGreaterThan(50);
  });
});

describe("uniqueStars", () => {
  it("has one star per distinct vertex, shared where strokes meet", () => {
    const keys = STROKES.flatMap((stroke) => stroke.points.map((p) => p.join(",")));
    expect(uniqueStars()).toHaveLength(new Set(keys).size);
  });

  it("draws silhouette stars larger", () => {
    const beakTip = uniqueStars().find((star) => star.key === "190,100");
    const minor = uniqueStars().find((star) => star.key === "30,170");
    expect(beakTip?.radius).toBeGreaterThan(minor?.radius ?? Infinity);
  });
});

describe("finalFov", () => {
  it("is 50° on landscape screens", () => {
    expect(finalFov(16 / 9)).toBeCloseTo(50, 6);
  });

  it("widens on portrait screens so the emblem still fits", () => {
    expect(finalFov(0.46)).toBeGreaterThan(70);
    expect(finalFov(0.46)).toBeLessThanOrEqual(100);
  });
});
