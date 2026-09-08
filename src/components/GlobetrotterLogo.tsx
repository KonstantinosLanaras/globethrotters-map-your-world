import { motion } from "framer-motion";

interface GlobetrotterLogoProps {
  variant?: "icon" | "full";
  size?: number;
  animate?: boolean;
  className?: string;
}

const GlobetrotterLogo = ({
  variant = "icon",
  size = 32,
  animate = true,
  className = "",
}: GlobetrotterLogoProps) => {
  const iconSize = size;

  const icon = (
    <svg
      viewBox="0 0 100 100"
      width={iconSize}
      height={iconSize}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={variant === "icon" ? className : ""}
    >
      {/* Ocean fill */}
      <circle cx="50" cy="56" r="33"
        fill="hsl(200, 55%, 55%)" />
      {/* Globe outline */}
      <circle cx="50" cy="56" r="33"
        stroke="hsl(210, 30%, 25%)" strokeWidth="1.8" fill="none" />

      {/* Latitude lines */}
      <ellipse cx="50" cy="44" rx="30" ry="4"
        stroke="hsl(200, 40%, 45%)" strokeWidth="0.5" opacity="0.4" fill="none" />
      <ellipse cx="50" cy="56" rx="33" ry="6"
        stroke="hsl(200, 40%, 45%)" strokeWidth="0.5" opacity="0.35" fill="none" />
      <ellipse cx="50" cy="68" rx="30" ry="4"
        stroke="hsl(200, 40%, 45%)" strokeWidth="0.5" opacity="0.4" fill="none" />

      {/* Meridians */}
      <ellipse cx="50" cy="56" rx="10" ry="33"
        stroke="hsl(200, 40%, 45%)" strokeWidth="0.5" opacity="0.3" fill="none" />
      <ellipse cx="50" cy="56" rx="22" ry="33"
        stroke="hsl(200, 40%, 45%)" strokeWidth="0.4" opacity="0.2" fill="none" />

      {/* Continents — green with clear dark outlines */}
      {/* Europe */}
      <path d="M43 39 Q46 36 50 37 Q53 36 56 38 Q58 41 57 45 Q55 48 52 47 Q48 49 45 47 Q42 44 43 39Z"
        fill="hsl(110, 40%, 55%)" stroke="hsl(210, 30%, 25%)" strokeWidth="0.9" strokeLinejoin="round" />
      {/* Africa */}
      <path d="M47 50 Q51 48 55 50 Q57 48 58 53 Q59 59 57 65 Q54 69 51 68 Q48 67 46 62 Q44 56 46 52Z"
        fill="hsl(100, 38%, 50%)" stroke="hsl(210, 30%, 25%)" strokeWidth="0.9" strokeLinejoin="round" />
      {/* North America */}
      <path d="M26 41 Q29 37 33 39 Q36 42 36 48 Q34 54 31 57 Q27 55 25 51 Q24 47 26 41Z"
        fill="hsl(105, 35%, 52%)" stroke="hsl(210, 30%, 25%)" strokeWidth="0.9" strokeLinejoin="round" />
      {/* South America */}
      <path d="M30 60 Q34 57 36 61 Q37 67 34 72 Q31 75 28 71 Q26 66 30 60Z"
        fill="hsl(108, 36%, 50%)" stroke="hsl(210, 30%, 25%)" strokeWidth="0.8" strokeLinejoin="round" />
      {/* Asia */}
      <path d="M60 37 Q65 35 71 38 Q75 42 74 48 Q70 53 66 51 Q62 49 60 45 Q58 41 60 37Z"
        fill="hsl(105, 35%, 52%)" stroke="hsl(210, 30%, 25%)" strokeWidth="0.9" strokeLinejoin="round" />
      {/* Australia */}
      <path d="M66 63 Q70 60 74 63 Q76 67 73 71 Q70 73 67 70 Q64 67 66 63Z"
        fill="hsl(110, 38%, 53%)" stroke="hsl(210, 30%, 25%)" strokeWidth="0.8" strokeLinejoin="round" />

      {/* Walking figure */}
      <g>
        {/* Head */}
        <circle cx="50" cy="14" r="3.5" fill="hsl(210, 30%, 25%)" opacity="0.7" />
        {/* Hat brim */}
        <ellipse cx="50" cy="12" rx="5" ry="1.2" fill="hsl(30, 50%, 45%)" opacity="0.7" />
        {/* Hat top */}
        <rect x="47" y="9" width="6" height="3.5" rx="1.5" fill="hsl(30, 50%, 45%)" opacity="0.7" />

        {/* Torso */}
        <line x1="50" y1="17.5" x2="50" y2="28"
          stroke="hsl(210, 30%, 25%)" strokeWidth="1.6" opacity="0.65" strokeLinecap="round" />
        {/* Backpack */}
        <rect x="51" y="18" width="4" height="7" rx="1.5"
          fill="hsl(10, 65%, 50%)" stroke="hsl(210, 30%, 25%)" strokeWidth="0.5" opacity="0.7" />

        {/* Arms */}
        {animate ? (
          <>
            <motion.line x1="50" y1="21"
              animate={{ x2: [43, 57, 43], y2: [27, 25, 27] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              stroke="hsl(210, 30%, 25%)" strokeWidth="1.1" opacity="0.55" strokeLinecap="round" />
            <motion.line x1="50" y1="21"
              animate={{ x2: [57, 43, 57], y2: [25, 27, 25] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              stroke="hsl(210, 30%, 25%)" strokeWidth="1.1" opacity="0.55" strokeLinecap="round" />
          </>
        ) : (
          <>
            <line x1="50" y1="21" x2="44" y2="26"
              stroke="hsl(210, 30%, 25%)" strokeWidth="1.1" opacity="0.55" strokeLinecap="round" />
            <line x1="50" y1="21" x2="56" y2="25"
              stroke="hsl(210, 30%, 25%)" strokeWidth="1.1" opacity="0.55" strokeLinecap="round" />
          </>
        )}

        {/* Legs */}
        {animate ? (
          <>
            <motion.line x1="50" y1="28"
              animate={{ x2: [55, 45, 55], y2: [36, 36, 36] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              stroke="hsl(210, 30%, 25%)" strokeWidth="1.3" opacity="0.55" strokeLinecap="round" />
            <motion.line x1="50" y1="28"
              animate={{ x2: [45, 55, 45], y2: [36, 36, 36] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              stroke="hsl(210, 30%, 25%)" strokeWidth="1.3" opacity="0.55" strokeLinecap="round" />
          </>
        ) : (
          <>
            <line x1="50" y1="28" x2="54" y2="36"
              stroke="hsl(210, 30%, 25%)" strokeWidth="1.3" opacity="0.55" strokeLinecap="round" />
            <line x1="50" y1="28" x2="46" y2="36"
              stroke="hsl(210, 30%, 25%)" strokeWidth="1.3" opacity="0.55" strokeLinecap="round" />
          </>
        )}
      </g>
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

export default GlobetrotterLogo;
