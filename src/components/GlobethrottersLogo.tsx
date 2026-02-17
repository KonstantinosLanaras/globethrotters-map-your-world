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
      {/* Europe + Mediterranean */}
      <path
        d="M44 40 Q47 37 51 39 Q54 37 57 40 Q58 44 56 47 Q53 49 50 48 Q46 50 44 47 Q42 44 44 40Z"
        fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.1"
      />
      {/* Africa — elongated south */}
      <path
        d="M47 51 Q51 49 54 51 Q56 49 58 54 Q59 60 56 66 Q53 70 50 69 Q47 68 46 63 Q44 57 46 53Z"
        fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.08"
      />
      {/* North America */}
      <path
        d="M26 42 Q30 38 34 41 Q37 44 36 50 Q34 56 30 58 Q26 56 25 52 Q24 48 26 42Z"
        fill="currentColor" opacity="0.14" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.08"
      />
      {/* South America */}
      <path
        d="M30 62 Q34 58 36 62 Q37 68 34 73 Q30 76 28 72 Q26 68 30 62Z"
        fill="currentColor" opacity="0.12" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.06"
      />
      {/* Asia — broad mass */}
      <path
        d="M60 38 Q66 36 72 40 Q76 44 74 50 Q70 54 66 52 Q62 50 60 46 Q58 42 60 38Z"
        fill="currentColor" opacity="0.14" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.08"
      />
      {/* Australia */}
      <path
        d="M66 64 Q70 61 74 64 Q76 68 73 72 Q70 74 67 71 Q64 68 66 64Z"
        fill="currentColor" opacity="0.1" stroke="currentColor" strokeWidth="0.3" strokeOpacity="0.06"
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
