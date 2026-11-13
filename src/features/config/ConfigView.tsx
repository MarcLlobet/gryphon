"use client";

/**
 * The configuration page: everything that edits the document rather than reads it.
 *
 * Kept off the map on purpose — the map answers "what am I looking at", this answers
 * "what should be on it". Changes take effect immediately on the map behind it.
 */
import { useConfig } from "./ConfigProvider";
import { LayerGallery } from "./LayerGallery";
import { LayerStack } from "@/features/layers/LayerStack";
import { useLayers } from "@/features/layers/useLayers";
import styles from "./ConfigView.module.css";

export const ConfigView = () => {
  const { config, overrides, reset } = useConfig();
  const layers = useLayers();

  const edited =
    overrides.layers.length > 0 ||
    overrides.removed.length > 0 ||
    overrides.order.length > 0 ||
    Object.keys(overrides.settings).length > 0;

  return (
    <div className={styles.view}>
      <section aria-labelledby="layers-title" className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 id="layers-title" className={styles.title}>
            Your layers
          </h2>
          <button type="button" className={styles.reset} onClick={reset} disabled={!edited}>
            Reset to the shipped document
          </button>
        </div>
        <p className={styles.note}>
          {`${config.layers.length} layer${config.layers.length === 1 ? "" : "s"}, topmost first, as on the map. Drag the handle (or use the arrow keys) to reorder, and open a layer to see how it is declared.`}
        </p>
        {layers.length === 0 ? (
          <p className={styles.note}>This document declares no layers.</p>
        ) : (
          <div className={styles.layers}>
            <LayerStack layers={layers} mode="edit" />
          </div>
        )}
      </section>

      <section aria-labelledby="add-title" className={styles.section}>
        <h2 id="add-title" className={styles.title}>
          Add a layer
        </h2>
        <p className={styles.note}>
          Every kind of layer this build can paint, each with a working example. Add the example as is, or customise it
          first. A layer added here renders exactly as if the document had declared it; it lasts for this session, and
          credentials stay in memory.
        </p>
        <LayerGallery />
      </section>
    </div>
  );
};
