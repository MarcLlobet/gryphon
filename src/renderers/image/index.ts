/** A single georeferenced image pinned to four corners. */
import type { GryphonConfig } from "@/core/config/schema";
import { paintFor } from "@/core/render/paint";
import type { LayerRenderer } from "@/core/render/renderer";
import { ok } from "@/core/result";

type ImageConfig = Extract<GryphonConfig["layers"][number], { type: "image" }>;

export const imageRenderer: LayerRenderer<ImageConfig> = {
  type: "image",

  async resolve(config) {
    return ok([
      {
        id: config.id,
        sourceId: config.id,
        source: {
          kind: "image" as const,
          url: config.url,
          coordinates: config.coordinates,
          ...(config.attribution === undefined ? {} : { attribution: config.attribution }),
        },
        draw: "raster" as const,
        paint: paintFor("raster", {}),
      },
    ]);
  },
};
