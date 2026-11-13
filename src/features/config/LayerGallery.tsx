"use client";

/**
 * Every way to add a layer, side by side instead of behind a dropdown. Each card
 * names the protocol in plain words and carries a working example: add it as is,
 * or open the form, prefilled, to make it your own. One form is open at a time.
 */
import dynamic from "next/dynamic";
import { useState } from "react";
import type { LayerType } from "@/core/config/schema";
import { LayerIcon } from "@/features/layers/LayerIcon";
import { sourceLinkOf } from "@/features/layers/sourceLink";
import { supportedTypes } from "@/renderers/registry";
import { useConfig } from "./ConfigProvider";
import { buildLayer, EXAMPLE_VALUES } from "./layerForm";
import { PROTOCOL_ORDER, PROTOCOLS } from "./protocols";
import styles from "./LayerGallery.module.css";

// The form (and react-hook-form with it) loads only when someone opens one.
const AddLayerForm = dynamic(() => import("./AddLayerForm").then((module) => module.AddLayerForm), {
  loading: () => <p className={styles.loading}>Opening the form…</p>,
});

const exampleOf = (type: LayerType) => {
  const built = buildLayer(type, EXAMPLE_VALUES[type]);
  return built.ok ? built.value : null;
};

export const LayerGallery = () => {
  const { config, addLayer } = useConfig();
  const [open, setOpen] = useState<LayerType | null>(null);
  const available = new Set(supportedTypes());

  return (
    <div className={styles.gallery}>
      <ul className={styles.cards} aria-label="Ways to add a layer">
        {PROTOCOL_ORDER.filter((type) => available.has(type)).map((type) => {
          const example = exampleOf(type);
          const onMap = example !== null && config.layers.some((layer) => layer.id === example.id);
          const headingId = `protocol-${type}`;

          return (
            <li key={type} className={styles.card} data-open={open === type || undefined}>
              <div className={styles.cardHead}>
                <h3 id={headingId} className={styles.name}>
                  {PROTOCOLS[type].name}
                </h3>
                <span className={styles.type}>{type}</span>
              </div>
              <p className={styles.description}>{PROTOCOLS[type].description}</p>

              {example && (
                <div className={styles.example}>
                  <span className={styles.exampleIcon}>
                    <LayerIcon layer={example} />
                  </span>
                  <span className={styles.exampleText}>
                    <span>{example.title}</span>
                    <span className={styles.exampleSource}>{sourceLinkOf(example).label}</span>
                  </span>
                </div>
              )}

              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={example === null || onMap}
                  aria-describedby={headingId}
                  onClick={() => example && addLayer(example)}
                >
                  {onMap ? "Example on the map" : "Add example"}
                </button>
                <button
                  type="button"
                  aria-expanded={open === type}
                  aria-controls={`${headingId}-form`}
                  aria-describedby={headingId}
                  onClick={() => setOpen((current) => (current === type ? null : type))}
                >
                  {open === type ? "Close" : "Customise"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {open && (
        <section
          id={`protocol-${open}-form`}
          className={styles.formPanel}
          aria-label={`New ${PROTOCOLS[open].name.toLowerCase()} layer`}
        >
          <AddLayerForm key={open} type={open} />
        </section>
      )}
    </div>
  );
};
