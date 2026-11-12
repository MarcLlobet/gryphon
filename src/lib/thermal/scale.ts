/**
 * Landsat Collection 2 Level-2 surface temperature (ST_B10) is delivered as
 * scaled integers. Kelvin = DN × 0.00341802 + 149.0 (USGS product guide).
 */
export const ST_SCALE = 0.00341802;
export const ST_OFFSET_KELVIN = 149.0;
const KELVIN_AT_ZERO_CELSIUS = 273.15;

export const dnToCelsius = (dn: number): number => dn * ST_SCALE + ST_OFFSET_KELVIN - KELVIN_AT_ZERO_CELSIUS;

export const celsiusToDn = (celsius: number): number =>
  (celsius + KELVIN_AT_ZERO_CELSIUS - ST_OFFSET_KELVIN) / ST_SCALE;

/** Temperature range painted by the thermal palette, in °C. */
export const THERMAL_RANGE_CELSIUS = { min: 0, max: 50 } as const;

/** The same range as raw DN values, for the tiler's `rescale` parameter. */
export const thermalRescale = (
  range: { min: number; max: number } = THERMAL_RANGE_CELSIUS,
): string => `${Math.round(celsiusToDn(range.min))},${Math.round(celsiusToDn(range.max))}`;

/** Evenly spaced legend ticks across the range, in °C. */
export const legendTicks = (
  range: { min: number; max: number } = THERMAL_RANGE_CELSIUS,
  steps = 5,
): number[] => Array.from({ length: steps + 1 }, (_, index) => range.min + ((range.max - range.min) * index) / steps);
