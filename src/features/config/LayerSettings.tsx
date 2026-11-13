"use client";

/**
 * An existing layer, shown in exactly the form that would create it, filled in and
 * locked. It is information about the document, not an editor: changing a layer
 * means changing the document.
 */
import { useId } from "react";
import type { LayerConfig } from "@/core/config/schema";
import { LayerFieldset } from "./LayerFieldset";
import { extrasOf, toFormValues } from "./layerForm";
import styles from "./AddLayerForm.module.css";

export const LayerSettings = ({ layer }: { layer: LayerConfig }) => {
  const id = useId();
  const extras = extrasOf(layer);
  const hasExtras = Object.keys(extras).length > 0;

  return (
    <fieldset className={`${styles.form} ${styles.locked}`} disabled aria-describedby={`${id}-note`}>
      <legend className={styles.lockedLegend}>{`${layer.title} settings`}</legend>
      <p id={`${id}-note`} className={styles.lockedNote}>
        {`Read-only. This is how the document declares the layer (protocol: ${layer.type}).`}
      </p>
      <LayerFieldset type={layer.type} idPrefix={id} values={toFormValues(layer)} />
      {hasExtras && (
        <div className={styles.extras}>
          <p className={styles.help}>Also declared</p>
          <pre>{JSON.stringify(extras, null, 2)}</pre>
        </div>
      )}
    </fieldset>
  );
};
