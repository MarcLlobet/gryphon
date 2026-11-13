import { z } from "zod";

/** [west, south, east, north] in WGS84 degrees. */
export type BBox = readonly [west: number, south: number, east: number, north: number];

/** Barcelona and Castelldefels — home of ALEX. */
export const DEFAULT_BBOX: BBox = [1.9, 41.25, 2.3, 41.5];

const isLongitude = (value: number): boolean => value >= -180 && value <= 180;
const isLatitude = (value: number): boolean => value >= -90 && value <= 90;

export const isValidBBox = ([west, south, east, north]: BBox): boolean =>
  [west, south, east, north].every(Number.isFinite) &&
  isLongitude(west) &&
  isLongitude(east) &&
  isLatitude(south) &&
  isLatitude(north) &&
  west < east &&
  south < north;

/** Parses "west,south,east,north" into a BBox, or `null` when invalid. */
export const parseBBox = (value: string): BBox | null => {
  const parts = value.split(",").map((part) => part.trim());
  if (parts.length !== 4 || parts.some((part) => part === "")) {
    return null;
  }

  const [west, south, east, north] = parts.map(Number) as [number, number, number, number];
  const bbox: BBox = [west, south, east, north];

  return isValidBBox(bbox) ? bbox : null;
};

export const formatBBox = (bbox: BBox): string => bbox.join(",");

/** The same contract as `isValidBBox`, expressed for config documents. */
export const BBoxSchema = z
  .tuple([z.number(), z.number(), z.number(), z.number()])
  .readonly()
  .refine((values) => isValidBBox(values), {
    message: "Expected [west, south, east, north] in degrees, with west < east and south < north.",
  });
