import { GRYPHON_HEAD as H } from "./gryphonArt";

interface GryphonHeadProps {
  /** Fill of the head itself. */
  body?: string;
  /** Colour of the cuts and details, normally whatever sits behind the head. */
  detail?: string;
  /** Colour of the eye. */
  eye?: string;
  /** Fewer details for small sizes. */
  compact?: boolean;
}

/** The griffin head in art space (200×200). Meant to be placed inside an <svg>. */
export const GryphonHead = ({
  body = "var(--frost)",
  detail = "var(--ink)",
  eye = "var(--thermal)",
  compact = false,
}: GryphonHeadProps) => (
  <g>
    <g fill={body}>
      {H.tufts.map((d) => (
        <path key={d} d={d} />
      ))}
      <path d={H.silhouette} />
    </g>
    {!compact && <path d={H.beakShade} fill={detail} fillOpacity={0.22} />}
    <path d={H.brow} fill={detail} />
    <g fill="none" stroke={detail} strokeLinecap="round" strokeWidth={compact ? 4 : 2.5}>
      <path d={H.cere} />
      <path d={H.gape} />
      {(compact ? H.feathers.slice(1, 3) : H.feathers).map((d) => (
        <path key={d} d={d} />
      ))}
      {!compact && H.tuftLines.map((d) => <path key={d} d={d} strokeWidth={1.6} />)}
    </g>
    {!compact && (
      <ellipse
        cx={H.nostril.cx}
        cy={H.nostril.cy}
        rx={H.nostril.rx}
        ry={H.nostril.ry}
        transform={`rotate(${H.nostril.rotate} ${H.nostril.cx} ${H.nostril.cy})`}
        fill={detail}
      />
    )}
    <ellipse cx={H.eye.cx} cy={H.eye.cy} rx={8.5} ry={7.5} fill={detail} />
    <ellipse cx={H.eye.cx} cy={H.eye.cy} rx={7} ry={6} fill={eye} />
    <circle cx={H.eye.cx + 1} cy={H.eye.cy} r={3.2} fill={detail} />
    {!compact && <circle cx={H.eye.cx + 3} cy={H.eye.cy - 2} r={1.2} fill={body} />}
  </g>
);
