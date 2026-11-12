interface GryphonEmblemProps {
  size?: number;
  title?: string;
}

/** The Gryphon mission-patch emblem: griffin head, wings and an orbit. */
export const GryphonEmblem = ({ size = 96, title = "Gryphon" }: GryphonEmblemProps) => (
  <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={title}>
    <circle cx="100" cy="100" r="96" fill="var(--ink)" stroke="var(--frost)" strokeWidth="3" />
    <circle cx="100" cy="100" r="86" fill="none" stroke="var(--frost)" strokeOpacity="0.25" />
    <ellipse
      cx="100"
      cy="104"
      rx="90"
      ry="28"
      transform="rotate(-18 100 104)"
      fill="none"
      stroke="var(--thermal)"
      strokeWidth="2.5"
    />
    <path d="M66 132 L20 104 L27 96 L72 122 Z" fill="var(--frost)" />
    <path d="M64 118 L25 82 L32 75 L70 108 Z" fill="var(--frost)" />
    <path d="M66 104 L36 64 L44 59 L70 94 Z" fill="var(--frost)" />
    <path
      d="M60 160 L70 95 L52 58 L88 78 L82 46 L110 70 L150 74 L172 92 L168 120 L156 106 L146 112 L132 112 L122 160 Z"
      fill="var(--frost)"
    />
    <path d="M78 128 L100 112 M82 146 L108 128" stroke="var(--ink)" strokeWidth="4" fill="none" />
    <path d="M126 86 L138 82 L142 92 L130 94 Z" fill="var(--thermal)" />
    <circle cx="183" cy="87" r="5" fill="var(--frost)" stroke="var(--thermal)" strokeWidth="2" />
  </svg>
);
