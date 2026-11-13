import { DEFAULT_BBOX } from "@/core/geo/bbox";
import type { RenderContext } from "@/core/render/renderer";

/**
 * A renderer's whole view of the outside world, under test. Nothing is global, so
 * time and credentials are deterministic and the network is whatever the test says.
 */
export const testContext = (overrides: Partial<RenderContext> = {}): RenderContext => ({
  fetch: (...args) => globalThis.fetch(...args),
  now: () => new Date("2026-01-01T00:00:00Z"),
  secret: () => "test-secret",
  bbox: DEFAULT_BBOX,
  shared: () => undefined,
  ...overrides,
});
