/**
 * Latitude/longitude columns in a CSV, normalised to GeoJSON.
 *
 * This is the renderer that justifies the whole credential design: NASA FIRMS serves
 * CSV behind a MAP_KEY, so a layer declares *that* it needs a key and the value is
 * supplied at runtime, never written into the document.
 */
import type { GryphonConfig } from "@/core/config/schema";
import { paintFor } from "@/core/render/paint";
import { renderError, type LayerRenderer } from "@/core/render/renderer";
import { err, ok } from "@/core/result";
import { fetchText, planRequest } from "@/transport/http";
import { parseCsv, type Row } from "./parse";

type CsvConfig = Extract<GryphonConfig["layers"][number], { type: "csv" }>;

interface PointFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Row;
}

const toFeatures = (rows: Row[], latColumn: string, lonColumn: string): PointFeature[] =>
  rows.flatMap((row) => {
    const lat = Number(row[latColumn]);
    const lon = Number(row[lonColumn]);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return [];
    }

    // Numeric-looking columns become numbers, so paint expressions can interpolate them.
    const properties = Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        const asNumber = Number(value);
        return [key, value !== "" && Number.isFinite(asNumber) ? asNumber : value];
      }),
    ) as Row;

    return [{ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [lon, lat] }, properties }];
  });

export const csvRenderer: LayerRenderer<CsvConfig> = {
  type: "csv",

  async resolve(config, context) {
    const plan = planRequest(config.url, context, { auth: config.auth, proxy: config.proxy });
    if (!plan.ok) {
      return plan;
    }

    const text = await fetchText(plan.value, context);
    if (!text.ok) {
      return text;
    }

    const { columns, rows } = parseCsv(text.value);

    // Checked against the header, not the rows: a file with no data rows but the right
    // columns is simply empty, while a file without them is not the CSV we asked for.
    if (!columns.includes(config.lat) || !columns.includes(config.lon)) {
      return err(
        renderError(
          "parse",
          `"${config.id}" expected columns "${config.lat}" and "${config.lon}"; the file has ${columns.join(", ") || "none"}.`,
        ),
      );
    }

    return ok([
      {
        id: config.id,
        sourceId: config.id,
        source: {
          kind: "geojson" as const,
          data: { type: "FeatureCollection", features: toFeatures(rows, config.lat, config.lon) },
          ...(config.attribution === undefined ? {} : { attribution: config.attribution }),
        },
        draw: config.draw,
        paint: paintFor(config.draw, config.style),
      },
    ]);
  },
};
