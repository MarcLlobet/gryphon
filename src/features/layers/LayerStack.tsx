"use client";

/**
 * The layer stack: one row per layer, topmost first, draggable to reorder.
 *
 * Three decisions worth naming:
 *
 * - Dragging is never the only way to reorder. WCAG 2.2 (2.5.7 Dragging Movements)
 *   requires a single-pointer alternative, and a drag is unusable by keyboard anyway,
 *   so the grip is a real button that also moves its row with the arrow keys. Every
 *   move is announced in a live region, by drag and by key alike.
 * - Pointer Events rather than HTML5 drag-and-drop, which does not fire on touch and
 *   cannot be styled. One code path covers mouse, pen and finger.
 * - Grabbing and toggling are separate targets. A row that both drags and toggles has
 *   to guess intent from movement; a dedicated grip never has to.
 */
import { Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useConfig } from "@/features/config/ConfigProvider";
import dynamic from "next/dynamic";
import { LayerIcon } from "./LayerIcon";
import { usePrefetchIcons } from "./icons";
import { describeMove, moveInList, targetIndex, toDocumentOrder, toVisualOrder } from "./reorder";
import { sourceLinkOf } from "./sourceLink";
import type { LayerView } from "./useLayers";
import styles from "./LayerStack.module.css";

type RowState = "off" | "loading" | "error" | "on";

const stateOf = (layer: LayerView): RowState => {
  if (!layer.config.visible) return "off";
  if (layer.isPending) return "loading";
  return layer.error ? "error" : "on";
};

const SPOKEN: Record<RowState, string> = {
  off: "hidden",
  loading: "loading",
  error: "failed to load",
  on: "shown",
};

interface DragState {
  readonly id: string;
  readonly from: number;
  readonly over: number;
}

// Both appear only on demand (a legend opened, a source asking for a key), so neither
// is part of the first load.
const Legend = dynamic(() => import("./Legend").then((module) => module.Legend));
const CredentialPrompt = dynamic(() => import("./CredentialPrompt").then((module) => module.CredentialPrompt));
// Configuration page only, so the form definitions never reach the map's bundle.
const LayerSettings = dynamic(() => import("@/features/config/LayerSettings").then((module) => module.LayerSettings));

/** Where the layer's data comes from, opened in a new tab when it is a real page. */
const SourceLine = ({ layer }: { layer: LayerView["config"] }) => {
  const { href, label } = sourceLinkOf(layer);
  return href === null ? (
    <span className={styles.source}>{label}</span>
  ) : (
    <a className={styles.source} href={href} target="_blank" rel="noreferrer" title={label}>
      {label}
    </a>
  );
};

interface LayerStackProps {
  layers: readonly LayerView[];
  /**
   * `map`: each row toggles its layer and can show its legend.
   * `edit`: the configuration page — reorder and remove, nothing else. Visibility and
   * legends are about looking at the map, so they stay on the map.
   */
  mode?: "map" | "edit";
}

export const LayerStack = ({ layers, mode = "map" }: LayerStackProps) => {
  const { setLayerSettings, setOrder, removeLayer } = useConfig();
  const editing = mode === "edit";
  usePrefetchIcons(layers.map((layer) => layer.config.icon));
  const [drag, setDrag] = useState<DragState | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [openLegends, setOpenLegends] = useState<readonly string[]>([]);

  const rows = useRef(new Map<string, HTMLLIElement>());
  const midpoints = useRef<number[]>([]);

  // Top of the list is the layer drawn on top, which is the end of the document.
  const visual = toVisualOrder(layers);

  if (visual.length === 0) {
    return null;
  }

  const commit = (from: number, to: number) => {
    const target = Math.max(0, Math.min(visual.length - 1, to));
    if (target === from) {
      return;
    }

    const reordered = moveInList(visual, from, target);
    setOrder(toDocumentOrder(reordered).map((layer) => layer.config.id));
    setAnnouncement(
      describeMove(visual[from]?.config.title ?? "Layer", target, visual.length, reordered[target + 1]?.config.title),
    );
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>, id: string, index: number) => {
    // The map is underneath and would otherwise pan along with the drag.
    event.preventDefault();
    event.stopPropagation();
    // Keeps events coming to the grip once the pointer leaves it. Optional because
    // it is an enhancement — the drag still tracks correctly without capture.
    event.currentTarget.setPointerCapture?.(event.pointerId);

    // Measured once per drag, so moving the pointer never forces a reflow.
    midpoints.current = visual.map((layer) => {
      const element = rows.current.get(layer.config.id);
      if (element === undefined) return Number.POSITIVE_INFINITY;
      const box = element.getBoundingClientRect();
      return box.top + box.height / 2;
    });

    setDrag({ id, from: index, over: index });
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (drag === null) return;
    const over = targetIndex(midpoints.current, drag.from, event.clientY);
    if (over !== drag.over) {
      setDrag({ ...drag, over });
    }
  };

  const endDrag = () => {
    if (drag === null) return;
    commit(drag.from, drag.over);
    setDrag(null);
  };

  const toggleLegend = (id: string) =>
    setOpenLegends((current) => (current.includes(id) ? current.filter((open) => open !== id) : [...current, id]));

  return (
    <div className={styles.stack} data-mode={mode} onPointerDown={(event) => event.stopPropagation()}>
      <ul className={styles.list} aria-label={editing ? "Document layers, topmost first" : "Map layers, topmost first"}>
        {visual.map((layer, index) => {
          const { config } = layer;
          const state = stateOf(layer);
          const isDragging = drag?.id === config.id;
          const isDropTarget = drag !== null && !isDragging && drag.over === index;

          return (
            <li
              key={config.id}
              ref={(element) => {
                if (element === null) rows.current.delete(config.id);
                else rows.current.set(config.id, element);
              }}
              className={styles.row}
              data-active={(!editing && config.visible) || undefined}
              data-dragging={isDragging || undefined}
              data-drop={isDropTarget ? (drag.over < drag.from ? "above" : "below") : undefined}
            >
              {/* The position number and the drag handle share one slot: the number
                  reads the stack at a glance, the handle appears when you reach for
                  it. Both stay in the DOM, so the grip is always keyboard-reachable. */}
              <span className={styles.handle}>
                <span className={styles.index} aria-hidden="true">
                  {index + 1}
                </span>

                <button
                  type="button"
                  className={styles.grip}
                  title="Drag to reorder, or use the arrow keys"
                  aria-label={`Reorder ${config.title}, ${index + 1} of ${visual.length}. Use the arrow keys to move it.`}
                  onPointerDown={(event) => startDrag(event, config.id, index)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={() => setDrag(null)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                      event.preventDefault();
                      commit(index, index + (event.key === "ArrowUp" ? -1 : 1));
                    }
                  }}
                >
                  <svg viewBox="0 0 10 18" width="10" height="18" aria-hidden="true" focusable="false">
                    <g fill="currentColor">
                      {[3, 7.5, 12, 16.5].map((y) =>
                        [2.5, 7.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.35" />),
                      )}
                    </g>
                  </svg>
                </button>
              </span>

              {editing ? (
                <span className={styles.static}>
                  <span className={styles.icon}>
                    <LayerIcon layer={config} />
                  </span>
                  <span className={styles.details}>
                    <span className={styles.title}>{config.title}</span>
                    <SourceLine layer={config} />
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  className={styles.toggle}
                  aria-pressed={config.visible}
                  onClick={() => setLayerSettings(config.id, { visible: !config.visible })}
                >
                  <span className={styles.icon} data-state={state}>
                    <LayerIcon layer={config} />
                  </span>
                  <span className={styles.title}>{config.title}</span>
                  <span className={styles.marker} data-state={state} aria-hidden="true">
                    {state === "error" ? "!" : ""}
                  </span>
                  <span className={styles.srOnly}>{`, ${SPOKEN[state]}`}</span>
                </button>
              )}

              {editing && (
                <button
                  type="button"
                  className={styles.legendToggle}
                  aria-expanded={openLegends.includes(config.id)}
                  aria-controls={`${config.id}-settings`}
                  aria-label={`Settings of ${config.title}`}
                  title="Show settings"
                  onClick={() => toggleLegend(config.id)}
                >
                  <svg
                    className={styles.chevron}
                    data-open={openLegends.includes(config.id) || undefined}
                    viewBox="0 0 12 12"
                    width="11"
                    height="11"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M3 4.5 6 8l3-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {editing && (
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Remove ${config.title}`}
                  title="Remove layer"
                  onClick={() => removeLayer(config.id)}
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}

              {editing && openLegends.includes(config.id) && (
                <div id={`${config.id}-settings`} className={styles.extra}>
                  <LayerSettings layer={config} />
                </div>
              )}

              {editing && config.auth && layer.error?.kind === "auth" && (
                <div className={styles.extra}>
                  <CredentialPrompt slotName={config.auth.name} />
                </div>
              )}

              {!editing && config.legend && (
                <button
                  type="button"
                  className={styles.legendToggle}
                  aria-expanded={openLegends.includes(config.id)}
                  aria-controls={`${config.id}-legend`}
                  aria-label={`Legend for ${config.title}`}
                  onClick={() => toggleLegend(config.id)}
                >
                  <svg
                    className={styles.chevron}
                    data-open={openLegends.includes(config.id) || undefined}
                    viewBox="0 0 12 12"
                    width="11"
                    height="11"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M3 4.5 6 8l3-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {!editing && config.legend && openLegends.includes(config.id) && (
                <div id={`${config.id}-legend`} className={styles.legend}>
                  <Legend legend={config.legend} title={`${config.title} scale`} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <p className={styles.srOnly} role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
};
