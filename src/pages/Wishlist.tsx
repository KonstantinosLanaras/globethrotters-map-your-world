import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Heart, MapPin, Trash2, ChevronDown, ChevronRight, Filter, Globe, Compass } from "lucide-react";
import { usePlaces, useDeletePlace } from "@/hooks/usePlaces";
import { useExperiencesWithPhotos } from "@/hooks/useExperiences";
import { toast } from "sonner";
import type { Place } from "@/hooks/usePlaces";

const categoryFilters = ["All", "Food", "Culture", "Nature", "Hiking", "Nightlife"] as const;
const categoryEmoji: Record<string, string> = {
  Food: "🍽️", Culture: "🏛️", Nature: "🌿", Hiking: "🥾", Nightlife: "🌙",
};

interface DestinationNode {
  city: string;
  country: string;
  lat: number;
  lng: number;
  places: Place[];
  experiences: { id: string; title: string; category: string; rating: number | null; tags: string[] | null; caption: string | null }[];
}

const Wishlist = () => {
  const { data: places = [] } = usePlaces();
  const { data: experiences = [] } = useExperiencesWithPhotos();
  const deletePlace = useDeletePlace();
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedDestinations, setExpandedDestinations] = useState<Set<string>>(new Set());

  const wishlistPlaces = useMemo(() => {
    return places.filter((p) => p.type === "wishlist");
  }, [places]);

  // Build destination hierarchy: Country → City (destination) → places (experiences inside)
  const hierarchy = useMemo(() => {
    const destMap = new Map<string, DestinationNode>();

    wishlistPlaces.forEach((p) => {
      // Destination = city field if available, otherwise fall back to name
      const destinationName = p.city || p.name;
      const key = `${p.country}||${destinationName}`;
      if (!destMap.has(key)) {
        destMap.set(key, {
          city: destinationName,
          country: p.country || "Unknown",
          lat: p.lat,
          lng: p.lng,
          places: [],
          experiences: [],
        });
      }
      const dest = destMap.get(key)!;
      // Only add as a nested experience if the place name differs from the destination
      // (i.e., it's a specific activity/experience, not the city itself)
      if (p.name.toLowerCase() !== destinationName.toLowerCase()) {
        dest.places.push(p);
      } else {
        // It's the city-level save — keep it as the destination node itself, don't duplicate
        // But store it so we can delete it if needed
        dest.places.push(p);
      }
    });

    // Attach community experiences to destinations
    destMap.forEach((dest) => {
      const cityExps = experiences.filter(
        (e) =>
          e.city?.toLowerCase() === dest.city.toLowerCase() &&
          e.country?.toLowerCase() === dest.country.toLowerCase()
      );
      dest.experiences = cityExps.map((e) => ({
        id: e.id,
        title: e.title,
        category: e.category,
        rating: e.rating,
        tags: e.tags,
        caption: e.caption,
      }));
    });

    // Group by country
    const countryMap = new Map<string, DestinationNode[]>();
    destMap.forEach((dest) => {
      const c = dest.country;
      if (!countryMap.has(c)) countryMap.set(c, []);
      countryMap.get(c)!.push(dest);
    });

    return Array.from(countryMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, dests]) => ({
        country,
        destinations: dests.sort((a, b) => a.city.localeCompare(b.city)),
      }));
  }, [wishlistPlaces, experiences]);

  // Apply category filter
  const filteredHierarchy = useMemo(() => {
    if (activeFilter === "All") return hierarchy;

    return hierarchy
      .map(({ country, destinations }) => ({
        country,
        destinations: destinations
          .map((dest) => ({
            ...dest,
            places: dest.places.filter((p) =>
              p.tags?.some((t) => t.toLowerCase() === activeFilter.toLowerCase())
            ),
            experiences: dest.experiences.filter(
              (e) => e.category.toLowerCase() === activeFilter.toLowerCase() ||
                e.tags?.some((t) => t.toLowerCase() === activeFilter.toLowerCase())
            ),
          }))
          .filter((d) => d.places.length > 0 || d.experiences.length > 0),
      }))
      .filter((c) => c.destinations.length > 0);
  }, [hierarchy, activeFilter]);

  // Counts
  const totalExperiences = useMemo(() => {
    return filteredHierarchy.reduce(
      (sum, c) => sum + c.destinations.reduce((s, d) => s + d.places.length + d.experiences.length, 0),
      0
    );
  }, [filteredHierarchy]);

  const totalDestinations = useMemo(() => {
    return filteredHierarchy.reduce((sum, c) => sum + c.destinations.length, 0);
  }, [filteredHierarchy]);

  // Auto-expand all on first load
  useMemo(() => {
    if (expandedCountries.size === 0 && filteredHierarchy.length > 0) {
      setExpandedCountries(new Set(filteredHierarchy.map((c) => c.country)));
      const allDests = new Set<string>();
      filteredHierarchy.forEach((c) =>
        c.destinations.forEach((d) => allDests.add(`${c.country}||${d.city}`))
      );
      setExpandedDestinations(allDests);
    }
  }, [filteredHierarchy.length]);

  const toggleCountry = (country: string) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(country)) next.delete(country);
      else next.add(country);
      return next;
    });
  };

  const toggleDestination = (key: string) => {
    setExpandedDestinations((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-5 h-5 text-wishlist" />
            <h1 className="font-display text-2xl font-semibold text-foreground">Wishlist</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {totalExperiences} {totalExperiences === 1 ? "experience" : "experiences"} across{" "}
            {totalDestinations} {totalDestinations === 1 ? "destination" : "destinations"} in{" "}
            {filteredHierarchy.length} {filteredHierarchy.length === 1 ? "country" : "countries"}
          </p>
        </motion.div>

        {/* Category filters */}
        <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          {categoryFilters.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat !== "All" && <span className="text-xs">{categoryEmoji[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

        {filteredHierarchy.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {activeFilter !== "All" ? `No ${activeFilter} wishlist items.` : "Nothing here yet."}
            </p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Toggle "Cities" on the map and start saving destinations!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHierarchy.map(({ country, destinations }, ci) => (
              <motion.div
                key={country}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.04 }}
              >
                {/* Country row */}
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
                    {destinations.length} {destinations.length === 1 ? "destination" : "destinations"}
                  </span>
                </button>

                {/* Destinations */}
                <AnimatePresence>
                  {expandedCountries.has(country) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pl-4 space-y-1.5 overflow-hidden"
                    >
                      {destinations.map((dest, di) => {
                        const destKey = `${country}||${dest.city}`;
                        // Separate city-level saves from sub-experience saves
                        const subPlaces = dest.places.filter(
                          (p) => p.name.toLowerCase() !== dest.city.toLowerCase()
                        );
                        const cityLevelPlace = dest.places.find(
                          (p) => p.name.toLowerCase() === dest.city.toLowerCase()
                        );
                        const itemCount = subPlaces.length + dest.experiences.length;
                        const isExpanded = expandedDestinations.has(destKey);

                        return (
                          <motion.div
                            key={destKey}
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: di * 0.02 }}
                          >
                            {/* Destination node */}
                            <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-wishlist/20 transition-all">
                              {itemCount > 0 ? (
                                <button onClick={() => toggleDestination(destKey)} className="flex items-center">
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-3.5" />
                              )}
                              <button
                                onClick={() => itemCount > 0 ? toggleDestination(destKey) : undefined}
                                className="flex items-center gap-2 flex-1 min-w-0"
                              >
                                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-wishlist/10 text-wishlist flex-shrink-0">
                                  <Compass className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm font-medium text-foreground">{dest.city}</span>
                                <span className="text-[11px] text-muted-foreground ml-auto">
                                  {itemCount > 0
                                    ? `${itemCount} ${itemCount === 1 ? "experience" : "experiences"}`
                                    : "destination saved"}
                                </span>
                              </button>
                              {cityLevelPlace && (
                                <button
                                  onClick={() => handleDelete(cityLevelPlace.id, cityLevelPlace.name)}
                                  className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Nested experiences/places (only sub-experiences, NOT duplicated city) */}
                            <AnimatePresence>
                              {isExpanded && itemCount > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="pl-8 space-y-1 mt-1 overflow-hidden"
                                >
                                  {/* Sub-place experiences */}
                                  {subPlaces.map((place, pi) => (
                                    <motion.div
                                      key={place.id}
                                      initial={{ opacity: 0, x: -4 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: pi * 0.02 }}
                                      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                                    >
                                      <MapPin className="w-3.5 h-3.5 text-wishlist flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate">{place.name}</p>
                                        {place.tags && place.tags.length > 0 && (
                                          <div className="flex gap-1 mt-0.5">
                                            {place.tags.slice(0, 3).map((tag) => (
                                              <span
                                                key={tag}
                                                className="px-1.5 py-0.5 rounded-full bg-muted text-[9px] text-muted-foreground"
                                              >
                                                {tag}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => handleDelete(place.id, place.name)}
                                        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </motion.div>
                                  ))}

                                  {/* Linked experiences */}
                                  {dest.experiences.map((exp, ei) => (
                                    <motion.div
                                      key={exp.id}
                                      initial={{ opacity: 0, x: -4 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: (dest.places.length + ei) * 0.02 }}
                                      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                                    >
                                      <span className="text-xs flex-shrink-0">
                                        {categoryEmoji[exp.category] || "📍"}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate">{exp.title}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                            {exp.category}
                                          </span>
                                          {exp.rating && exp.rating > 0 && (
                                            <span className="text-[9px] text-muted-foreground">
                                              ★ {exp.rating}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}

                                  {dest.places.length === 0 && dest.experiences.length === 0 && (
                                    <p className="text-[11px] text-muted-foreground/60 px-2 py-2">
                                      No experiences saved yet for this destination.
                                    </p>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
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
