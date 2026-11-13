/**
 * A typed, minimal subset of the SpatioTemporal Asset Catalog spec.
 * https://github.com/radiantearth/stac-api-spec
 *
 * Parsed rather than cast: this is a trust boundary, and a catalog that changes shape
 * should produce one readable error, not an undefined three frames later.
 */
import { z } from "zod";

export const StacAssetSchema = z.looseObject({
  href: z.string(),
  type: z.string().optional(),
  title: z.string().optional(),
  roles: z.array(z.string()).optional(),
});

export const StacItemSchema = z.looseObject({
  id: z.string(),
  collection: z.string().optional(),
  bbox: z.array(z.number()).optional(),
  geometry: z.unknown().nullable().optional(),
  properties: z.looseObject({
    datetime: z.string().nullable().optional(),
    platform: z.string().optional(),
  }),
  assets: z.record(z.string(), StacAssetSchema).default({}),
});

export const StacItemCollectionSchema = z.looseObject({
  type: z.literal("FeatureCollection"),
  features: z.array(StacItemSchema),
});

export type StacItem = z.infer<typeof StacItemSchema>;
export type StacItemCollection = z.infer<typeof StacItemCollectionSchema>;

export interface StacSearchBody {
  collections: string[];
  bbox?: number[];
  limit?: number;
  query?: Record<string, Record<string, number | string>>;
  sortby?: { field: string; direction: "asc" | "desc" }[];
}
