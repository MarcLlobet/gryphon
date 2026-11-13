"use client";

/**
 * Resolves the document's layers, one query each.
 *
 * Per-layer queries are the point: a slow source delays only its own row, a failing
 * one degrades only itself, and changing one layer does not re-fetch the others.
 * Presentation (opacity, visibility) is deliberately kept out of the query key, so
 * dragging the opacity slider repaints without touching the network.
 */
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";
import type { BBox } from "@/core/geo/bbox";
import type { LayerConfig } from "@/core/config/schema";
import type { LayerSpec } from "@/core/render/layerSpec";
import type { RenderContext, RenderError } from "@/core/render/renderer";
import { resolveLayer, type ResolvedLayer } from "@/renderers/resolve";
import { useConfig } from "@/features/config/ConfigProvider";

export interface LayerView {
  readonly config: LayerConfig;
  readonly specs: readonly LayerSpec[];
  readonly error: RenderError | null;
  readonly isPending: boolean;
}

/**
 * Identity for caching: everything that changes the *data*, nothing that only changes
 * paint. A layer needing a credential also keys on `secretsVersion`, so supplying a
 * key re-resolves it — the secret itself never enters the key.
 */
export const resolutionKey = (layer: LayerConfig, bbox: BBox | undefined, secretsVersion = 0) => {
  const { opacity: _opacity, visible: _visible, legend: _legend, preload: _preload, icon: _icon, ...data } = layer;
  return ["layer", layer.id, data, bbox, layer.auth ? secretsVersion : "open"] as const;
};

const borrows = (layer: LayerConfig): layer is Extract<LayerConfig, { type: "geojson" }> =>
  layer.type === "geojson" && layer.sourceOf !== undefined;

const geoJsonBySpecId = (resolved: (ResolvedLayer | undefined)[]): Map<string, unknown> => {
  const shared = new Map<string, unknown>();
  for (const layer of resolved) {
    for (const spec of layer?.specs ?? []) {
      if (spec.source.kind === "geojson") {
        shared.set(spec.id, spec.source.data);
      }
    }
  }
  return shared;
};

interface Resolution {
  readonly data: readonly (ResolvedLayer | undefined)[];
  readonly pending: readonly boolean[];
  /** Changes whenever any result is re-fetched, so borrowers can follow it. */
  readonly version: string;
}

/**
 * Module-level, so its identity is stable: React Query then re-runs it only when a
 * query result actually changes, and the object it returns keeps its identity in
 * between. That is what lets the memos below do their job.
 */
const combine = (results: UseQueryResult<ResolvedLayer>[]): Resolution => ({
  data: results.map((result) => result.data),
  pending: results.map((result) => result.isPending),
  version: results.map((result) => result.dataUpdatedAt).join("-"),
});

const viewOf = (layer: LayerConfig, resolution: Resolution, index: number): LayerView => {
  const data = resolution.data[index];
  return {
    config: layer,
    specs: data?.specs ?? [],
    error: data?.error ?? null,
    isPending: resolution.pending[index] ?? true,
  };
};

export const useLayers = (): LayerView[] => {
  const { config, secretFor, secretsVersion } = useConfig();
  const bbox = config.view?.bbox;

  // Visible layers load, and so do hidden ones marked `preload`: those sit on the map
  // at opacity 0 with their data in, so switching them on is a repaint. Other hidden
  // layers cost nothing until they are switched on.
  const resolvable = useMemo(() => config.layers.filter((layer) => layer.visible || layer.preload), [config.layers]);
  const independent = useMemo(() => resolvable.filter((layer) => !borrows(layer)), [resolvable]);
  const dependent = useMemo(() => resolvable.filter(borrows), [resolvable]);

  const context = useMemo<Omit<RenderContext, "shared" | "signal">>(
    () => ({
      fetch: (...args) => globalThis.fetch(...args),
      now: () => new Date(),
      secret: secretFor,
      ...(bbox === undefined ? {} : { bbox }),
    }),
    [secretFor, bbox],
  );

  // React Query's signal aborts a request whose result is no longer wanted (the view
  // moved, the layer changed), so a slow, stale answer can never land late.
  const first = useQueries({
    queries: independent.map((layer) => ({
      queryKey: resolutionKey(layer, bbox, secretsVersion),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        resolveLayer(layer, { ...context, signal, shared: () => undefined }),
    })),
    combine,
  });

  const shared = useMemo(() => geoJsonBySpecId([...first.data]), [first.data]);

  const second = useQueries({
    queries: dependent.map((layer) => ({
      queryKey: [...resolutionKey(layer, bbox, secretsVersion), "borrowed", first.version] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        resolveLayer(layer, { ...context, signal, shared: (id: string) => shared.get(id) }),
      enabled: shared.has(layer.sourceOf ?? ""),
    })),
    combine,
  });

  return useMemo(() => {
    const views = new Map<string, LayerView>();
    independent.forEach((layer, index) => views.set(layer.id, viewOf(layer, first, index)));
    dependent.forEach((layer, index) => views.set(layer.id, viewOf(layer, second, index)));

    // Document order is paint order, and hidden layers still get a row in the panel.
    return config.layers.map(
      (layer) => views.get(layer.id) ?? { config: layer, specs: [], error: null, isPending: false },
    );
  }, [config.layers, independent, dependent, first, second]);
};
