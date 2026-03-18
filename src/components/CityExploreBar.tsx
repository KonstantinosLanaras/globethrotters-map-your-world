import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal, X, Star, Shield, Users, Heart, TreePine, Utensils, Music, Palette, Mountain, Sparkles, Compass, Camera, Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { worldCities, City } from "@/data/cities";
import {
  cityScores,
  CityScore,
  rankCities,
  ExploreFilters,
  BudgetFilter,
  SafetyFilter,
  TravelStyleFilter,
  PreferenceFilter,
} from "@/data/cityScores";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SearchMode = "places" | "experiences";

interface CityExploreBarProps {
  onCitySelect: (city: City) => void;
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
}

const categoryEmoji: Record<string, string> = {
  Food: "🍽️",
  Culture: "🏛️",
  Nature: "🌿",
  Hiking: "🥾",
  Nightlife: "🌙",
  general: "📍",
};

const experienceCategories = ["Food", "Culture", "Nature", "Hiking", "Nightlife"] as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const budgetLabels: Record<BudgetFilter, string> = { low: "€", medium: "€€", high: "€€€" };
const safetyLabels: Record<SafetyFilter, string> = { very_safe: "Very safe", generally_safe: "Generally safe", be_cautious: "Be cautious" };
const styleLabels: Record<TravelStyleFilter, { label: string; icon: typeof Users }> = {
  family: { label: "Family-friendly", icon: Users },
  solo: { label: "Solo-friendly", icon: Users },
  couple: { label: "Couple-friendly", icon: Heart },
};
const prefLabels: Record<PreferenceFilter, { label: string; icon: typeof Utensils }> = {
  food: { label: "Food", icon: Utensils },
  nature: { label: "Nature", icon: TreePine },
  nightlife: { label: "Nightlife", icon: Music },
  culture: { label: "Culture", icon: Palette },
  adventure: { label: "Adventure", icon: Mountain },
};

const climateGradeColor: Record<string, string> = {
  A: "text-green-600",
  B: "text-emerald-500",
  C: "text-amber-500",
  D: "text-red-400",
};

type CrowdFilter = "low" | "moderate" | "high";
const crowdLabels: Record<CrowdFilter, string> = { low: "Quiet", moderate: "Moderate", high: "Busy" };

interface ExpFilters {
  categories: string[];
  minRating: number | null;
  withPhotos: boolean;
  recent: boolean;
  tags: string[];
}

const defaultExpFilters: ExpFilters = {
  categories: [],
  minRating: null,
  withPhotos: false,
  recent: false,
  tags: [],
};

const CityExploreBar = ({ onCitySelect, mode, onModeChange }: CityExploreBarProps) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ExploreFilters>({});
  const [crowdFilter, setCrowdFilter] = useState<CrowdFilter[]>([]);
  const [expFilters, setExpFilters] = useState<ExpFilters>(defaultExpFilters);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state on mode switch
  useEffect(() => {
    setQuery("");
    setShowFilters(false);
    if (mode === "places") {
      setExpFilters(defaultExpFilters);
    } else {
      setFilters({});
      setCrowdFilter([]);
    }
  }, [mode]);

  // Fetch community experiences for experience mode
  const { data: communityExperiences = [] } = useQuery({
    queryKey: ["unified-search-experiences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("id, title, city, country, category, rating, tags, engagement_score, saves_count, caption")
        .eq("visibility", "public")
        .order("engagement_score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: mode === "experiences",
  });

  const hasActiveExpFilters = useMemo(() => {
    return expFilters.categories.length > 0 || expFilters.minRating !== null || expFilters.withPhotos || expFilters.recent;
  }, [expFilters]);

  const hasActiveFilters = useMemo(() => {
    if (mode === "experiences") return hasActiveExpFilters;
    return !!(filters.budget?.length || filters.safety?.length || filters.travelStyle?.length || filters.preferences?.length || filters.month || crowdFilter.length);
  }, [filters, crowdFilter, mode, hasActiveExpFilters]);

  const activeFilterCount = useMemo(() => {
    if (mode === "experiences") {
      let count = expFilters.categories.length;
      if (expFilters.minRating !== null) count++;
      if (expFilters.withPhotos) count++;
      if (expFilters.recent) count++;
      return count;
    }
    let count = 0;
    if (filters.budget?.length) count += filters.budget.length;
    if (filters.safety?.length) count += filters.safety.length;
    if (filters.travelStyle?.length) count += filters.travelStyle.length;
    if (filters.preferences?.length) count += filters.preferences.length;
    if (filters.month) count += 1;
    if (crowdFilter.length) count += crowdFilter.length;
    return count;
  }, [filters, crowdFilter, mode, expFilters]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Places mode: ranked/filtered cities
  const placeResults = useMemo(() => {
    if (mode !== "places") return [];
    let ranked: CityScore[];
    if (hasActiveFilters) {
      ranked = rankCities(filters);
    } else {
      ranked = [...cityScores].sort((a, b) => b.popularity - a.popularity);
    }
    if (crowdFilter.length && filters.month) {
      ranked = ranked.filter((c) => crowdFilter.includes(c.crowdLevel[filters.month!] as CrowdFilter));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      ranked = ranked.filter(
        (c) => c.cityName.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
      );
    }
    return ranked.slice(0, 15);
  }, [query, filters, hasActiveFilters, crowdFilter, mode]);

  // Experiences mode results
  const experienceResults = useMemo(() => {
    if (mode !== "experiences") return [];
    const q = query.toLowerCase().trim();
    const hasCatFilter = expFilters.categories.length > 0;
    if (!q && !hasCatFilter && !expFilters.minRating && !expFilters.withPhotos && !expFilters.recent) return [];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return communityExperiences
      .filter(e => {
        const matchesSearch = !q ||
          e.title.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q) ||
          e.country?.toLowerCase().includes(q) ||
          e.caption?.toLowerCase().includes(q) ||
          e.tags?.some((t: string) => t.toLowerCase().includes(q));
        const matchesCat = !hasCatFilter || expFilters.categories.some(c => e.category.toLowerCase() === c.toLowerCase());
        const matchesRating = !expFilters.minRating || (e.rating && e.rating >= expFilters.minRating);
        return matchesSearch && matchesCat && matchesRating;
      })
      .slice(0, 15);
  }, [query, mode, expFilters, communityExperiences]);

  // Group experiences by location
  const groupedExperiences = useMemo(() => {
    const groups: Record<string, typeof experienceResults> = {};
    experienceResults.forEach(e => {
      const key = [e.city, e.country].filter(Boolean).join(", ") || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [experienceResults]);

  const handleSelect = useCallback(
    (score: CityScore) => {
      const city = worldCities.find(
        (c) => c.name.toLowerCase() === score.cityName.toLowerCase()
      );
      if (city) {
        onCitySelect(city);
        setIsOpen(false);
        setShowFilters(false);
        setQuery("");
      }
    },
    [onCitySelect]
  );

  const toggleFilter = <T extends string>(key: keyof ExploreFilters, value: T) => {
    setFilters((prev) => {
      const current = (prev[key] as T[] | undefined) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next.length ? next : undefined };
    });
  };

  const toggleCrowd = (value: CrowdFilter) => {
    setCrowdFilter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const clearFilters = () => {
    setFilters({});
    setCrowdFilter([]);
    setExpFilters(defaultExpFilters);
  };

  const toggleExpCategory = (cat: string) => {
    setExpFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const FilterChip = ({
    active,
    onClick,
    children,
    icon: Icon,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon?: typeof Utensils;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </button>
  );

  const showResults = mode === "places"
    ? isOpen
    : (isOpen && (!!query || hasActiveExpFilters));

  const currentResults = mode === "places" ? placeResults : experienceResults;

  return (
    <div ref={panelRef} className="fixed top-[68px] left-1/2 -translate-x-1/2 z-[1002] w-[92%] max-w-[520px] pointer-events-auto">
      {/* Mode toggle tabs */}
      <div className="flex mb-1.5 bg-card/90 backdrop-blur-xl rounded-xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => onModeChange("places")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${
            mode === "places"
              ? "text-primary bg-primary/8 border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Places
        </button>
        <button
          onClick={() => onModeChange("experiences")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all ${
            mode === "experiences"
              ? "text-primary bg-primary/8 border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Experiences
        </button>
      </div>

      {/* Search bar */}
      <div className="relative flex items-center gap-2">
        <div
          className={`flex-1 flex items-center gap-2 px-3.5 py-2.5 bg-card/95 backdrop-blur-xl rounded-xl border transition-all shadow-lg ${
            isOpen ? "border-primary/30 shadow-primary/10" : "border-border"
          }`}
        >
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder={
              mode === "places"
                ? "Search cities (Barcelona, Tokyo, Lisbon…)"
                : "Search experiences, tags, places…"
            }
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none"
          />
          {(query || isOpen) && (
            <button
              onClick={() => {
                setQuery("");
                if (!hasActiveFilters) setIsOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => {
            setShowFilters(!showFilters);
            setIsOpen(true);
          }}
          className={`relative w-10 h-10 rounded-xl flex items-center justify-center border transition-all shadow-lg ${
            showFilters || hasActiveFilters
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card/95 backdrop-blur-xl border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && !showFilters && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mt-2 bg-card/98 backdrop-blur-xl rounded-xl border border-border shadow-xl overflow-hidden flex flex-col"
            style={{ maxHeight: "calc(100vh - 180px)" }}
          >
            {/* ===== PLACES MODE FILTERS ===== */}
            {mode === "places" && (
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden flex flex-col"
                    style={{ maxHeight: "min(420px, 50vh)" }}
                  >
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/50 flex-shrink-0">
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Filters</span>
                      <div className="flex items-center gap-3">
                        {hasActiveFilters && (
                          <button onClick={clearFilters} className="text-xs text-primary hover:underline font-medium">
                            Clear all
                          </button>
                        )}
                        <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 overscroll-contain px-4 py-3 space-y-5">
                      <div>
                        <span className="text-xs font-medium text-muted-foreground mb-2 block">Budget</span>
                        <div className="flex gap-1.5">
                          {(["low", "medium", "high"] as BudgetFilter[]).map((b) => (
                            <FilterChip key={b} active={!!filters.budget?.includes(b)} onClick={() => toggleFilter("budget", b)}>
                              {budgetLabels[b]}
                            </FilterChip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground mb-2 block">Safety</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(["very_safe", "generally_safe", "be_cautious"] as SafetyFilter[]).map((s) => (
                            <FilterChip key={s} active={!!filters.safety?.includes(s)} onClick={() => toggleFilter("safety", s)} icon={Shield}>
                              {safetyLabels[s]}
                            </FilterChip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground mb-2 block">Travel style</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(["solo", "couple", "family"] as TravelStyleFilter[]).map((t) => (
                            <FilterChip key={t} active={!!filters.travelStyle?.includes(t)} onClick={() => toggleFilter("travelStyle", t)} icon={styleLabels[t].icon}>
                              {styleLabels[t].label}
                            </FilterChip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground mb-2 block">Preferences</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(["food", "nature", "nightlife", "culture", "adventure"] as PreferenceFilter[]).map((p) => (
                            <FilterChip key={p} active={!!filters.preferences?.includes(p)} onClick={() => toggleFilter("preferences", p)} icon={prefLabels[p].icon}>
                              {prefLabels[p].label}
                            </FilterChip>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground mb-2 block">Best time to visit</span>
                        <div className="flex flex-wrap gap-1">
                          {MONTHS.map((m, i) => (
                            <button
                              key={m}
                              onClick={() => setFilters((prev) => ({ ...prev, month: prev.month === i + 1 ? undefined : i + 1 }))}
                              className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                                filters.month === i + 1
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-muted-foreground mb-2 block">
                          Crowd level
                          {!filters.month && <span className="text-[10px] text-muted-foreground/50 ml-1.5">(select a month first)</span>}
                        </span>
                        <div className="flex gap-1.5">
                          {(["low", "moderate", "high"] as CrowdFilter[]).map((c) => (
                            <FilterChip key={c} active={crowdFilter.includes(c)} onClick={() => filters.month && toggleCrowd(c)}>
                              <span className={!filters.month ? "opacity-40" : ""}>{crowdLabels[c]}</span>
                            </FilterChip>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/20 flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground/60 leading-tight max-w-[200px]">
                        City insights are based on community contributions and are not verified.
                      </p>
                      <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                          <button onClick={clearFilters} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Clear all
                          </button>
                        )}
                        <button
                          onClick={() => setShowFilters(false)}
                          className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                        >
                          Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* ===== EXPERIENCES MODE FILTERS ===== */}
            {mode === "experiences" && (
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden flex flex-col"
                    style={{ maxHeight: "min(420px, 50vh)" }}
                  >
                    <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/50 flex-shrink-0">
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">Experience Filters</span>
                      <div className="flex items-center gap-3">
                        {hasActiveExpFilters && (
                          <button onClick={() => setExpFilters(defaultExpFilters)} className="text-xs text-primary hover:underline font-medium">
                            Clear all
                          </button>
                        )}
                        <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 overscroll-contain px-4 py-3 space-y-5">
                      {/* Category */}
                      <div>
                        <span className="text-xs font-medium text-muted-foreground mb-2 block">Category</span>
                        <div className="flex flex-wrap gap-1.5">
                          {experienceCategories.map((cat) => (
                            <FilterChip
                              key={cat}
                              active={expFilters.categories.includes(cat)}
                              onClick={() => toggleExpCategory(cat)}
                            >
                              {categoryEmoji[cat]} {cat}
                            </FilterChip>
                          ))}
                          <FilterChip
                            active={expFilters.categories.includes("general")}
                            onClick={() => toggleExpCategory("general")}
                          >
                            📍 General
                          </FilterChip>
                        </div>
                      </div>
                      {/* Minimum rating */}
                      <div>
                        <span className="text-xs font-medium text-muted-foreground mb-2 block">Minimum rating</span>
                        <div className="flex gap-1.5">
                          {[3, 4, 5].map((r) => (
                            <FilterChip
                              key={r}
                              active={expFilters.minRating === r}
                              onClick={() => setExpFilters(prev => ({ ...prev, minRating: prev.minRating === r ? null : r }))}
                              icon={Star}
                            >
                              {r}+
                            </FilterChip>
                          ))}
                        </div>
                      </div>
                      {/* Content filters */}
                      <div>
                        <span className="text-xs font-medium text-muted-foreground mb-2 block">Content</span>
                        <div className="flex flex-wrap gap-1.5">
                          <FilterChip
                            active={expFilters.withPhotos}
                            onClick={() => setExpFilters(prev => ({ ...prev, withPhotos: !prev.withPhotos }))}
                            icon={Camera}
                          >
                            With photos
                          </FilterChip>
                          <FilterChip
                            active={expFilters.recent}
                            onClick={() => setExpFilters(prev => ({ ...prev, recent: !prev.recent }))}
                            icon={Sparkles}
                          >
                            Recent (30 days)
                          </FilterChip>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/50 bg-muted/20 flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground/60 leading-tight max-w-[200px]">
                        Experiences are user-generated community content.
                      </p>
                      <div className="flex items-center gap-2">
                        {hasActiveExpFilters && (
                          <button onClick={() => setExpFilters(defaultExpFilters)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Clear all
                          </button>
                        )}
                        <button
                          onClick={() => setShowFilters(false)}
                          className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition-opacity"
                        >
                          Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Experience category pills (always visible in experience mode, below search) */}
            {mode === "experiences" && !showFilters && (
              <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide border-b border-border/30">
                {experienceCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      toggleExpCategory(cat);
                      setIsOpen(true);
                    }}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                      expFilters.categories.includes(cat)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {categoryEmoji[cat]} {cat}
                  </button>
                ))}
              </div>
            )}

            {/* ===== RESULTS ===== */}
            {mode === "places" ? (
              <>
                <div className="px-4 pt-3 pb-1.5 flex-shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {hasActiveFilters
                      ? `${placeResults.length} cities match`
                      : query
                      ? `${placeResults.length} results`
                      : "Popular destinations"}
                  </span>
                </div>
                <div className="overflow-y-auto flex-1 px-2 pb-2 overscroll-contain">
                  {placeResults.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      No cities found. Try adjusting your filters.
                    </div>
                  ) : (
                    placeResults.map((city) => (
                      <CityResultCard
                        key={`${city.cityName}-${city.country}`}
                        city={city}
                        selectedMonth={filters.month}
                        onClick={() => handleSelect(city)}
                      />
                    ))
                  )}
                </div>
                {!showFilters && (
                  <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground/70 text-center leading-tight">
                      City insights and scores are based on community contributions and are not verified.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="px-4 pt-3 pb-1.5 flex-shrink-0">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {experienceResults.length > 0
                      ? `${experienceResults.length} experiences`
                      : "Search or select a category"}
                  </span>
                </div>
                <div className="overflow-y-auto flex-1 px-2 pb-2 overscroll-contain">
                  {experienceResults.length === 0 ? (
                    <div className="py-8 text-center">
                      <Camera className="w-6 h-6 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        {query || hasActiveExpFilters ? "No experiences found" : "Type to search or pick a category"}
                      </p>
                    </div>
                  ) : (
                    Object.entries(groupedExperiences).map(([location, exps]) => (
                      <div key={location}>
                        <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 px-2 pt-2 pb-0.5">
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
                                  <span key={t} className="text-[10px] text-muted-foreground">#{t}</span>
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
                                  <Bookmark className="w-2.5 h-2.5" />{e.saves_count}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

function CityResultCard({
  city,
  selectedMonth,
  onClick,
}: {
  city: CityScore;
  selectedMonth?: number;
  onClick: () => void;
}) {
  const climateGrade = selectedMonth ? city.climate[selectedMonth] : null;
  const crowdLevel = selectedMonth ? city.crowdLevel[selectedMonth] : null;

  const scores = [
    { label: "Food", value: city.food },
    { label: "Nature", value: city.nature },
    { label: "Nightlife", value: city.nightlife },
    { label: "Culture", value: city.culture },
    { label: "Adventure", value: city.adventure },
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 2);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left group"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-primary">
          {city.cityName.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground truncate">{city.cityName}</span>
          <span className="text-xs text-muted-foreground truncate">{city.country}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">{budgetLabels[city.budget]}</span>
          {climateGrade && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className={`text-xs font-medium ${climateGradeColor[climateGrade]}`}>Climate {climateGrade}</span>
            </>
          )}
          {crowdLevel && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="text-xs text-muted-foreground capitalize">{crowdLevel} crowds</span>
            </>
          )}
          <span className="text-muted-foreground/30">·</span>
          {scores.map((s, i) => (
            <span key={s.label} className="flex items-center gap-0.5 text-xs text-muted-foreground">
              {i > 0 && <span className="text-muted-foreground/30 mx-0.5">·</span>}
              {s.label} <Star className="w-2.5 h-2.5 text-gold fill-gold inline" /> {s.value.toFixed(1)}
            </span>
          ))}
        </div>
      </div>
      <div className="flex-shrink-0 hidden sm:block">
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            city.safety === "very_safe"
              ? "bg-green-100 text-green-700"
              : city.safety === "generally_safe"
              ? "bg-amber-50 text-amber-600"
              : "bg-red-50 text-red-500"
          }`}
        >
          <Shield className="w-2.5 h-2.5 inline mr-0.5" />
          {safetyLabels[city.safety]}
        </span>
      </div>
    </button>
  );
}

export default CityExploreBar;
