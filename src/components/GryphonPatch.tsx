import { useId } from "react";
import { HEAD_IN_PATCH } from "./gryphonArt";
import { GryphonHead } from "./GryphonHead";
import styles from "./GryphonPatch.module.css";

interface GryphonPatchProps {
  size?: number;
  title?: string;
  className?: string;
}

/**
 * The mission patch: the head cropped in a porthole, inside a band that reads
 * GRYPHON over the top.
 */
export const GryphonPatch = ({ size = 200, title = "Gryphon", className }: GryphonPatchProps) => {
  // React ids contain characters that are awkward inside url(#…); keep them plain.
  const id = `patch${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const clip = `${id}-clip`;
  const top = `${id}-top`;
  const { x, y, scale } = HEAD_IN_PATCH;

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={title} className={className}>
      <defs>
        <clipPath id={clip}>
          <circle cx="100" cy="100" r="71" />
        </clipPath>
        <path id={top} d="M21 100 a79 79 0 1 1 158 0" />
      </defs>
      <circle cx="100" cy="100" r="97" fill="var(--ink)" stroke="var(--frost)" strokeWidth="3" />
      <circle cx="100" cy="100" r="72" fill="var(--ink-2)" stroke="var(--thermal)" strokeWidth="1.5" />
      <text className={styles.top} textAnchor="middle">
        <textPath href={`#${top}`} startOffset="50%">
          GRYPHON
        </textPath>
      </text>
      <path d="M15 96 L16.5 100 L15 104 L13.5 100 Z M11 100 L15 98.5 L19 100 L15 101.5 Z" fill="var(--thermal)" />
      <path
        d="M185 96 L186.5 100 L185 104 L183.5 100 Z M181 100 L185 98.5 L189 100 L185 101.5 Z"
        fill="var(--thermal)"
      />
      <g clipPath={`url(#${clip})`}>
        <g transform={`translate(${x} ${y}) scale(${scale}) translate(-100 -100)`}>
          <GryphonHead detail="var(--ink-2)" />
        </g>
      </g>
    </svg>
  );
};
