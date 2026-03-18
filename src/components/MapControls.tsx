import { motion } from "framer-motion";
import { Building2, Eye, EyeOff, MapPin, Heart, Star, Layers } from "lucide-react";

interface MapControlsProps {
  showCities: boolean;
  onToggleCities: () => void;
  mapFilter: "all" | "visited" | "wishlist";
  onFilterChange: (f: "all" | "visited" | "wishlist") => void;
  stats: { visited: number; wishlist: number; countries: number };
}

const MapControls = ({
  showCities,
  onToggleCities,
  mapFilter,
  onFilterChange,
  stats,
}: MapControlsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="fixed top-[124px] left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-2 py-1.5 bg-card/90 backdrop-blur-xl rounded-full border border-border shadow-lg"
    >
      {/* Cities toggle - prominent */}
      <button
        onClick={onToggleCities}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
          showCities
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
      >
        <Building2 className="w-3.5 h-3.5" />
        Cities
        {showCities ? (
          <Eye className="w-3 h-3 opacity-70" />
        ) : (
          <EyeOff className="w-3 h-3 opacity-50" />
        )}
      </button>

      <div className="w-px h-5 bg-border" />

      {/* Filter pills */}
      <button
        onClick={() => onFilterChange("all")}
        className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
          mapFilter === "all"
            ? "bg-foreground/10 text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Layers className="w-3.5 h-3.5 inline mr-1" />
        All
      </button>
      <button
        onClick={() => onFilterChange("visited")}
        className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium transition-all ${
          mapFilter === "visited"
            ? "bg-visited/15 text-visited"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Star className="w-3 h-3" />
        Visited
        {stats.visited > 0 && (
          <span className="text-[10px] opacity-60">{stats.visited}</span>
        )}
      </button>
      <button
        onClick={() => onFilterChange("wishlist")}
        className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium transition-all ${
          mapFilter === "wishlist"
            ? "bg-wishlist/15 text-wishlist"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Heart className="w-3 h-3" />
        Wishlist
        {stats.wishlist > 0 && (
          <span className="text-[10px] opacity-60">{stats.wishlist}</span>
        )}
      </button>
    </motion.div>
  );
};

export default MapControls;
