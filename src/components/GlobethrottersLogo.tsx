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
      {/* Globe circle — slightly imperfect/organic */}
      <circle
        cx="50" cy="55" r="34"
        stroke="currentColor" strokeWidth="1.8" opacity="0.7"
      />

      {/* Equator */}
      <ellipse
        cx="50" cy="55" rx="34" ry="8"
        stroke="currentColor" strokeWidth="0.8" opacity="0.25"
      />

      {/* Meridian */}
      <ellipse
        cx="50" cy="55" rx="10" ry="34"
        stroke="currentColor" strokeWidth="0.8" opacity="0.2"
      />

      {/* Second meridian offset */}
      <ellipse
        cx="50" cy="55" rx="24" ry="34"
        stroke="currentColor" strokeWidth="0.6" opacity="0.12"
      />

      {/* Simplified continent shapes — Europe/Africa */}
      <path
        d="M44 38 Q48 36 52 38 Q55 42 54 48 Q52 54 48 56 Q44 58 42 54 Q40 48 42 42Z"
        fill="currentColor" opacity="0.12"
      />

      {/* Americas */}
      <path
        d="M28 44 Q32 40 34 44 Q36 50 34 56 Q32 62 28 64 Q24 62 24 56 Q24 50 28 44Z"
        fill="currentColor" opacity="0.1"
      />

      {/* Asia/Australia */}
      <path
        d="M60 42 Q66 40 70 44 Q74 48 72 54 Q68 58 64 56 Q60 52 58 48 Q58 44 60 42Z"
        fill="currentColor" opacity="0.1"
      />

      {/* Small landmass */}
      <path
        d="M62 62 Q66 60 68 64 Q66 68 62 66Z"
        fill="currentColor" opacity="0.08"
      />

      {/* Walking figure — gender-neutral, abstract, poetic */}
      <g>
        {/* Head */}
        <circle cx="50" cy="14" r="3.5" fill="currentColor" opacity="0.6" />

        {/* Body/torso */}
        <line x1="50" y1="17.5" x2="50" y2="28"
          stroke="currentColor" strokeWidth="1.4" opacity="0.55" strokeLinecap="round" />

        {/* Arms — slightly asymmetric for movement */}
        <line x1="50" y1="21" x2="44" y2="26"
          stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
        <line x1="50" y1="21" x2="56" y2="25"
          stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />

        {/* Legs — walking stride */}
        {animate ? (
          <>
            <motion.line
              x1="50" y1="28"
              animate={{ x2: [55, 45, 55], y2: [36, 36, 36] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              stroke="currentColor" strokeWidth="1.1" opacity="0.45" strokeLinecap="round"
            />
            <motion.line
              x1="50" y1="28"
              animate={{ x2: [45, 55, 45], y2: [36, 36, 36] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              stroke="currentColor" strokeWidth="1.1" opacity="0.45" strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <line x1="50" y1="28" x2="54" y2="36"
              stroke="currentColor" strokeWidth="1.1" opacity="0.45" strokeLinecap="round" />
            <line x1="50" y1="28" x2="46" y2="36"
              stroke="currentColor" strokeWidth="1.1" opacity="0.45" strokeLinecap="round" />
          </>
        )}
      </g>

      {/* Tiny footstep dots */}
      {[36, 40, 44].map((x, i) => (
        <circle key={i} cx={x} cy={34 - i * 0.5} r={0.6}
          fill="currentColor" opacity={0.08 + i * 0.04} />
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
