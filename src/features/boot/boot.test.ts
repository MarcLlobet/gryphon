import { describe, expect, it, vi } from "vitest";
import { BOOT_TASKS, createBootTracker } from "./boot";

const clock = () => {
  let time = 1000;
  return { now: () => time, advance: (ms: number) => (time += ms) };
};

describe("createBootTracker", () => {
  it("starts with nothing done", () => {
    const tracker = createBootTracker(clock().now);

    expect(tracker.getSnapshot()).toEqual({ completedAt: {}, progress: 0, ready: false });
  });

  it("weights progress by task and timestamps each milestone from creation", () => {
    const c = clock();
    const tracker = createBootTracker(c.now);

    c.advance(250);
    tracker.mark("runtime");
    c.advance(500);
    tracker.mark("layers");

    const snapshot = tracker.getSnapshot();
    expect(snapshot.completedAt).toEqual({ runtime: 250, layers: 750 });
    expect(snapshot.progress).toBeCloseTo(4 / 8);
    expect(snapshot.ready).toBe(false);
  });

  it("is ready once every task is marked", () => {
    const tracker = createBootTracker(clock().now);

    BOOT_TASKS.forEach((task) => tracker.mark(task.id));

    expect(tracker.getSnapshot()).toMatchObject({ progress: 1, ready: true });
  });

  it("keeps the first timestamp and does not notify twice", () => {
    const c = clock();
    const tracker = createBootTracker(c.now);
    const listener = vi.fn();
    tracker.subscribe(listener);

    tracker.mark("basemap");
    c.advance(900);
    tracker.mark("basemap");

    expect(tracker.getSnapshot().completedAt.basemap).toBe(0);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", () => {
    const tracker = createBootTracker(clock().now);
    const listener = vi.fn();
    const unsubscribe = tracker.subscribe(listener);

    unsubscribe();
    tracker.mark("idle");

    expect(listener).not.toHaveBeenCalled();
  });
});
