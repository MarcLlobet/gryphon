/** Evenly spaced tick values across a legend's range. */
export const rampTicks = (min: number, max: number, steps = 5): number[] =>
  Array.from({ length: steps + 1 }, (_, index) => min + ((max - min) * index) / steps);
