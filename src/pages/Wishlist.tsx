import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Heart, MapPin, Trash2, ChevronDown, ChevronRight, Filter, Bookmark, Globe } from "lucide-react";
import { usePlaces, useDeletePlace } from "@/hooks/usePlaces";
import { useLists } from "@/hooks/useLists";
import { useAllListPlaces } from "@/hooks/useListPlaces";
import { toast } from "sonner";

import type { Place } from "@/hooks/usePlaces";

const Wishlist = () => {
  const { data: places = [] } = usePlaces();
  const deletePlace = useDeletePlace();
  const { data: lists = [] } = useLists();
  const { data: allListPlaces = [] } = useAllListPlaces();
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

  const wishlistPlaces = useMemo(() => {
    let items = places.filter((p) => p.type === "wishlist");
    if (selectedListId) {
      const placeIdsInList = new Set(
        allListPlaces.filter((lp) => lp.list_id === selectedListId).map((lp) => lp.place_id)
      );
      items = items.filter((p) => placeIdsInList.has(p.id));
    }
    return items;
  }, [places, selectedListId, allListPlaces]);

  // Group by country → city
  const grouped = useMemo(() => {
    const g: Record<string, typeof wishlistPlaces> = {};
    wishlistPlaces.forEach((p) => {
      const country = p.country || "Unknown";
      if (!g[country]) g[country] = [];
      g[country].push(p);
    });
    // Sort countries alphabetically
    const sorted: [string, typeof wishlistPlaces][] = Object.entries(g).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return sorted;
  }, [wishlistPlaces]);

  // Auto-expand all countries initially
  useMemo(() => {
    if (expandedCountries.size === 0 && grouped.length > 0) {
      setExpandedCountries(new Set(grouped.map(([c]) => c)));
    }
  }, [grouped.length]);

  const toggleCountry = (country: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deletePlace.mutateAsync(id);
      toast.success(`Removed ${name} from wishlist`);
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[76px] px-6 pb-12 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-wishlist" />
            <h1 className="font-display text-2xl font-semibold text-foreground">Wishlist</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {wishlistPlaces.length} places across {grouped.length} {grouped.length === 1 ? "country" : "countries"}
          </p>
        </motion.div>

        {/* Collection filter chips */}
        {lists.length > 0 && (
          <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
            <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <button
              onClick={() => setSelectedListId(null)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                !selectedListId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Globe className="w-3 h-3" />
              All
            </button>
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => setSelectedListId(selectedListId === list.id ? null : list.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedListId === list.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <span className="text-xs">{list.emoji}</span>
                {list.title}
              </button>
            ))}
          </div>
        )}

        {wishlistPlaces.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {selectedListId ? "No wishlist places in this collection." : "Nothing here yet."}
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Toggle "Cities" on the map and start saving places!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(([country, items], ci) => (
              <motion.div
                key={country}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.04 }}
              >
                {/* Country header */}
                <button
                  onClick={() => toggleCountry(country)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors mb-1"
                >
                  {expandedCountries.has(country) ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{country}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {items.length} {items.length === 1 ? "place" : "places"}
                  </span>
                </button>

                <AnimatePresence>
                  {expandedCountries.has(country) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-6 space-y-1.5 overflow-hidden"
                    >
                      {items.map((place, i) => (
                        <motion.div
                          key={place.id}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-wishlist/20 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-wishlist/10 text-wishlist flex-shrink-0">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
                            {place.tags && place.tags.length > 0 && (
                              <div className="flex gap-1 mt-0.5">
                                {place.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(place.id, place.name)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
