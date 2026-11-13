"use client";

/**
 * Whether the layer panel is showing.
 *
 * The trigger lives in the header and the panel lives in the row below it, so the
 * state belongs to neither — it sits above both. Small enough to be one file:
 * provider, hook, and the button itself.
 */
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import styles from "./panel.module.css";

/** Stable so the header's `aria-controls` always resolves to the panel. */
export const LAYER_PANEL_ID = "layer-panel";

interface PanelState {
  readonly open: boolean;
  readonly toggle: () => void;
}

const PanelContext = createContext<PanelState | null>(null);

export const PanelProvider = ({ children, defaultOpen = true }: { children: ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);

  const value = useMemo<PanelState>(() => ({ open, toggle: () => setOpen((current) => !current) }), [open]);

  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
};

export const usePanel = (): PanelState => {
  const value = useContext(PanelContext);
  if (value === null) {
    throw new Error("usePanel must be used inside a PanelProvider.");
  }
  return value;
};

/**
 * A panel glyph rather than a hamburger: it says *which* thing it opens, where a
 * hamburger would only say "a menu". The accessible name carries the verb, since the
 * icon alone cannot say whether pressing it shows or hides.
 */
export const PanelToggle = () => {
  const { open, toggle } = usePanel();

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-expanded={open}
      aria-controls={LAYER_PANEL_ID}
      aria-label={open ? "Hide the layers panel" : "Show the layers panel"}
      onClick={toggle}
    >
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
        <rect x="2.5" y="3.5" width="15" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 3.5v13" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="3.6" y="4.6" width="3.3" height="10.8" rx="1.2" fill="currentColor" opacity={open ? 1 : 0.25} />
      </svg>
    </button>
  );
};
