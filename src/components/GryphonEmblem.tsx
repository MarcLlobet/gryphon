import { useId } from "react";
import { GryphonHead } from "./GryphonHead";

interface GryphonEmblemProps {
  size?: number;
  title?: string;
}

/** The compact mark: the griffin head cropped by a disc. Used in the header. */
export const GryphonEmblem = ({ size = 96, title = "Gryphon" }: GryphonEmblemProps) => {
  const clipId = `emblem${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      {...(title === "" ? { "aria-hidden": true } : { role: "img", "aria-label": title })}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="100" cy="100" r="96" />
        </clipPath>
      </defs>
      <circle cx="100" cy="100" r="96" fill="var(--ink-2)" stroke="var(--line)" strokeWidth="3" />
      <g clipPath={`url(#${clipId})`}>
        <g transform="translate(96 104) scale(0.96) translate(-100 -100)">
          {/* currentColor: the head takes the colour of the link it sits in, so it
              turns orange with the wordmark on hover. */}
          <GryphonHead body="currentColor" detail="var(--ink-2)" compact={size < 72} />
        </g>
      </g>
    </svg>
  );
};
