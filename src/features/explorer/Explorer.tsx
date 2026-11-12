"use client";

import { useId, useState } from "react";
import { ThermalLegend } from "@/features/map/ThermalLegend";
import { ThermalMap } from "@/features/map/ThermalMap";
import { SceneList } from "@/features/scenes/SceneList";
import { useScenes } from "@/features/scenes/useScenes";
import type { BBox } from "@/lib/geo/bbox";
import styles from "./Explorer.module.css";

interface ExplorerProps {
  bbox: BBox;
  areaName: string;
}

export const Explorer = ({ bbox, areaName }: ExplorerProps) => {
  const { data: scenes } = useScenes(bbox);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.8);
  const opacityId = useId();

  // Until the user picks one, show the most recent scene.
  const selectedScene = scenes?.find((scene) => scene.id === selectedId) ?? scenes?.[0] ?? null;

  return (
    <div className={styles.layout}>
      <section aria-labelledby="map-title" className={styles.panel}>
        <h2 id="map-title" className={styles.title}>
          Surface temperature · {areaName}
        </h2>
        <ThermalMap bbox={bbox} scene={selectedScene} opacity={opacity} />
        <div className={styles.controls}>
          <ThermalLegend />
          <div className={styles.opacity}>
            <label htmlFor={opacityId}>Thermal layer opacity</label>
            <input
              id={opacityId}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(event) => setOpacity(Number(event.target.value))}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="scenes-title" className={styles.panel}>
        <h2 id="scenes-title" className={styles.title}>
          Latest thermal scenes · {areaName}
        </h2>
        <SceneList bbox={bbox} selectedId={selectedScene?.id ?? null} onSelect={setSelectedId} />
      </section>
    </div>
  );
};
