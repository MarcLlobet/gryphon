"use client";

/**
 * Holds the document the app renders: the shipped default as bedrock, plus whatever
 * the user has changed on top of it.
 *
 * Both halves stay separate so "reset" is a discard rather than a repair, and the
 * default stays a clean reference document. The override layer lives in memory for
 * the session — adding a layer renders it immediately and it is gone on refresh —
 * and `ConfigStore` is the seam where localStorage or a backend would slot in
 * without any caller changing.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultConfig } from "@/core/config/default";
import { emptyOverrides, mergeConfig, type Overrides } from "@/core/config/merge";
import type { ConfigIssue } from "@/core/config/parse";
import { ConfigSchema, type Auth, type GryphonConfig, type LayerConfig } from "@/core/config/schema";

export interface ConfigContextValue {
  /** The merged document, already validated. */
  readonly config: GryphonConfig;
  /** Why the merge fell back to the default, when it did. Empty in the happy path. */
  readonly issues: readonly ConfigIssue[];
  readonly overrides: Overrides;
  readonly addLayer: (layer: LayerConfig) => void;
  readonly removeLayer: (layerId: string) => void;
  readonly setLayerSettings: (layerId: string, settings: { visible?: boolean; opacity?: number }) => void;
  readonly setOrder: (layerIds: readonly string[]) => void;
  readonly reset: () => void;
  /** Credentials for this session only — never merged into the document. */
  readonly secretFor: (slot: Auth) => string | undefined;
  readonly setSecret: (slotName: string, value: string) => void;
  readonly missingSecrets: readonly string[];
  /**
   * Bumped whenever a credential changes. Layers that need one include it in their
   * cache key, so a newly supplied key re-resolves the layer — without the secret
   * itself ever becoming part of a cache key.
   */
  readonly secretsVersion: number;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

/** The default document is validated by its own test, so this fallback never fires in practice. */
const parsedDefault = (): GryphonConfig => ConfigSchema.parse(defaultConfig);

export const ConfigProvider = ({ base = defaultConfig, children }: { base?: unknown; children: ReactNode }) => {
  const [overrides, setOverrides] = useState<Overrides>(emptyOverrides);
  const [secrets, setSecrets] = useState<Readonly<Record<string, string>>>({});
  const [secretsVersion, setSecretsVersion] = useState(0);

  const merged = useMemo(() => mergeConfig(base, overrides), [base, overrides]);

  const patch = useCallback(
    (change: (current: Overrides) => Overrides) => setOverrides((current) => change(current)),
    [],
  );

  const value = useMemo<ConfigContextValue>(() => {
    const config = merged.ok ? merged.value : parsedDefault();
    const slots = config.layers.flatMap((layer) => (layer.auth ? [layer.auth.name] : []));

    return {
      config,
      issues: merged.ok ? [] : merged.error,
      overrides,

      addLayer: (layer) =>
        patch((current) => ({
          ...current,
          layers: [...current.layers.filter((existing) => existing.id !== layer.id), layer],
          removed: current.removed.filter((id) => id !== layer.id),
        })),

      removeLayer: (layerId) =>
        patch((current) => ({
          ...current,
          layers: current.layers.filter((layer) => layer.id !== layerId),
          removed: current.removed.includes(layerId) ? current.removed : [...current.removed, layerId],
        })),

      setLayerSettings: (layerId, settings) =>
        patch((current) => ({
          ...current,
          settings: { ...current.settings, [layerId]: { ...current.settings[layerId], ...settings } },
        })),

      setOrder: (layerIds) => patch((current) => ({ ...current, order: [...layerIds] })),

      reset: () => {
        setOverrides(emptyOverrides);
        setSecrets({});
        setSecretsVersion((version) => version + 1);
      },

      secretFor: (slot) => secrets[slot.name],
      setSecret: (slotName, secret) => {
        setSecrets((current) => ({ ...current, [slotName]: secret }));
        setSecretsVersion((version) => version + 1);
      },
      missingSecrets: [...new Set(slots)].filter((name) => secrets[name] === undefined),
      secretsVersion,
    };
  }, [merged, overrides, patch, secrets, secretsVersion]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useConfig = (): ConfigContextValue => {
  const value = useContext(ConfigContext);
  if (value === null) {
    throw new Error("useConfig must be used inside a ConfigProvider.");
  }
  return value;
};
