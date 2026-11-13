/** Mapbox Vector Tiles. The tile server does the hard part; this only names a layer. */
import type { GryphonConfig } from "@/core/config/schema";
import { paintFor } from "@/core/render/paint";
import { renderError, type LayerRenderer } from "@/core/render/renderer";
import { err, ok } from "@/core/result";

type VectorConfig = Extract<GryphonConfig["layers"][number], { type: "vector" }>;

export const vectorRenderer: LayerRenderer<VectorConfig> = {
  type: "vector",

  async resolve(config) {
    if (config.tiles.length === 0) {
      return err(renderError("config", `"${config.id}" declares no tile templates.`));
    }

    return ok([
      {
        id: config.id,
        sourceId: config.id,
        source: {
          kind: "vector" as const,
          tiles: config.tiles,
          ...(config.minzoom === undefined ? {} : { minzoom: config.minzoom }),
          ...(config.maxzoom === undefined ? {} : { maxzoom: config.maxzoom }),
          ...(config.attribution === undefined ? {} : { attribution: config.attribution }),
        },
        draw: config.draw,
        sourceLayer: config.sourceLayer,
        paint: paintFor(config.draw, config.style),
      },
    ]);
  },
};
