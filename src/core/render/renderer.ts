/**
 * The capability contract. One implementation per layer `type`.
 *
 * A renderer translates one config variant into layer specs. That is the whole job:
 * it does not know about React, the map instance, or any other renderer. Adding a
 * dataset needs none of these — only a new protocol does.
 */
import type { BBox } from "@/core/geo/bbox";
import type { Auth, LayerConfig, Legend } from "@/core/config/schema";
import type { Result } from "@/core/result";
import type { LayerSpec } from "./layerSpec";

export type RenderErrorKind =
  | "config" // the document asks for something impossible
  | "network" // the request never completed
  | "cors" // reached, but the browser was refused the response
  | "http" // the server answered with a failure status
  | "parse" // the payload was not what the format promises
  | "auth"; // a credential is required or was rejected

export interface RenderError {
  readonly kind: RenderErrorKind;
  readonly message: string;
  readonly status?: number;
}

export const renderError = (kind: RenderErrorKind, message: string, status?: number): RenderError => ({
  kind,
  message,
  ...(status === undefined ? {} : { status }),
});

/**
 * Everything a renderer is allowed to reach the outside world with. Injected rather
 * than imported, so renderers are deterministic and testable without a network.
 */
export interface RenderContext {
  readonly fetch: typeof fetch;
  readonly now: () => Date;
  readonly signal?: AbortSignal;
  /** Resolves a credential slot declared by `auth`. Returns undefined when unset. */
  readonly secret: (slot: Auth) => string | undefined;
  /** The area currently in view, for sources that search rather than serve everything. */
  readonly bbox?: BBox;
  /**
   * GeoJSON already resolved for an earlier layer, so two layers over the same points
   * cost one request. Undefined when that layer has not been resolved (or is not GeoJSON).
   */
  readonly shared: (layerId: string) => unknown | undefined;
}

export interface LayerRenderer<C extends LayerConfig = LayerConfig> {
  readonly type: C["type"];
  resolve(config: C, context: RenderContext): Promise<Result<LayerSpec[], RenderError>>;
  /**
   * A legend derived from the config, used when the document does not supply one.
   * Optional: a renderer with nothing to explain simply omits it.
   */
  legend?(config: C): Legend | null;
}
