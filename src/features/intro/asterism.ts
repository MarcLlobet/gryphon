/**
 * The Gryphon asterism, in the coordinates of the griffin head artwork
 * (`GRYPHON_HEAD` in components/gryphonArt.ts, a 200×200 space).
 *
 * Real constellations are a trick of perspective: their stars sit at very different
 * distances and only line up seen from Earth. This one works the same way. Every
 * star sits somewhere along the ray from the final camera position through its 2D
 * point, so the figure only appears when the camera arrives there.
 */
export type Point2 = readonly [x: number, y: number];

export interface Stroke {
  readonly points: readonly Point2[];
}

/** Drawing order matters: stars light up as the line reaches them. */
export const STROKES: readonly Stroke[] = [
  {
    // Neck hackles, crown, beak and throat, in one sweep.
    points: [
      [38, 176],
      [30, 170],
      [46, 146],
      [38, 140],
      [56, 116],
      [48, 110],
      [66, 92],
      [60, 86],
      [80, 70],
      [108, 48],
      [138, 44],
      [160, 60],
      [184, 77],
      [190, 100],
      [178, 130],
      [166, 108],
      [144, 112],
      [120, 118],
      [118, 145],
      [124, 170],
      [134, 196],
    ],
  },
  {
    points: [
      [80, 70],
      [46, 30],
      [70, 78],
    ],
  },
  {
    points: [
      [92, 58],
      [66, 14],
      [84, 64],
    ],
  },
  {
    points: [
      [110, 68],
      [134, 58],
      [158, 64],
    ],
  },
];

/** The thermal eye: the brightest star, a nod to Altair in Aquila, the eagle. */
export const EYE: Point2 = [134, 81];

/** Stars that carry the silhouette are drawn larger. */
const KEY_STARS = new Set(["190,100", "178,130", "46,30", "66,14", "38,176", "138,44", "160,60"]);

export interface StarSpec {
  readonly key: string;
  readonly point: Point2;
  readonly radius: number;
}

export const uniqueStars = (): StarSpec[] => {
  const seen = new Map<string, StarSpec>();
  for (const stroke of STROKES) {
    for (const point of stroke.points) {
      const key = point.join(",");
      if (!seen.has(key)) {
        seen.set(key, { key, point, radius: KEY_STARS.has(key) ? 3.1 : 2.1 });
      }
    }
  }
  return [...seen.values()];
};

/**
 * Art space → normalised view units, where 1 unit is `UNIT` art pixels and the
 * figure is lifted by `LIFT` to leave room below it for the boot readout.
 */
export const LAYOUT = { centerX: 110, centerY: 112, unit: 90, lift: 0.1, spread: 0.233 } as const;

export const toViewUnits = ([x, y]: Point2): [number, number] => [
  (x - LAYOUT.centerX) / LAYOUT.unit,
  -(y - LAYOUT.centerY) / LAYOUT.unit + LAYOUT.lift,
];

/**
 * Direction from the final camera (at the origin, looking down -Z) through a point,
 * before normalising. Placing a star anywhere along it keeps its on-screen position.
 */
export const rayDirection = (point: Point2): [number, number, number] => {
  const [ux, uy] = toViewUnits(point);
  return [ux * LAYOUT.spread, uy * LAYOUT.spread, -1];
};

export const placeOnRay = (point: Point2, depth: number): [number, number, number] => {
  const [dx, dy, dz] = rayDirection(point);
  const length = Math.hypot(dx, dy, dz);
  return [(dx / length) * depth, (dy / length) * depth, (dz / length) * depth];
};

/** Affine map from art space to screen pixels: screen = (tx + s·x, ty + s·y). */
export interface Placement {
  readonly scale: number;
  readonly tx: number;
  readonly ty: number;
}

/**
 * Where the art lands on screen when the camera sits at the origin with this vertical
 * field of view. Used to lay the emblem exactly over the stars.
 */
export const artPlacement = (width: number, height: number, fovDegrees: number): Placement => {
  const focal = height / 2 / Math.tan((fovDegrees * Math.PI) / 360);
  const scale = (LAYOUT.spread * focal) / LAYOUT.unit;
  return {
    scale,
    tx: width / 2 - LAYOUT.centerX * scale,
    ty: height / 2 - LAYOUT.centerY * scale - LAYOUT.lift * LAYOUT.spread * focal,
  };
};

/** Half-extent of the emblem (ring included) in view units, used to fit narrow screens. */
const EMBLEM_HALF_WIDTH = 1.45;

/** Vertical FOV that keeps the whole emblem on screen: 50° normally, wider on phones. */
export const finalFov = (aspect: number): number => {
  const needed = (EMBLEM_HALF_WIDTH * LAYOUT.spread) / Math.max(aspect, 0.1);
  const half = Math.max(Math.tan((25 * Math.PI) / 180), needed);
  return Math.min(100, (Math.atan(half) * 360) / Math.PI);
};
