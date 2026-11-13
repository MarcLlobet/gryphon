"use client";

/**
 * The map itself: a MapLibre instance and nothing else.
 *
 * It knows about layer specs and a basemap URL. It has never heard of STAC, FIRMS or
 * any other provider — that is the whole point of the `LayerSpec` vocabulary.
 */
import type { Map as MapLibreMap } from "maplibre-gl";
// Here rather than in the root layout, so pages without a map never load it.
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type { BBox } from "@/core/geo/bbox";
import { applyLayers, type PresentedLayer, type ReconcilableMap } from "./applyLayers";
import styles from "./MapCanvas.module.css";

/**
 * MapLibre opens the compact attribution on load. Credits stay one tap away behind
 * the (i) button, but closed, so they do not cover the map on arrival.
 */
export const collapseAttribution = (container: HTMLElement): void => {
  const attribution = container.querySelector(".maplibregl-ctrl-attrib");
  attribution?.classList.remove("maplibregl-compact-show");
  attribution?.removeAttribute("open");
};

export const toLngLatBounds = ([west, south, east, north]: BBox): [[number, number], [number, number]] => [
  [west, south],
  [east, north],
];

/** Moments the boot sequence waits for. */
export type MapLifecycle = "runtime" | "loaded" | "idle";

interface MapCanvasProps {
  basemap: string;
  bbox: BBox | undefined;
  layers: readonly PresentedLayer[];
  onLifecycle?: (event: MapLifecycle) => void;
}

export const MapCanvas = ({ basemap, bbox, layers, onLifecycle }: MapCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Read through a ref so a new callback never recreates the map.
  const lifecycleRef = useRef(onLifecycle);
  useEffect(() => {
    lifecycleRef.current = onLifecycle;
  });
  const mapRef = useRef<MapLibreMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // MapLibre throws asynchronously (inside the dynamic import), which no boundary sees.
  // Re-throwing it during render hands it to the nearest one.
  const [failure, setFailure] = useState<Error | null>(null);
  if (failure !== null) {
    throw failure;
  }
  const layersRef = useRef(layers);
  useEffect(() => {
    layersRef.current = layers;
  });
  const basemapRef = useRef(basemap);

  // MapLibre needs `window`, so it is loaded lazily on the client.
  useEffect(() => {
    let cancelled = false;

    void import("maplibre-gl")
      .then(({ Map, NavigationControl }) => {
        const container = containerRef.current;
        if (cancelled || container === null) {
          return;
        }
        lifecycleRef.current?.("runtime");

        const map = new Map({
          container,
          style: basemap,
          ...(bbox === undefined ? { center: [0, 20], zoom: 1.5 } : { bounds: toLngLatBounds(bbox) }),
          fitBoundsOptions: { padding: 24 },
          attributionControl: { compact: true },
        });
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          collapseAttribution(container);
          setIsLoaded(true);
          lifecycleRef.current?.("loaded");
        });
        // Fires whenever every requested tile has arrived and the map has settled.
        map.on("idle", () => lifecycleRef.current?.("idle"));
        mapRef.current = map;
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFailure(error instanceof Error ? error : new Error("The map could not start."));
        }
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
    // The initial framing is only read when the map is created; a basemap change is
    // handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swapping the style drops every source and layer, Gryphon's included, so they are
  // put back once the new style has loaded.
  useEffect(() => {
    const map = mapRef.current;
    if (!isLoaded || map === null || basemap === basemapRef.current) {
      return;
    }
    basemapRef.current = basemap;
    map.once("style.load", () => applyLayers(map as unknown as ReconcilableMap, layersRef.current));
    map.setStyle(basemap);
  }, [basemap, isLoaded]);

  useEffect(() => {
    if (isLoaded && mapRef.current && bbox) {
      mapRef.current.fitBounds(toLngLatBounds(bbox), { padding: 24 });
    }
  }, [bbox, isLoaded]);

  useEffect(() => {
    if (isLoaded && mapRef.current) {
      applyLayers(mapRef.current as unknown as ReconcilableMap, layers);
    }
  }, [layers, isLoaded]);

  return (
    <div className={styles.frame}>
      <div ref={containerRef} className={styles.map} role="region" aria-label="Map" />
      {!isLoaded && (
        <p className={styles.loading} role="status">
          Loading map…
        </p>
      )}
    </div>
  );
};
