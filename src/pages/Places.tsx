import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { MapPin, Globe, Search, Filter } from "lucide-react";
import { usePlaces } from "@/hooks/usePlaces";
import { useState } from "react";

const Places = () => {
  const { data: places = [] } = usePlaces();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "visited" | "wishlist">("all");

  const filteredPlaces = places.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.country.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || p.type === filter;
    return matchesSearch && matchesFilter;
  });

  const countries = [...new Set(places.filter((p) => p.type === "visited").map((p) => p.country))];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[80px] px-6 pb-12 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h1 className="font-display text-3xl font-semibold text-foreground">Places</h1>
          </div>
          <p className="text-muted-foreground mb-6">Browse destinations you've explored and dream of visiting</p>

          {/* Search & filter */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search places or countries..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
              />
            </div>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {(["all", "visited", "wishlist"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Countries overview */}
          {countries.length > 0 && filter !== "wishlist" && (
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{countries.length} countries:</span>
              {countries.slice(0, 10).map((c) => (
                <span key={c} className="px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">
                  {c}
                </span>
              ))}
              {countries.length > 10 && (
                <span className="text-xs text-muted-foreground">+{countries.length - 10} more</span>
              )}
            </div>
          )}
        </motion.div>

        {/* Places grid */}
        {filteredPlaces.length === 0 ? (
          <div className="text-center py-16">
            <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {search ? "No places match your search" : "No places yet. Start adding pins on the map!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredPlaces.map((place, i) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    place.type === "visited" ? "bg-visited/15 text-visited" : "bg-wishlist/15 text-wishlist"
                  }`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {place.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{place.country}</p>
                    {place.tags && place.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {place.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {place.rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-gold fill-gold" />
                      <span className="text-xs font-medium text-foreground">{place.rating}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Star = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export default Places;
