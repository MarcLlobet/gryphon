/** Pre-rendered XYZ tiles — the simplest possible renderer, and the shape of the rest. */
import type { GryphonConfig } from "@/core/config/schema";
import { paintFor } from "@/core/render/paint";
import { renderError, type LayerRenderer } from "@/core/render/renderer";
import { err, ok } from "@/core/result";

type RasterConfig = Extract<GryphonConfig["layers"][number], { type: "raster" }>;

export const rasterRenderer: LayerRenderer<RasterConfig> = {
  type: "raster",

  async resolve(config) {
    if (config.tiles.length === 0) {
      return err(renderError("config", `"${config.id}" declares no tile templates.`));
    }

    return ok([
      {
        id: config.id,
        sourceId: config.id,
        source: {
          kind: "raster" as const,
          tiles: config.tiles,
          tileSize: config.tileSize,
          ...(config.minzoom === undefined ? {} : { minzoom: config.minzoom }),
          ...(config.maxzoom === undefined ? {} : { maxzoom: config.maxzoom }),
          ...(config.attribution === undefined ? {} : { attribution: config.attribution }),
        },
        draw: "raster" as const,
        paint: paintFor("raster", {}),
      },
    ]);
  },
};
