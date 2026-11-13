"use client";

/** Next's boundary for anything a page throws while rendering. */
import { useEffect } from "react";
import styles from "./status.module.css";

export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.status}>
      <p className={styles.code}>Error</p>
      <h1 className={styles.title}>Something on this page broke.</h1>
      <p className={styles.body}>Your layers are safe. Try again, and if it keeps happening, reload the page.</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
