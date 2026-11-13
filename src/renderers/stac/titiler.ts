/**
 * Builds XYZ tile templates for a TiTiler deployment.
 *
 * The styling comes from the layer's `render` profile — modelled on the STAC `renders`
 * extension — rather than from constants in here. A catalog that publishes how its
 * collection should be painted gets painted that way, and Gryphon stops guessing.
 */
import type { RenderProfile } from "@/core/config/schema";

export interface TileUrlParams {
  readonly tiler: string;
  readonly collection: string;
  readonly itemId: string;
  readonly render: RenderProfile;
}

export const buildTileUrl = ({ tiler, collection, itemId, render }: TileUrlParams): string => {
  const params = new URLSearchParams({ collection, item: itemId });

  for (const asset of render.assets) {
    params.append("assets", asset);
  }
  if (render.colormap_name !== undefined) {
    params.set("colormap_name", render.colormap_name);
  }
  for (const [min, max] of render.rescale ?? []) {
    params.append("rescale", `${min},${max}`);
  }
  if (render.nodata !== undefined) {
    params.set("nodata", String(render.nodata));
  }
  params.set("format", "png");

  return `${tiler.replace(/\/$/, "")}/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?${params.toString()}`;
};
