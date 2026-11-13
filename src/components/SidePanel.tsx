"use client";

/**
 * The full-height panel beside the map.
 *
 * Showing and hiding is the header's job, not the panel's — one control, in one
 * place. The panel stays in the DOM when hidden so the header's `aria-controls`
 * always resolves to something.
 *
 * The resize grip is a focusable `separator` — the ARIA window-splitter pattern — so
 * the arrow keys resize it as well as dragging. Dragging is never the only way to do
 * something here: WCAG 2.2 asks for a single-pointer alternative, and a drag is
 * unusable by keyboard regardless.
 */
import { useRef, useState, type ReactNode } from "react";
import styles from "./SidePanel.module.css";

interface SidePanelProps {
  id: string;
  title: string;
  /** Show the title as a visible heading. Either way it names the panel for assistive tech. */
  showTitle?: boolean;
  children: ReactNode;
  open?: boolean;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

const STEP = 24;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const SidePanel = ({
  id,
  title,
  showTitle = true,
  children,
  open = true,
  initialWidth = 288,
  minWidth = 220,
  maxWidth = 520,
}: SidePanelProps) => {
  const [width, setWidth] = useState(initialWidth);
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  const resizeTo = (next: number) => setWidth(clamp(next, minWidth, maxWidth));

  return (
    <section id={id} className={styles.panel} style={{ width: `${width}px` }} aria-label={title} hidden={!open}>
      {showTitle && <h2 className={styles.header}>{title}</h2>}

      <div className={styles.body}>{children}</div>

      {open && (
        <div
          role="separator"
          tabIndex={0}
          aria-orientation="vertical"
          aria-label={`Resize ${title}`}
          aria-valuenow={Math.round(width)}
          aria-valuemin={minWidth}
          aria-valuemax={maxWidth}
          className={styles.resizer}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.setPointerCapture?.(event.pointerId);
            drag.current = { startX: event.clientX, startWidth: width };
          }}
          onPointerMove={(event) => {
            if (drag.current === null) return;
            resizeTo(drag.current.startWidth + (event.clientX - drag.current.startX));
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            const next = {
              ArrowLeft: width - STEP,
              ArrowRight: width + STEP,
              Home: minWidth,
              End: maxWidth,
            }[event.key];

            if (next !== undefined) {
              event.preventDefault();
              resizeTo(next);
            }
          }}
        >
          <span className={styles.grabber} aria-hidden="true" />
        </div>
      )}
    </section>
  );
};
