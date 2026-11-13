import { AppHeader, SettingsLink } from "@/components/AppHeader";
import { BootProvider } from "@/features/boot/BootProvider";
import { MapView } from "@/features/explorer/MapView";
import { SafeIntro } from "@/features/intro/SafeIntro";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { PanelProvider, PanelToggle } from "@/features/layout/panel";
import styles from "./map.module.css";

export default function HomePage() {
  return (
    <BootProvider>
      <PanelProvider>
        <main className={styles.shell}>
          <div className={styles.header}>
            <AppHeader
              leading={<PanelToggle />}
              action={
                <>
                  <ThemeToggle />
                  <SettingsLink />
                </>
              }
            />
          </div>
          <MapView />
        </main>
      </PanelProvider>
      {/* Rendered after the map so the map starts loading underneath it at once. */}
      <SafeIntro />
    </BootProvider>
  );
}
