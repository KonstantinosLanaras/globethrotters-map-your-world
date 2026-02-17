import { motion } from "framer-motion";
import { MapPin, Globe, Trophy, ChevronRight, Bookmark } from "lucide-react";
import { travelStats, curatedLists } from "@/data/sampleData";

const SidePanel = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="fixed top-[73px] left-4 bottom-4 w-[280px] z-[1000] bg-card/90 backdrop-blur-xl rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col"
    >
      {/* Stats header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="text-sm font-medium text-foreground">
            {travelStats.level}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{travelStats.progress}%</span>
            <span>{travelStats.nextLevel}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${travelStats.progress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <StatCard
            icon={<Globe className="w-3.5 h-3.5" />}
            value={travelStats.countriesVisited}
            label="Countries"
          />
          <StatCard
            icon={<MapPin className="w-3.5 h-3.5" />}
            value={travelStats.totalPins}
            label="Pins"
          />
        </div>

        {/* Pin legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-visited" />
            <span>{travelStats.visitedCount} visited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-wishlist" />
            <span>{travelStats.wishlistCount} wishlist</span>
          </div>
        </div>
      </div>

      {/* Curated lists */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">My Lists</span>
        </div>
        <div className="space-y-2">
          {curatedLists.map((list, i) => (
            <motion.button
              key={list.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group text-left"
            >
              <span className="text-lg">{list.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {list.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {list.pinCount} places
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </div>
      </div>

      {/* Badges */}
      <div className="p-5 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Recent Badges</p>
        <div className="flex flex-wrap gap-1.5">
          {travelStats.badges.slice(0, 3).map((badge) => (
            <span
              key={badge}
              className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const StatCard = ({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) => (
  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/60">
    <div className="text-primary">{icon}</div>
    <div>
      <p className="text-lg font-display font-semibold text-foreground leading-none">
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  </div>
);

export default SidePanel;
