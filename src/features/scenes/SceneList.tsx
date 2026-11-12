"use client";

import type { BBox } from "@/lib/geo/bbox";
import type { ThermalScene } from "@/lib/stac/scene";
import { useScenes } from "./useScenes";
import styles from "./SceneList.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

const formatAcquiredAt = (value: string | null): string =>
  value === null ? "Unknown date" : `${dateFormatter.format(new Date(value))} UTC`;

const formatCloudCover = (value: number | null): string =>
  value === null ? "—" : `${value.toFixed(1)}%`;

interface SceneCardProps {
  scene: ThermalScene;
  isSelected: boolean;
  onSelect?: (sceneId: string) => void;
}

const SceneCard = ({ scene, isSelected, onSelect }: SceneCardProps) => (
  <article
    className={isSelected ? `${styles.card} ${styles.selected}` : styles.card}
    aria-labelledby={`scene-${scene.id}`}
  >
    {scene.previewHref && (
      <img
        className={styles.preview}
        src={scene.previewHref}
        alt={`Preview of scene ${scene.id}`}
        loading="lazy"
        width={320}
        height={200}
      />
    )}
    <div className={styles.body}>
      <h3 id={`scene-${scene.id}`} className={styles.title}>
        {formatAcquiredAt(scene.acquiredAt)}
      </h3>
      <dl className={styles.meta}>
        <dt>Platform</dt>
        <dd>{scene.platform ?? "—"}</dd>
        <dt>Cloud cover</dt>
        <dd>{formatCloudCover(scene.cloudCover)}</dd>
      </dl>
      {scene.thermalHref && (
        <a className={styles.link} href={scene.thermalHref} target="_blank" rel="noreferrer">
          Thermal band (LWIR)
        </a>
      )}
      {onSelect && (
        <button
          type="button"
          className={styles.select}
          aria-pressed={isSelected}
          onClick={() => onSelect(scene.id)}
        >
          Show on map
        </button>
      )}
    </div>
  </article>
);

interface SceneListProps {
  bbox: BBox;
  selectedId?: string | null;
  onSelect?: (sceneId: string) => void;
}

export const SceneList = ({ bbox, selectedId = null, onSelect }: SceneListProps) => {
  const { data, isPending, isError, error } = useScenes(bbox);

  if (isPending) {
    return <p role="status">Searching the thermal archive…</p>;
  }

  if (isError) {
    return <p role="alert">{error.message}</p>;
  }

  if (data.length === 0) {
    return <p>No thermal scenes found for this area.</p>;
  }

  return (
    <ul className={styles.list} aria-label="Thermal scenes">
      {data.map((scene) => (
        <li key={scene.id}>
          <SceneCard scene={scene} isSelected={scene.id === selectedId} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
};
