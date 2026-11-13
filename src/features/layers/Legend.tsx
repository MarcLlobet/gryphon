"use client";

/**
 * A legend driven entirely by the document.
 *
 * The thermal ramp that used to be hardcoded is now just one `kind: "ramp"` legend
 * among others, so a layer added at runtime explains itself the same way.
 */
import { useId } from "react";
import type { Legend as LegendSpec } from "@/core/config/schema";
import { rampTicks } from "@/core/render/legend";
import styles from "./Legend.module.css";

const formatTick = (value: number): string => (Number.isInteger(value) ? String(value) : value.toFixed(1));

const Ramp = ({ legend, labelledBy }: { legend: Extract<LegendSpec, { kind: "ramp" }>; labelledBy: string }) => {
  const unit = legend.unit === undefined ? "" : ` ${legend.unit}`;

  return (
    <>
      <div
        className={styles.bar}
        style={{ backgroundImage: `linear-gradient(to right, ${legend.colors.join(", ")})` }}
        role="img"
        aria-label={`Colour scale from ${legend.min}${unit} to ${legend.max}${unit}`}
        aria-describedby={labelledBy}
      />
      <ol className={styles.ticks} aria-hidden="true">
        {rampTicks(legend.min, legend.max).map((tick) => (
          <li key={tick}>{formatTick(tick)}</li>
        ))}
      </ol>
    </>
  );
};

const Categories = ({ legend }: { legend: Extract<LegendSpec, { kind: "categories" }> }) => (
  <ul className={styles.swatches}>
    {legend.items.map((item) => (
      <li key={item.label}>
        <span className={styles.swatch} style={{ backgroundColor: item.color }} aria-hidden="true" />
        {item.label}
      </li>
    ))}
  </ul>
);

const ScaledCircles = ({ legend }: { legend: Extract<LegendSpec, { kind: "scaled-circle" }> }) => {
  const unit = legend.unit === undefined ? "" : `${legend.unit} `;
  const largest = Math.max(...legend.stops.map((stop) => stop.radius));

  return (
    <ul className={styles.circles} style={{ minHeight: `${largest * 2 + 4}px` }}>
      {legend.stops.map((stop) => (
        <li key={stop.value}>
          <span
            className={styles.circle}
            style={{ width: `${stop.radius * 2}px`, height: `${stop.radius * 2}px`, borderColor: legend.color }}
            aria-hidden="true"
          />
          <span className={styles.circleLabel}>{`${unit}${formatTick(stop.value)}`}</span>
        </li>
      ))}
    </ul>
  );
};

export const Legend = ({ legend, title }: { legend: LegendSpec; title: string }) => {
  const captionId = useId();

  return (
    // `figcaption` names a `figure` in browsers, but the accessible-name algorithm
    // used in tests only implements the explicit association, so it is spelled out.
    <figure className={styles.legend} aria-labelledby={captionId}>
      <figcaption id={captionId} className={styles.caption}>
        {title}
      </figcaption>
      {legend.kind === "ramp" && <Ramp legend={legend} labelledBy={captionId} />}
      {legend.kind === "categories" && <Categories legend={legend} />}
      {legend.kind === "scaled-circle" && <ScaledCircles legend={legend} />}
    </figure>
  );
};
