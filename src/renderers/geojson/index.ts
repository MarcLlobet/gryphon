/**
 * GeoJSON: inline, fetched, or borrowed from a layer resolved earlier.
 *
 * Borrowing (`sourceOf`) is what lets a heatmap and a circle layer share one request
 * instead of asking the same server twice for the same points.
 */
import type { GryphonConfig } from "@/core/config/schema";
import { paintFor } from "@/core/render/paint";
import type { LayerSpec } from "@/core/render/layerSpec";
import { renderError, type LayerRenderer } from "@/core/render/renderer";
import { err, ok } from "@/core/result";
import { fetchJson, planRequest } from "@/transport/http";

type GeoJsonConfig = Extract<GryphonConfig["layers"][number], { type: "geojson" }>;

const specFor = (config: GeoJsonConfig, sourceId: string, data: unknown): LayerSpec[] => [
  {
    id: config.id,
    sourceId,
    source: {
      kind: "geojson",
      data,
      ...(config.attribution === undefined ? {} : { attribution: config.attribution }),
    },
    draw: config.draw,
    paint: paintFor(config.draw, config.style),
  },
];

export const geoJsonRenderer: LayerRenderer<GeoJsonConfig> = {
  type: "geojson",

  async resolve(config, context) {
    if (config.sourceOf !== undefined) {
      const shared = context.shared(config.sourceOf);
      return shared === undefined
        ? err(
            renderError(
              "config",
              `"${config.id}" borrows from "${config.sourceOf}", which must be a GeoJSON layer declared before it.`,
            ),
          )
        : ok(specFor(config, config.sourceOf, shared));
    }

    if (config.data !== undefined) {
      return ok(specFor(config, config.id, config.data));
    }

    if (config.url === undefined) {
      return err(renderError("config", `"${config.id}" needs a url, inline data, or sourceOf.`));
    }

    const plan = planRequest(config.url, context, { auth: config.auth, proxy: config.proxy });
    if (!plan.ok) {
      return plan;
    }

    const data = await fetchJson<unknown>(plan.value, context);
    return data.ok ? ok(specFor(config, config.id, data.value)) : data;
  },
};
