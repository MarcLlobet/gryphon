/**
 * Boot milestones: the real events the intro waits for before it hands over to the
 * map. Each one is marked once, timestamped, and mirrored as a `performance.mark`
 * so it shows up in the browser's performance panel.
 */
export type BootTaskId = "runtime" | "basemap" | "layers" | "idle";

export interface BootTask {
  readonly id: BootTaskId;
  readonly label: string;
  readonly weight: number;
}

export const BOOT_TASKS: readonly BootTask[] = [
  { id: "runtime", label: "Map runtime", weight: 1 },
  { id: "basemap", label: "Basemap style · fonts", weight: 2 },
  { id: "layers", label: "Layer data · every layer", weight: 3 },
  { id: "idle", label: "Tiles · map idle", weight: 2 },
];

export interface BootSnapshot {
  /** Milliseconds since the tracker was created, per completed task. */
  readonly completedAt: Partial<Record<BootTaskId, number>>;
  /** Weighted share of completed tasks, 0–1. */
  readonly progress: number;
  /** Every task is complete: the map is interactive with all layers loaded. */
  readonly ready: boolean;
}

export interface BootTracker {
  mark(id: BootTaskId): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): BootSnapshot;
}

const TOTAL_WEIGHT = BOOT_TASKS.reduce((sum, task) => sum + task.weight, 0);

export const snapshotOf = (completedAt: Partial<Record<BootTaskId, number>>): BootSnapshot => {
  const done = BOOT_TASKS.filter((task) => completedAt[task.id] !== undefined);
  return {
    completedAt,
    progress: done.reduce((sum, task) => sum + task.weight, 0) / TOTAL_WEIGHT,
    ready: done.length === BOOT_TASKS.length,
  };
};

export const createBootTracker = (now: () => number = () => performance.now()): BootTracker => {
  const start = now();
  const listeners = new Set<() => void>();
  let snapshot = snapshotOf({});

  return {
    mark(id) {
      if (snapshot.completedAt[id] !== undefined) {
        return;
      }
      snapshot = snapshotOf({ ...snapshot.completedAt, [id]: now() - start });
      globalThis.performance?.mark?.(`gryphon:boot:${id}`);
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
  };
};
