/**
 * Turns one configured layer into painted layers.
 *
 * Every layer keeps its own outcome, because with N sources partial failure is the
 * normal case: one unreachable URL must degrade its own row in the layer panel,
 * never blank the map.
 */
import type { LayerConfig } from "@/core/config/schema";
import type { LayerSpec } from "@/core/render/layerSpec";
import { renderError, type RenderContext, type RenderError } from "@/core/render/renderer";
import { loadRenderer, type AnyLayerRenderer } from "./registry";

export interface ResolvedLayer {
  readonly config: LayerConfig;
  readonly specs: readonly LayerSpec[];
  readonly error: RenderError | null;
}

/** Everything a renderer needs except the per-layer `shared` lookup the caller supplies. */
export type ResolveContext = Omit<RenderContext, "shared">;

/** Sync or async, so tests can hand in a renderer directly. */
type Lookup = (type: LayerConfig["type"]) => AnyLayerRenderer | undefined | Promise<AnyLayerRenderer | undefined>;

/**
 * Resolves one layer. Callers run these concurrently — React Query does, keyed per
 * layer — so a slow source delays only its own row, and an unchanged layer is not
 * re-fetched when a different one changes.
 */
export const resolveLayer = async (
  config: LayerConfig,
  context: RenderContext,
  lookup: Lookup = loadRenderer,
): Promise<ResolvedLayer> => {
  const renderer = await lookup(config.type);

  if (renderer === undefined) {
    return {
      config,
      specs: [],
      error: renderError("config", `This build cannot paint "${config.type}" layers.`),
    };
  }

  try {
    const result = await renderer.resolve(config, context);
    return result.ok ? { config, specs: result.value, error: null } : { config, specs: [], error: result.error };
  } catch (cause) {
    // A renderer that throws is a bug, but it must still not take the map down.
    const message = cause instanceof Error ? cause.message : "The renderer failed unexpectedly.";
    return { config, specs: [], error: renderError("parse", message) };
  }
};
