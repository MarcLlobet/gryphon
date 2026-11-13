import { describe, expect, it } from "vitest";
import { advance, MAX_WAIT_SECONDS, phaseAt, progressIn, TIMELINE } from "./timeline";

describe("advance", () => {
  it("runs freely before the hold point", () => {
    expect(advance(1, 0.5, false, 1)).toBe(1.5);
  });

  it("stops at the hold point while the app is loading", () => {
    expect(advance(TIMELINE.hold - 0.1, 0.5, false, 3)).toBe(TIMELINE.hold);
    expect(advance(TIMELINE.hold, 0.5, false, 4)).toBe(TIMELINE.hold);
  });

  it("goes on as soon as the app is ready", () => {
    expect(advance(TIMELINE.hold, 0.5, true, 4)).toBe(TIMELINE.hold + 0.5);
  });

  it("goes on anyway after the maximum wait", () => {
    expect(advance(TIMELINE.hold, 0.5, false, MAX_WAIT_SECONDS)).toBe(TIMELINE.hold + 0.5);
  });

  it("never moves backwards after a skip past the hold point", () => {
    expect(advance(TIMELINE.logo, 0.016, false, 1)).toBe(TIMELINE.logo);
  });
});

describe("phaseAt", () => {
  it.each([
    [0, "warp"],
    [TIMELINE.warpEnd, "align"],
    [TIMELINE.alignEnd, "trace"],
    [TIMELINE.logo, "logo"],
    [TIMELINE.dive, "dive"],
    [TIMELINE.done, "done"],
  ] as const)("at %s s is %s", (t, phase) => {
    expect(phaseAt(t)).toBe(phase);
  });
});

describe("progressIn", () => {
  it("clamps to the window", () => {
    expect(progressIn(0, 1, 3)).toBe(0);
    expect(progressIn(2, 1, 3)).toBe(0.5);
    expect(progressIn(9, 1, 3)).toBe(1);
  });
});
