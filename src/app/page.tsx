import { GryphonEmblem } from "@/components/GryphonEmblem";
import { Explorer } from "@/features/explorer/Explorer";
import { DEFAULT_BBOX } from "@/lib/geo/bbox";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <GryphonEmblem size={88} />
        <div>
          <p className={styles.eyebrow}>THERMAL EARTH EXPLORER</p>
          <h1 className={styles.title}>GRYPHON</h1>
        </div>
      </header>

      <p className={styles.intro}>
        In the Alexander Romance, two griffins carried Alexander into the sky so he could look down on
        the Earth — the first Earth observation mission. Gryphon searches open thermal infrared
        archives through STAC, the same standard behind ALEX.
      </p>

      <Explorer bbox={DEFAULT_BBOX} areaName="Barcelona" />
    </main>
  );
}
