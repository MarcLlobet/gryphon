/**
 * The layer's own icon when the document names one (any Lucide icon), otherwise a
 * glyph for what kind of thing it draws — tiles, points, lines, an area.
 *
 * Always paired with the layer's title rather than standing in for it: an icon
 * narrows down which row you want once you know the vocabulary, it does not teach
 * it. Marked `aria-hidden` for that reason.
 */
import { DynamicIcon } from "lucide-react/dynamic";
import type { ReactElement } from "react";
import type { LayerConfig } from "@/core/config/schema";
import { isIconName } from "./icons";

type Glyph = "tiles" | "imagery" | "points" | "line" | "area" | "heat";

const glyphFor = (layer: LayerConfig): Glyph => {
  switch (layer.type) {
    case "raster":
      return "tiles";
    case "image":
      return "imagery";
    case "stac":
      return "imagery";
    case "csv":
      return layer.draw === "heatmap" ? "heat" : "points";
    case "vector":
    case "geojson":
      if (layer.draw === "heatmap") return "heat";
      if (layer.draw === "line") return "line";
      if (layer.draw === "fill") return "area";
      return "points";
  }
};

const PATHS: Record<Glyph, ReactElement> = {
  tiles: (
    <>
      <rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1" />
      <rect x="10" y="2.5" width="5.5" height="5.5" rx="1" />
      <rect x="2.5" y="10" width="5.5" height="5.5" rx="1" />
      <rect x="10" y="10" width="5.5" height="5.5" rx="1" />
    </>
  ),
  imagery: (
    <>
      <rect x="2.5" y="3.5" width="13" height="11" rx="1.5" />
      <path d="M3.5 12.5 7 9l2.5 2.5L12 9l3 3.5" />
      <circle cx="6" cy="6.5" r="1.2" />
    </>
  ),
  points: (
    <>
      <circle cx="5.5" cy="6" r="2" />
      <circle cx="12" cy="9.5" r="2.4" />
      <circle cx="6.5" cy="13" r="1.5" />
    </>
  ),
  line: <path d="M2.5 13.5 6.5 7l3.5 3.5L15.5 4" />,
  area: <path d="M3 11.5 5.5 4.5l5 1.5L15 4.5v8L9 14.5 3 11.5Z" />,
  heat: (
    <>
      <circle cx="9" cy="9" r="2" />
      <circle cx="9" cy="9" r="4.5" opacity="0.55" />
      <circle cx="9" cy="9" r="7" opacity="0.25" />
    </>
  ),
};

const Glyph = ({ layer }: { layer: LayerConfig }) => (
  <svg
    viewBox="0 0 18 18"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {PATHS[glyphFor(layer)]}
  </svg>
);

export const LayerIcon = ({ layer }: { layer: LayerConfig }) => {
  if (layer.icon === undefined || !isIconName(layer.icon)) {
    return <Glyph layer={layer} />;
  }
  // Each Lucide icon loads as its own small chunk; the fixed box keeps the row from
  // shifting while it arrives.
  return (
    <span style={{ display: "inline-flex", width: 16, height: 16 }} aria-hidden="true">
      <DynamicIcon name={layer.icon} size={16} strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
};
