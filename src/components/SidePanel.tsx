import { motion } from "framer-motion";
import { MapPin, Globe, Trophy, ChevronRight, Bookmark } from "lucide-react";
import { usePlaces } from "@/hooks/usePlaces";
import { useLists } from "@/hooks/useLists";
import { useIsMobile } from "@/hooks/use-mobile";

const SidePanel = () => {
  const isMobile = useIsMobile();
  const { data: places = [] } = usePlaces();
  const { data: lists = [] } = useLists();

  if (isMobile) return null;

  const visitedCount = places.filter((p) => p.type === "visited").length;
  const wishlistCount = places.filter((p) => p.type === "wishlist").length;
  const countries = new Set(places.filter((p) => p.type === "visited").map((p) => p.country)).size;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="fixed top-[73px] left-4 bottom-4 w-[280px] z-[1000] bg-card/90 backdrop-blur-xl rounded-2xl border border-border shadow-xl overflow-hidden flex flex-col"
    >
      {/* Stats header */}
      <div className="p-5 border-b border-border">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Globe className="w-3.5 h-3.5" />} value={countries} label="Countries" />
          <StatCard icon={<MapPin className="w-3.5 h-3.5" />} value={places.length} label="Pins" />
        </div>

        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-visited" />
            <span>{visitedCount} visited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-wishlist" />
            <span>{wishlistCount} wishlist</span>
          </div>
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">My Lists</span>
        </div>
        {lists.length === 0 ? (
          <p className="text-xs text-muted-foreground">No lists yet</p>
        ) : (
          <div className="space-y-2">
            {lists.map((list, i) => (
              <motion.button
                key={list.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group text-left"
              >
                <span className="text-lg">{list.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{list.title}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const StatCard = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/60">
    <div className="text-primary">{icon}</div>
    <div>
      <p className="text-lg font-display font-semibold text-foreground leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  </div>
);

export default SidePanel;
