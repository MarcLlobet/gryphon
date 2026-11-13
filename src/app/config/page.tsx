import { AppHeader, SettingsLink } from "@/components/AppHeader";
import { ConfigView } from "@/features/config/ConfigView";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import shell from "../map.module.css";
import styles from "../page.module.css";

export const metadata = { title: "Configuration" };

export default function ConfigPage() {
  return (
    <>
      {/* The same wrapper and header as the map page, so the header is identical. */}
      <div className={shell.header}>
        <AppHeader
          action={
            <>
              <ThemeToggle />
              <SettingsLink current />
            </>
          }
        />
      </div>
      <main className={styles.main}>
        <ConfigView />
      </main>
    </>
  );
}
