/**
 * The address a layer reads from, for showing on the configuration page: the file
 * or API a geojson/csv/image layer fetches, the tile template of a raster or vector
 * layer, or the catalog a stac layer searches.
 */
import type { LayerConfig } from "@/core/config/schema";

export interface SourceLink {
  readonly href: string | null;
  readonly label: string;
}

/** Tile templates contain {z}/{x}/{y}, which is not a page anyone can open. */
const isOpenable = (url: string) => !/\{[xyz]\}/.test(url);

const link = (url: string): SourceLink => ({ href: isOpenable(url) ? url : null, label: url });

export const sourceLinkOf = (layer: LayerConfig): SourceLink => {
  switch (layer.type) {
    case "geojson":
      if (layer.url !== undefined) return link(layer.url);
      if (layer.sourceOf !== undefined) return { href: null, label: `Shares the data of "${layer.sourceOf}"` };
      return { href: null, label: "Data written into the document" };
    case "csv":
    case "image":
      return link(layer.url);
    case "raster":
    case "vector":
      return link(layer.tiles[0] ?? "");
    case "stac":
      return {
        href: `${layer.endpoint}/collections/${layer.collection}`,
        label: `${layer.endpoint} · ${layer.collection}`,
      };
  }
};
