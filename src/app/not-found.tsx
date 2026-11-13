import Link from "next/link";
import styles from "./status.module.css";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className={styles.status}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>Nothing to observe here.</h1>
      <p className={styles.body}>This page does not exist.</p>
      <div className={styles.actions}>
        <Link href="/" className={styles.primary}>
          Go to the map
        </Link>
      </div>
    </main>
  );
}
