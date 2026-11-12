"use client";

import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import type { BBox } from "@/lib/geo/bbox";
import type { ThermalScene } from "@/lib/stac/scene";
import { BASEMAP_STYLE_URL, setThermalOpacity, syncThermalLayer, toLngLatBounds } from "./thermalLayer";
import styles from "./ThermalMap.module.css";

interface ThermalMapProps {
  bbox: BBox;
  scene: ThermalScene | null;
  opacity: number;
}

export const ThermalMap = ({ bbox, scene, opacity }: ThermalMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Create the map once. MapLibre needs `window`, so it is loaded lazily on the client.
  useEffect(() => {
    let cancelled = false;

    void import("maplibre-gl").then(({ Map, NavigationControl }) => {
      const container = containerRef.current;
      if (cancelled || container === null) {
        return;
      }

      const map = new Map({
        container,
        style: BASEMAP_STYLE_URL,
        bounds: toLngLatBounds(bbox),
        fitBoundsOptions: { padding: 24 },
        attributionControl: { compact: true },
      });
      map.addControl(new NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => setIsLoaded(true));
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
    // The initial bbox only frames the first view; later changes are handled below.
  }, []);

  useEffect(() => {
    if (isLoaded) {
      mapRef.current?.fitBounds(toLngLatBounds(bbox), { padding: 24 });
    }
  }, [bbox, isLoaded]);

  useEffect(() => {
    if (isLoaded && mapRef.current) {
      syncThermalLayer(mapRef.current, scene, opacity);
    }
    // Opacity changes are applied without reloading tiles, in the next effect.
  }, [scene, isLoaded]);

  useEffect(() => {
    if (isLoaded && mapRef.current) {
      setThermalOpacity(mapRef.current, opacity);
    }
  }, [opacity, isLoaded]);

  return (
    <div className={styles.frame}>
      <div ref={containerRef} className={styles.map} role="region" aria-label="Thermal map" />
      {!isLoaded && (
        <p className={styles.loading} role="status">
          Loading map…
        </p>
      )}
    </div>
  );
};
