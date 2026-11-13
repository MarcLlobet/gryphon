/**
 * The shipped default is bedrock; everything the user does in the app is an override
 * layered over it. Keeping the two apart means "reset" is one discard, and the default
 * stays a clean reference document.
 */
import { z } from "zod";
import { err, ok, type Result } from "@/core/result";
import { toIssues, type ConfigIssue } from "./parse";
import { ConfigSchema, LayerSchema, ViewSchema, type GryphonConfig, type LayerConfig } from "./schema";

export const OverridesSchema = z.object({
  basemap: z.url().optional(),
  view: ViewSchema.optional(),
  /** Whole layers. An id matching the base replaces it; a new id is appended. */
  layers: z.array(LayerSchema).default([]),
  /** Per-layer UI state — the common case, without cloning a whole layer. */
  settings: z
    .record(z.string(), z.object({ visible: z.boolean().optional(), opacity: z.number().min(0).max(1).optional() }))
    .default({}),
  /** Base layer ids to suppress. */
  removed: z.array(z.string()).default([]),
  /** Explicit paint order, bottom first. Unlisted layers keep their order, after these. */
  order: z.array(z.string()).default([]),
});

export type Overrides = z.infer<typeof OverridesSchema>;
export type OverridesInput = z.input<typeof OverridesSchema>;

export const emptyOverrides: Overrides = OverridesSchema.parse({});

/** Sorts by `order` first, leaving unlisted layers in their original relative order. */
const applyOrder = (layers: LayerConfig[], order: string[]): LayerConfig[] => {
  if (order.length === 0) {
    return layers;
  }

  const rank = (layer: LayerConfig): number => {
    const index = order.indexOf(layer.id);
    return index === -1 ? order.length : index;
  };

  return layers
    .map((layer, index) => ({ layer, index }))
    .sort((a, b) => rank(a.layer) - rank(b.layer) || a.index - b.index)
    .map(({ layer }) => layer);
};

/**
 * Produces the document the renderers actually see. Both inputs are validated, so a
 * corrupt override cannot smuggle an invalid layer past the schema.
 */
export const mergeConfig = (
  base: unknown,
  overrides: unknown = emptyOverrides,
): Result<GryphonConfig, ConfigIssue[]> => {
  const parsedBase = ConfigSchema.safeParse(base);
  if (!parsedBase.success) {
    return err(toIssues(parsedBase.error));
  }

  const parsedOverrides = OverridesSchema.safeParse(overrides);
  if (!parsedOverrides.success) {
    return err(toIssues(parsedOverrides.error));
  }

  const { basemap, view, layers: extra, settings, removed, order } = parsedOverrides.data;
  const replacements = new Map(extra.map((layer) => [layer.id, layer]));

  const kept = parsedBase.data.layers
    .filter((layer) => !removed.includes(layer.id))
    .map((layer) => replacements.get(layer.id) ?? layer);

  const appended = extra.filter((layer) => !kept.some((existing) => existing.id === layer.id));

  const layers = applyOrder([...kept, ...appended], order).map((layer) => {
    const setting = settings[layer.id];
    return setting === undefined ? layer : { ...layer, ...setting };
  });

  return ok({
    ...parsedBase.data,
    ...(basemap === undefined ? {} : { basemap }),
    ...(view === undefined ? {} : { view }),
    layers,
  });
};
