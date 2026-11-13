/**
 * A STAC search rendered through a dynamic tiler.
 *
 * Nothing here names a vendor: endpoint, collection and render profile all arrive
 * from the document, so Planetary Computer and Earth Search are the same code path
 * with different JSON.
 *
 * One search can produce two layers — the most recent scene as a raster, and every
 * matched scene's footprint as an outline — from a single request.
 */
import type { GryphonConfig } from "@/core/config/schema";
import type { LayerSpec } from "@/core/render/layerSpec";
import { paintFor } from "@/core/render/paint";
import { renderError, type LayerRenderer, type RenderContext } from "@/core/render/renderer";
import { err, ok } from "@/core/result";
import { planRequest, postJson } from "@/transport/http";
import { buildTileUrl } from "./titiler";
import { StacItemCollectionSchema, type StacItem, type StacSearchBody } from "./types";

type StacConfig = Extract<GryphonConfig["layers"][number], { type: "stac" }>;

export const buildSearchBody = (config: StacConfig, bbox: readonly number[]): StacSearchBody => ({
  collections: [config.collection],
  bbox: [...bbox],
  limit: config.limit,
  ...(config.maxCloudCover === undefined ? {} : { query: { "eo:cloud_cover": { lt: config.maxCloudCover } } }),
  sortby: [{ field: "datetime", direction: "desc" }],
});

const footprintCollection = (items: StacItem[]) => ({
  type: "FeatureCollection" as const,
  features: items
    .filter((item) => item.geometry !== null && item.geometry !== undefined)
    .map((item) => ({
      type: "Feature" as const,
      geometry: item.geometry,
      properties: {
        id: item.id,
        datetime: item.properties.datetime ?? null,
        platform: item.properties.platform ?? null,
      },
    })),
});

const FOOTPRINT_SUFFIX = ":footprints";

export const footprintLayerId = (layerId: string): string => `${layerId}${FOOTPRINT_SUFFIX}`;

export const stacRenderer: LayerRenderer<StacConfig> = {
  type: "stac",

  async resolve(config: StacConfig, context: RenderContext) {
    const bbox = config.bbox ?? context.bbox;
    if (bbox === undefined) {
      return err(renderError("config", `"${config.id}" needs a bbox, either on the layer or as the view.`));
    }

    // A commercial catalog is reached the same way an open one is — the credential
    // slot is the only difference, and it is resolved here rather than stored.
    const plan = planRequest(`${config.endpoint.replace(/\/$/, "")}/search`, context, {
      auth: config.auth,
      proxy: config.proxy,
    });
    if (!plan.ok) {
      return plan;
    }

    const response = await postJson<unknown>(plan.value, buildSearchBody(config, bbox), context);
    if (!response.ok) {
      return response;
    }

    const parsed = StacItemCollectionSchema.safeParse(response.value);
    if (!parsed.success) {
      return err(renderError("parse", `"${config.id}" received something that is not a STAC item collection.`));
    }

    const items = parsed.data.features;
    const newest = items[0];
    if (newest === undefined) {
      // An empty archive is an answer, not a failure: the layer simply paints nothing.
      return ok([]);
    }

    const tileUrl = buildTileUrl({
      tiler: config.tiler,
      collection: config.collection,
      itemId: newest.id,
      render: config.render,
    });

    // MapLibre fetches tiles itself and cannot attach headers, so a header credential
    // cannot reach the tiler. A query credential can, and is appended here.
    const authedTileUrl =
      config.auth?.in === "query"
        ? `${tileUrl}&${encodeURIComponent(config.auth.name)}=${encodeURIComponent(context.secret(config.auth) ?? "")}`
        : tileUrl;

    if (config.auth?.in === "header") {
      return err(
        renderError(
          "config",
          `"${config.id}" uses a header credential, which cannot be sent with map tiles. Use a query credential or a proxy.`,
        ),
      );
    }

    const specs: LayerSpec[] = [
      {
        id: config.id,
        sourceId: config.id,
        source: {
          kind: "raster",
          tiles: [authedTileUrl],
          tileSize: 256,
          ...(config.attribution === undefined ? {} : { attribution: config.attribution }),
        },
        draw: "raster",
        paint: paintFor("raster", {}),
      },
    ];

    if (config.footprints) {
      specs.push({
        id: footprintLayerId(config.id),
        sourceId: footprintLayerId(config.id),
        source: { kind: "geojson", data: footprintCollection(items) },
        draw: "line",
        paint: paintFor("line", { color: "#fcffa4", width: 1 }),
      });
    }

    return ok(specs);
  },
};
