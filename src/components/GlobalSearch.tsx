import { useState, useMemo, useRef, useEffect } from "react";
import { Search, X, MapPin, Camera, TrendingUp, Star, Bookmark, ThumbsUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlaces } from "@/hooks/usePlaces";
import { worldCities } from "@/data/cities";
import { useNavigate } from "react-router-dom";

const categoryEmoji: Record<string, string> = {
  Food: "🍽️",
  Culture: "🏛️",
  Nature: "🌿",
  Hiking: "🥾",
  Nightlife: "🌙",
  general: "📍",
};

const categories = ["Food", "Culture", "Nature", "Hiking", "Nightlife"] as const;

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { data: places = [] } = usePlaces();

  // Fetch community experiences for search
  const { data: communityExperiences = [] } = useQuery({
    queryKey: ["global-search-experiences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("id, title, city, country, category, rating, tags, engagement_score, saves_count")
        .eq("visibility", "public")
        .order("engagement_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const results = useMemo(() => {
    const q = search.toLowerCase().trim();
    
    // City results from world cities
    let cityResults = worldCities
      .filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.country.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map(c => ({ type: "city" as const, id: `${c.name}-${c.country}`, name: c.name, country: c.country, lat: c.lat, lng: c.lng }));

    // Experience results
    let expResults = communityExperiences
      .filter(e => {
        const matchesSearch = !q || 
          e.title.toLowerCase().includes(q) || 
          e.city?.toLowerCase().includes(q) || 
          e.country?.toLowerCase().includes(q) ||
          e.tags?.some((t: string) => t.toLowerCase().includes(q));
        const matchesCategory = !activeCategory || e.category.toLowerCase() === activeCategory.toLowerCase();
        return matchesSearch && matchesCategory;
      })
      .slice(0, 8)
      .map(e => ({ type: "experience" as const, id: e.id, title: e.title, city: e.city, country: e.country, category: e.category, rating: e.rating, saves_count: e.saves_count }));

    if (!q && !activeCategory) return { cities: [], experiences: [] };
    return { cities: q ? cityResults : [], experiences: expResults };
  }, [search, activeCategory, communityExperiences]);

  const hasResults = results.cities.length > 0 || results.experiences.length > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">Search</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-[380px] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cities, experiences, tags..."
                  className="pl-9 h-9 rounded-xl bg-muted/50 border-0 text-sm"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Category filters */}
              <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {categoryEmoji[cat]} {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {(search || activeCategory) && (
              <div className="max-h-[400px] overflow-y-auto border-t border-border">
                {!hasResults ? (
                  <div className="text-center py-8">
                    <Search className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No results found</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {results.cities.length > 0 && (
                      <>
                        <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 pt-1">Cities</p>
                        {results.cities.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { navigate(`/?city=${encodeURIComponent(c.name)}`); setOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors text-left"
                          >
                            <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.country}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                    {results.experiences.length > 0 && (
                      <>
                        <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 pt-2">Experiences</p>
                        {results.experiences.map((e) => (
                          <div
                            key={e.id}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm flex-shrink-0">{categoryEmoji[e.category] || "📍"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {[e.city, e.country].filter(Boolean).join(", ")}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {e.rating && e.rating > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span className="text-[10px] text-foreground">{e.rating}</span>
                                </span>
                              )}
                              {e.saves_count > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Bookmark className="w-2.5 h-2.5" />{e.saves_count}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
