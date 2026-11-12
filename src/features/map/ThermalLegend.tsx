import { legendTicks, THERMAL_RANGE_CELSIUS } from "@/lib/thermal/scale";
import { THERMAL_GRADIENT } from "@/lib/thermal/tiles";
import styles from "./ThermalLegend.module.css";

const gradient = `linear-gradient(to right, ${THERMAL_GRADIENT.join(", ")})`;

export const ThermalLegend = () => {
  const { min, max } = THERMAL_RANGE_CELSIUS;

  return (
    <figure className={styles.legend}>
      <figcaption className={styles.caption}>Land surface temperature (°C)</figcaption>
      <div
        className={styles.bar}
        style={{ backgroundImage: gradient }}
        role="img"
        aria-label={`Colour scale from ${min} °C (black) to ${max} °C (pale yellow)`}
      />
      <ol className={styles.ticks} aria-hidden="true">
        {legendTicks().map((tick) => (
          <li key={tick}>{tick}</li>
        ))}
      </ol>
    </figure>
  );
};
