import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Eye, EyeOff, Layers,
  Utensils, Landmark, TreePine, Moon, Compass,
  Gem, Home, Plus, Minus, Check
} from "lucide-react";

export const ACTIVITY_TAGS = [
  { id: "food", label: "Food", icon: Utensils },
  { id: "culture", label: "Culture", icon: Landmark },
  { id: "nature", label: "Nature", icon: TreePine },
  { id: "nightlife", label: "Nightlife", icon: Moon },
  { id: "beach", label: "Beach", icon: Compass },
  { id: "museum", label: "Museum", icon: Building2 },
  { id: "hidden_gem", label: "Hidden Gem", icon: Gem },
  { id: "stay", label: "Stay", icon: Home },
] as const;

export type ActivityTag = typeof ACTIVITY_TAGS[number]["id"];

interface MapControlsProps {
  showCities: boolean;
  onToggleCities: () => void;
  mapFilter: "all" | "visited" | "wishlist";
  onFilterChange: (f: "all" | "visited" | "wishlist") => void;
  stats: { visited: number; wishlist: number; countries: number };
  activeTags: ActivityTag[];
  onTagToggle: (tag: ActivityTag) => void;
}

const MapControls = ({
  showCities,
  onToggleCities,
  mapFilter,
  onFilterChange,
  stats,
  activeTags,
  onTagToggle,
}: MapControlsProps) => {
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const activeCount = activeTags.length;

  const clearAll = () => {
    activeTags.forEach(t => onTagToggle(t));
  };

  const selectAll = () => {
    ACTIVITY_TAGS.forEach(t => {
      if (!activeTags.includes(t.id)) onTagToggle(t.id);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="fixed top-[72px] left-3 z-[1000] flex flex-col gap-1 p-1.5 bg-card/90 backdrop-blur-xl rounded-2xl border border-border shadow-lg"
    >
      {/* Destinations toggle */}
      <button
        onClick={onToggleCities}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
          showCities
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        }`}
      >
        <Building2 className="w-3.5 h-3.5" />
        Destinations
        {showCities ? <Eye className="w-3 h-3 opacity-70" /> : <EyeOff className="w-3 h-3 opacity-50" />}
      </button>

      <div className="h-px bg-border mx-1" />

      {/* Status filters */}
      <button
        onClick={() => onFilterChange("all")}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
          mapFilter === "all" ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Layers className="w-3.5 h-3.5" /> All
      </button>
      <button
        onClick={() => onFilterChange("visited")}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
          mapFilter === "visited" ? "bg-visited/15 text-visited" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-visited flex-shrink-0" />
        Visited
        {stats.visited > 0 && <span className="text-[10px] opacity-60">{stats.visited}</span>}
      </button>
      <button
        onClick={() => onFilterChange("wishlist")}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
          mapFilter === "wishlist" ? "bg-wishlist/15 text-wishlist" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-wishlist flex-shrink-0" />
        Wishlist
        {stats.wishlist > 0 && <span className="text-[10px] opacity-60">{stats.wishlist}</span>}
      </button>

      <div className="h-px bg-border mx-1" />

      {/* Activities collapsible */}
      <button
        onClick={() => setActivitiesOpen(!activitiesOpen)}
        className={`group flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
          activeCount > 0
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${
          activitiesOpen
            ? "bg-primary/15 text-primary"
            : "bg-orange-500/15 text-orange-500 group-hover:bg-orange-500/25"
        }`}>
          {activitiesOpen
            ? <Minus className="w-2.5 h-2.5" />
            : <Plus className="w-2.5 h-2.5" />
          }
        </span>
        Activities
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {activitiesOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pl-2 space-y-0.5 pb-1">
              {ACTIVITY_TAGS.map((tag) => {
                const Icon = tag.icon;
                const isActive = activeTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => onTagToggle(tag.id)}
                    className={`w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="flex-1 text-left">{tag.label}</span>
                    {isActive && <Check className="w-3 h-3 text-primary" />}
                  </button>
                );
              })}

              {/* Select/Clear controls */}
              <div className="flex items-center gap-2 px-2.5 pt-1">
                <button
                  onClick={selectAll}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Select all
                </button>
                <span className="text-muted-foreground/30">·</span>
                <button
                  onClick={clearAll}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MapControls;
