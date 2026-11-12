/**
 * Minimal, typed subset of the SpatioTemporal Asset Catalog (STAC) spec
 * — the same standard ALEX (Aistech Land EXplorer) exposes for its archive.
 * https://github.com/radiantearth/stac-api-spec
 */

export interface StacLink {
  rel: string;
  href: string;
  type?: string;
  title?: string;
}

export interface StacAsset {
  href: string;
  type?: string;
  title?: string;
  roles?: string[];
}

export interface StacGeometry {
  type: string;
  coordinates: unknown;
}

export interface StacItemProperties {
  datetime: string | null;
  platform?: string;
  "eo:cloud_cover"?: number;
  [key: string]: unknown;
}

export interface StacItem {
  type: "Feature";
  stac_version: string;
  id: string;
  collection?: string;
  bbox: number[];
  geometry: StacGeometry | null;
  properties: StacItemProperties;
  assets: Record<string, StacAsset>;
  links: StacLink[];
}

export interface StacItemCollection {
  type: "FeatureCollection";
  features: StacItem[];
  links?: StacLink[];
}

export interface StacSortBy {
  field: string;
  direction: "asc" | "desc";
}

export interface StacSearchBody {
  collections: string[];
  bbox?: number[];
  datetime?: string;
  limit?: number;
  query?: Record<string, Record<string, number | string>>;
  sortby?: StacSortBy[];
}
