"use client";

/**
 * The row beneath the header: a permanent layer panel, and the map filling the rest.
 *
 * The panel sits in the layout rather than floating over the map, so it can run the
 * full height of the row and can never cover what it controls.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SidePanel } from "@/components/SidePanel";
import { useBootMark } from "@/features/boot/BootProvider";
import { useConfig } from "@/features/config/ConfigProvider";
import { LayerStack } from "@/features/layers/LayerStack";
import { useLayers } from "@/features/layers/useLayers";
import { LAYER_PANEL_ID, usePanel } from "@/features/layout/panel";
import { MapCanvas, type MapLifecycle } from "@/features/map/MapCanvas";
import type { PresentedLayer } from "@/features/map/applyLayers";
import styles from "./MapView.module.css";

export const MapView = () => {
  const { config, issues } = useConfig();
  const layers = useLayers();
  const { open } = usePanel();

  // Hidden layers marked `preload` stay on the map at opacity 0 with their tiles
  // loaded, so turning one on only changes paint. Other hidden layers have no specs.
  const presented = useMemo<PresentedLayer[]>(
    () =>
      layers.flatMap((layer) =>
        layer.specs.map((spec) => ({ spec, opacity: layer.config.visible ? layer.config.opacity : 0 })),
      ),
    [layers],
  );

  const mark = useBootMark();
  const settled = layers.every((layer) => !layer.isPending);
  const settledRef = useRef(settled);
  useEffect(() => {
    settledRef.current = settled;
  });
  const sawIdle = useRef(false);

  useEffect(() => {
    if (settled) {
      mark("layers");
      if (sawIdle.current) {
        mark("idle");
      }
    }
  }, [settled, mark]);

  const onLifecycle = useCallback(
    (event: MapLifecycle) => {
      if (event === "runtime") mark("runtime");
      if (event === "loaded") mark("basemap");
      if (event === "idle") {
        sawIdle.current = true;
        // Only counts once every layer's data is in and painted.
        if (settledRef.current) mark("idle");
      }
    },
    [mark],
  );

  return (
    <div className={styles.row}>
      <SidePanel id={LAYER_PANEL_ID} title="Layers" showTitle={false} open={open}>
        <LayerStack layers={layers} />
      </SidePanel>

      <div className={styles.stage} data-panel-open={open || undefined}>
        {issues.length > 0 && (
          <p role="alert" className={styles.issues}>
            {`This document could not be used (${issues[0]?.path || "document"}: ${issues[0]?.message}). Showing the default instead.`}
          </p>
        )}

        <ErrorBoundary
          fallback={({ reset }) => (
            <div role="alert" className={styles.mapFailed}>
              <p>The map could not start. This usually means WebGL is unavailable or was reset.</p>
              <button type="button" onClick={reset}>
                Try again
              </button>
            </div>
          )}
        >
          <MapCanvas basemap={config.basemap} bbox={config.view?.bbox} layers={presented} onLifecycle={onLifecycle} />
        </ErrorBoundary>
      </div>
    </div>
  );
};
