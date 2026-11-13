/**
 * The Gryphon head, drawn once in a 200×200 "art space" and reused by the header
 * mark, the mission patch and the intro (whose stars sit on these same vertices).
 */
export const GRYPHON_HEAD = {
  tufts: ["M80 70 C72 54 62 40 46 30 C56 46 64 60 70 78 Z", "M92 58 C86 40 78 26 66 14 C72 32 78 48 82 64 Z"],
  silhouette:
    "M40 214 L38 176 L30 170 L46 146 L38 140 L56 116 L48 110 L66 92 L60 86 L80 70 C96 52 116 42 138 44 C148 46 156 52 160 60 C176 64 190 80 190 100 C190 112 186 122 178 130 C178 120 174 112 166 108 C158 106 150 108 144 112 L146 116 C138 122 128 122 120 118 C116 134 118 152 124 170 C128 186 134 200 140 214 Z",
  beakShade: "M162 96 C172 104 178 116 178 130 C178 120 174 112 166 108 C164 104 162 100 162 96 Z",
  brow: "M110 68 C122 58 142 56 158 64 C146 64 132 68 122 76 Z",
  cere: "M160 60 C155 72 156 86 163 97",
  gape: "M166 108 C158 106 150 108 144 112 C136 117 126 116 117 110",
  feathers: [
    "M84 98 C94 104 104 104 112 98",
    "M70 120 C84 128 98 128 110 120",
    "M62 142 C78 151 94 151 108 142",
    "M60 166 C76 175 94 175 110 166",
  ],
  tuftLines: ["M78 66 L62 42", "M89 58 L78 32"],
  nostril: { cx: 167, cy: 74, rx: 3.6, ry: 2, rotate: 25 },
  eye: { cx: 134, cy: 81 },
} as const;

/** How the head sits inside the patch: patch = offset + scale · (head − (100, 100)). */
export const HEAD_IN_PATCH = { x: 100, y: 104, scale: 0.78 } as const;

/** Screen placement of an art-space drawing: screen = (tx + scale·x, ty + scale·y). */
export interface Placement {
  readonly scale: number;
  readonly tx: number;
  readonly ty: number;
}

/**
 * Given where the *head* art lands on screen, where the whole *patch* must go so its
 * head lands on exactly the same pixels.
 */
export const patchPlacement = (head: Placement): Placement => {
  const { x, y, scale: k } = HEAD_IN_PATCH;
  return {
    scale: head.scale / k,
    tx: head.tx + head.scale * 100 - (head.scale * x) / k,
    ty: head.ty + head.scale * 100 - (head.scale * y) / k,
  };
};
