/**
 * The intro's clock. Times are seconds of *animation*, which is not wall-clock time:
 * the animation holds in the alignment phase until the app is ready, so the reveal
 * always lands on a map that is already interactive.
 */
export const TIMELINE = {
  warpEnd: 3.2,
  alignEnd: 6.0,
  /** Animation waits here (stars drifting into place) until boot is complete. */
  hold: 6.0,
  traceEnd: 8.0,
  eye: 7.8,
  logo: 8.6,
  dive: 10.4,
  done: 12.0,
} as const;

/** Never make anyone wait longer than this, ready or not. */
export const MAX_WAIT_SECONDS = 8;

export type IntroPhase = "warp" | "align" | "trace" | "logo" | "dive" | "done";

/**
 * Advances animation time by `dt`, unless the app is not ready yet: then the clock
 * stops at the hold point. After `MAX_WAIT_SECONDS` of real time it goes on anyway,
 * and the map shows its own loading states for whatever is still missing.
 */
export const advance = (t: number, dt: number, ready: boolean, waited: number): number => {
  const mayPass = ready || waited >= MAX_WAIT_SECONDS;
  const next = t + dt;
  if (!mayPass && next > TIMELINE.hold) {
    return Math.max(t, TIMELINE.hold);
  }
  return next;
};

export const phaseAt = (t: number): IntroPhase => {
  if (t >= TIMELINE.done) return "done";
  if (t >= TIMELINE.dive) return "dive";
  if (t >= TIMELINE.logo) return "logo";
  if (t >= TIMELINE.alignEnd) return "trace";
  if (t >= TIMELINE.warpEnd) return "align";
  return "warp";
};

/** 0–1 within a window, clamped. */
export const progressIn = (t: number, from: number, to: number): number =>
  Math.min(1, Math.max(0, (t - from) / (to - from)));
