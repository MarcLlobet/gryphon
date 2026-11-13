/**
 * Turns the config's small styling vocabulary into MapLibre paint properties.
 *
 * The typed fields (`color`, `radiusBy`, …) are the easy path the guided form edits.
 * `style.paint` is the escape hatch and is merged last, so convenience never becomes
 * a ceiling.
 */
import type { Style } from "@/core/config/schema";
import type { DrawKind } from "./layerSpec";

type Paint = Record<string, unknown>;

/** `["interpolate", ["linear"], ["get", prop], in0, out0, in1, out1, …]` */
const interpolate = (property: string, stops: readonly (readonly [number, unknown])[]): unknown[] => [
  "interpolate",
  ["linear"],
  ["get", property],
  ...stops.flatMap(([input, output]) => [input, output]),
];

const colorOf = (style: Style, fallback: string): unknown =>
  style.colorBy ? interpolate(style.colorBy.property, style.colorBy.stops) : (style.color ?? fallback);

const radiusOf = (style: Style, fallback: number): unknown =>
  style.radiusBy ? interpolate(style.radiusBy.property, style.radiusBy.stops) : (style.radius ?? fallback);

const byDraw: Record<DrawKind, (style: Style) => Paint> = {
  raster: () => ({ "raster-fade-duration": 200 }),
  circle: (style) => ({
    "circle-color": colorOf(style, "#fca50a"),
    "circle-radius": radiusOf(style, 5),
  }),
  line: (style) => ({
    "line-color": colorOf(style, "#fca50a"),
    "line-width": style.width ?? 1.5,
  }),
  fill: (style) => ({
    "fill-color": colorOf(style, "#fca50a"),
    "fill-outline-color": style.color ?? "#fcffa4",
  }),
  heatmap: (style) => ({
    "heatmap-radius": style.radius ?? 24,
    // Weight by the same property a circle layer would size by, when one is given.
    ...(style.radiusBy ? { "heatmap-weight": interpolate(style.radiusBy.property, style.radiusBy.stops) } : {}),
  }),
  symbol: () => ({}),
};

/**
 * Deliberately excludes opacity and visibility. Those are presentation, applied when
 * the map reconciles, so dragging the opacity slider never re-fetches a source.
 */
export const paintFor = (draw: DrawKind, style: Style): Paint => ({
  ...byDraw[draw](style),
  ...(style.paint ?? {}),
});
