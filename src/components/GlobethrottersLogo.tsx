import { motion } from "framer-motion";

interface GlobethrottersLogoProps {
  /** "icon" = just the globe+figure, "full" = icon + wordmark */
  variant?: "icon" | "full";
  /** Size of the icon portion */
  size?: number;
  /** Whether to animate the walking figure */
  animate?: boolean;
  className?: string;
}

/**
 * Globethrotters logo — a gender-neutral walking figure atop
 * a hand-drawn globe with simplified continents.
 * Inspired by the founder's sketch: poetic, minimal, exploratory.
 */
const GlobethrottersLogo = ({
  variant = "icon",
  size = 32,
  animate = true,
  className = "",
}: GlobethrottersLogoProps) => {
  const iconSize = size;
  const Wrapper = animate ? motion.svg : "svg";

  const icon = (
    <svg
      viewBox="0 0 100 100"
      width={iconSize}
      height={iconSize}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={variant === "icon" ? className : ""}
    >
      {/* Globe circle — organic, hand-drawn feel */}
      <circle
        cx="50" cy="56" r="33"
        stroke="currentColor" strokeWidth="1.6" opacity="0.6"
      />
      {/* Inner dashed circle for depth */}
      <circle
        cx="50" cy="56" r="33"
        stroke="currentColor" strokeWidth="0.4" opacity="0.15"
        strokeDasharray="2 3"
      />

      {/* Latitude lines — 3 visible bands */}
      <ellipse cx="50" cy="44" rx="30" ry="4"
        stroke="currentColor" strokeWidth="0.6" opacity="0.18" />
      <ellipse cx="50" cy="56" rx="33" ry="6"
        stroke="currentColor" strokeWidth="0.7" opacity="0.22" />
      <ellipse cx="50" cy="68" rx="30" ry="4"
        stroke="currentColor" strokeWidth="0.6" opacity="0.18" />

      {/* Meridians — 3 arcs for globe feel */}
      <ellipse cx="50" cy="56" rx="10" ry="33"
        stroke="currentColor" strokeWidth="0.6" opacity="0.18" />
      <ellipse cx="50" cy="56" rx="22" ry="33"
        stroke="currentColor" strokeWidth="0.5" opacity="0.12" />
      <ellipse cx="42" cy="56" rx="5" ry="33"
        stroke="currentColor" strokeWidth="0.4" opacity="0.08" />

      {/* Continents — clearer, more recognizable shapes */}
      {/* Europe */}
      <path
        d="M43 39 Q46 36 50 37 Q53 36 56 38 Q58 41 57 45 Q55 48 52 47 Q48 49 45 47 Q42 44 43 39Z"
        fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="0.8" opacity="0.45" strokeLinejoin="round"
      />
      {/* Africa */}
      <path
        d="M47 50 Q51 48 55 50 Q57 48 58 53 Q59 59 57 65 Q54 69 51 68 Q48 67 46 62 Q44 56 46 52Z"
        fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" opacity="0.4" strokeLinejoin="round"
      />
      {/* North America */}
      <path
        d="M26 41 Q29 37 33 39 Q36 42 36 48 Q34 54 31 57 Q27 55 25 51 Q24 47 26 41Z"
        fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" opacity="0.4" strokeLinejoin="round"
      />
      {/* South America */}
      <path
        d="M30 60 Q34 57 36 61 Q37 67 34 72 Q31 75 28 71 Q26 66 30 60Z"
        fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="0.7" opacity="0.35" strokeLinejoin="round"
      />
      {/* Asia */}
      <path
        d="M60 37 Q65 35 71 38 Q75 42 74 48 Q70 53 66 51 Q62 49 60 45 Q58 41 60 37Z"
        fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="0.8" opacity="0.4" strokeLinejoin="round"
      />
      {/* Australia */}
      <path
        d="M66 63 Q70 60 74 63 Q76 67 73 71 Q70 73 67 70 Q64 67 66 63Z"
        fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="0.7" opacity="0.35" strokeLinejoin="round"
      />

      {/* Walking figure — gender-neutral, poetic, on top of globe */}
      <g>
        {/* Head */}
        <circle cx="50" cy="14" r="3.5" fill="currentColor" opacity="0.55" />

        {/* Torso */}
        <line x1="50" y1="17.5" x2="50" y2="28"
          stroke="currentColor" strokeWidth="1.4" opacity="0.5" strokeLinecap="round" />

        {/* Arms — walking swing */}
        {animate ? (
          <>
            <motion.line x1="50" y1="21"
              animate={{ x2: [43, 57, 43], y2: [27, 25, 27] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
            <motion.line x1="50" y1="21"
              animate={{ x2: [57, 43, 57], y2: [25, 27, 25] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <line x1="50" y1="21" x2="44" y2="26"
              stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
            <line x1="50" y1="21" x2="56" y2="25"
              stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
          </>
        )}

        {/* Legs — walking stride */}
        {animate ? (
          <>
            <motion.line x1="50" y1="28"
              animate={{ x2: [55, 45, 55], y2: [36, 36, 36] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              stroke="currentColor" strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
            <motion.line x1="50" y1="28"
              animate={{ x2: [45, 55, 45], y2: [36, 36, 36] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              stroke="currentColor" strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
          </>
        ) : (
          <>
            <line x1="50" y1="28" x2="54" y2="36"
              stroke="currentColor" strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
            <line x1="50" y1="28" x2="46" y2="36"
              stroke="currentColor" strokeWidth="1.2" opacity="0.45" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* Tiny footstep dots */}
      {[36, 40, 44].map((x, i) => (
        <circle key={i} cx={x} cy={34 - i * 0.5} r={0.6}
          fill="currentColor" opacity={0.1 + i * 0.05} />
      ))}
    </svg>
  );

  if (variant === "icon") return icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {icon}
      <span className="font-display text-xl font-semibold text-foreground tracking-tight">
        Globethrotters
      </span>
    </div>
  );
};

export default GlobethrottersLogo;
