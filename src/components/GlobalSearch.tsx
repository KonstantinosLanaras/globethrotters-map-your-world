import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, X, MapPin, Star, Bookmark, Filter, Compass, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { worldCities } from "@/data/cities";
import { useNavigate } from "react-router-dom";

type SearchMode = "places" | "experiences";

const categoryEmoji: Record<string, string> = {
  Food: "🍽️",
  Culture: "🏛️",
  Nature: "🌿",
  Hiking: "🥾",
  Nightlife: "🌙",
  general: "📍",
};

const experienceCategories = ["Food", "Culture", "Nature", "Hiking", "Nightlife"] as const;

const placesFilters = [
  { key: "safe", label: "🛡️ Safe" },
  { key: "family", label: "👨‍👩‍👧 Family" },
  { key: "budget", label: "💰 Budget" },
  { key: "food", label: "🍽️ Food" },
  { key: "nightlife", label: "🌙 Nightlife" },
] as const;

interface GlobalSearchProps {
  initialMode?: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
  externalOpen?: boolean;
}

const GlobalSearch = ({ initialMode, onModeChange, externalOpen }: GlobalSearchProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<SearchMode>(initialMode ?? "places");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activePlaceFilter, setActivePlaceFilter] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Sync with external mode prop
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  // External open trigger
  useEffect(() => {
    if (externalOpen) setOpen(true);
  }, [externalOpen]);

  const handleModeSwitch = useCallback((newMode: SearchMode) => {
    setMode(newMode);
    setSearch("");
    setActiveCategory(null);
    setActivePlaceFilter(null);
    onModeChange?.(newMode);
  }, [onModeChange]);

  // Fetch community experiences
  const { data: communityExperiences = [] } = useQuery({
    queryKey: ["global-search-experiences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("id, title, city, country, category, rating, tags, engagement_score, saves_count, user_id, caption")
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

  // Places mode results
  const placeResults = useMemo(() => {
    if (mode !== "places") return [];
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return worldCities
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.continent?.toLowerCase().includes(q)
      )
      .slice(0, 10)
      .map(c => ({
        id: `${c.name}-${c.country}`,
        name: c.name,
        country: c.country,
        lat: c.lat,
        lng: c.lng,
      }));
  }, [search, mode]);

  // Experiences mode results
  const experienceResults = useMemo(() => {
    if (mode !== "experiences") return [];
    const q = search.toLowerCase().trim();
    if (!q && !activeCategory) return [];

    return communityExperiences
      .filter(e => {
        const matchesSearch = !q ||
          e.title.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q) ||
          e.country?.toLowerCase().includes(q) ||
          e.caption?.toLowerCase().includes(q) ||
          e.tags?.some((t: string) => t.toLowerCase().includes(q));
        const matchesCat = !activeCategory || e.category.toLowerCase() === activeCategory.toLowerCase();
        return matchesSearch && matchesCat;
      })
      .slice(0, 12);
  }, [search, mode, activeCategory, communityExperiences]);

  // Group experiences by city for display
  const groupedExperiences = useMemo(() => {
    const groups: Record<string, typeof experienceResults> = {};
    experienceResults.forEach(e => {
      const key = [e.city, e.country].filter(Boolean).join(", ") || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [experienceResults]);

  const hasResults = mode === "places" ? placeResults.length > 0 : experienceResults.length > 0;
  const isSearching = Boolean(search) || Boolean(activeCategory);

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
            className="absolute right-0 top-full mt-2 w-[420px] bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Mode toggle */}
            <div className="flex border-b border-border">
              <button
                onClick={() => handleModeSwitch("places")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all ${
                  mode === "places"
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Places
              </button>
              <button
                onClick={() => handleModeSwitch("experiences")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all ${
                  mode === "experiences"
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Experiences
              </button>
            </div>

            {/* Search input */}
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    mode === "places"
                      ? "Search cities, destinations…"
                      : "Search experiences, tags, places…"
                  }
                  className="pl-9 h-9 rounded-xl bg-muted/50 border-0 text-sm"
                  autoFocus
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Adaptive filters */}
              <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
                {mode === "experiences"
                  ? experienceCategories.map((cat) => (
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
                    ))
                  : placesFilters.map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setActivePlaceFilter(activePlaceFilter === f.key ? null : f.key)}
                        className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                          activePlaceFilter === f.key
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))
                }
              </div>
            </div>

            {/* Results */}
            {isSearching && (
              <div className="max-h-[400px] overflow-y-auto border-t border-border">
                {!hasResults ? (
                  <div className="text-center py-8">
                    <Search className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No {mode === "places" ? "places" : "experiences"} found
                    </p>
                  </div>
                ) : mode === "places" ? (
                  /* Places results */
                  <div className="p-2 space-y-0.5">
                    <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 pt-1">
                      Cities & Destinations
                    </p>
                    {placeResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          navigate(`/?city=${encodeURIComponent(c.name)}`);
                          setOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors text-left"
                      >
                        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground">{c.country}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Experiences results — grouped by city */
                  <div className="p-2 space-y-1">
                    {Object.entries(groupedExperiences).map(([location, exps]) => (
                      <div key={location}>
                        <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 pt-1.5 pb-0.5">
                          {location}
                        </p>
                        {exps.map((e) => (
                          <div
                            key={e.id}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors"
                          >
                            <span className="text-sm flex-shrink-0">
                              {categoryEmoji[e.category] || "📍"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                  {e.category}
                                </span>
                                {e.tags?.slice(0, 2).map((t: string) => (
                                  <span key={t} className="text-[10px] text-muted-foreground">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {e.rating && e.rating > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  <span className="text-[10px] text-foreground">{e.rating}</span>
                                </span>
                              )}
                              {e.saves_count > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Bookmark className="w-2.5 h-2.5" />
                                  {e.saves_count}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
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
