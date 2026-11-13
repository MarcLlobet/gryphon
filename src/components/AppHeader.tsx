import Link from "next/link";
import type { ReactNode } from "react";
import { GryphonEmblem } from "./GryphonEmblem";
import styles from "./AppHeader.module.css";

/**
 * The same header on every page, at the same height.
 *
 * The logo is the way home: it links to the map, so no separate "back" control is
 * needed. The gear links to the configuration page; it is a link rather than a
 * button because it navigates, and its purpose is carried by its accessible name
 * rather than by visible text.
 */
export const AppHeader = ({ leading, action }: { leading?: ReactNode; action?: ReactNode }) => (
  <header className={styles.header}>
    <div className={styles.lead}>
      {leading}
      <Link href="/" className={styles.brand} aria-label="Gryphon, go to the map">
        <GryphonEmblem size={30} title="" />
        <span className={styles.title} aria-hidden="true">
          GRYPHON
        </span>
      </Link>
    </div>
    <nav aria-label="Sections" className={styles.nav}>
      {action}
    </nav>
  </header>
);

export const SettingsLink = ({ current = false }: { current?: boolean }) => (
  <Link
    href="/config"
    className={styles.action}
    aria-label="Configuration"
    aria-current={current ? "page" : undefined}
    title="Configuration"
  >
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5m7.43-2.53a7.9 7.9 0 0 0 0-1.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.7 7.7 0 0 0-1.68-.97l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7.7 7.7 0 0 0-1.68.97l-2.39-.96a.5.5 0 0 0-.6.22L2.42 8.81a.5.5 0 0 0 .12.64l2.03 1.58a7.9 7.9 0 0 0 0 1.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96a7.7 7.7 0 0 0 1.68.97l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7.7 7.7 0 0 0 1.68-.97l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64Z"
      />
    </svg>
  </Link>
);
