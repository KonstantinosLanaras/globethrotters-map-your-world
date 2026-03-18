import { motion } from "framer-motion";
import { Building2, Eye, EyeOff, Layers, Bookmark } from "lucide-react";

interface ListOption {
  id: string;
  title: string;
  emoji: string;
}

interface MapControlsProps {
  showCities: boolean;
  onToggleCities: () => void;
  mapFilter: "all" | "visited" | "wishlist";
  onFilterChange: (f: "all" | "visited" | "wishlist") => void;
  stats: { visited: number; wishlist: number; countries: number };
  lists?: ListOption[];
  selectedListId?: string | null;
  onListSelect?: (id: string | null) => void;
}

const MapControls = ({
  showCities,
  onToggleCities,
  mapFilter,
  onFilterChange,
  stats,
  lists = [],
  selectedListId,
  onListSelect,
}: MapControlsProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="fixed top-[72px] left-3 z-[1000] flex flex-col gap-1.5 p-1.5 bg-card/90 backdrop-blur-xl rounded-2xl border border-border shadow-lg"
    >
      {/* Cities toggle */}
      <button
        onClick={onToggleCities}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
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

      <div className="h-px bg-border mx-1" />

      {/* Filter pills */}
      <button
        onClick={() => { onFilterChange("all"); onListSelect?.(null); }}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
          mapFilter === "all" && !selectedListId
            ? "bg-foreground/10 text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        All
      </button>
      <button
        onClick={() => { onFilterChange("visited"); onListSelect?.(null); }}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
          mapFilter === "visited" && !selectedListId
            ? "bg-visited/15 text-visited"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-visited flex-shrink-0" />
        Visited
        {stats.visited > 0 && (
          <span className="text-[10px] opacity-60">{stats.visited}</span>
        )}
      </button>
      <button
        onClick={() => { onFilterChange("wishlist"); onListSelect?.(null); }}
        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
          mapFilter === "wishlist" && !selectedListId
            ? "bg-wishlist/15 text-wishlist"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-wishlist flex-shrink-0" />
        Wishlist
        {stats.wishlist > 0 && (
          <span className="text-[10px] opacity-60">{stats.wishlist}</span>
        )}
      </button>

      {/* Collection filters */}
      {lists.length > 0 && (
        <>
          <div className="h-px bg-border mx-1" />
          <div className="px-1 pt-0.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 mb-1">
              Collections
            </p>
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => {
                  onListSelect?.(selectedListId === list.id ? null : list.id);
                  onFilterChange("all");
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap w-full ${
                  selectedListId === list.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-xs">{list.emoji}</span>
                <span className="truncate max-w-[80px]">{list.title}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
};

export default MapControls;
