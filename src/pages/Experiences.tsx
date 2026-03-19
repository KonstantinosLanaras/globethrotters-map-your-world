import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import {
  MapPin, Globe, Search, Star, Image, Camera, Plus, X,
  Heart, Award, TrendingUp, Users, SlidersHorizontal,
  Trash2, Check, Share2,
  Utensils, Landmark, TreePine, Mountain, Moon, Compass, Building2, Gem, Home
} from "lucide-react";
import ShareModal, { ShareableItem } from "@/components/ShareModal";
import { useExperiencesWithPhotos, useDeleteExperience, ExperienceWithPhotos } from "@/hooks/useExperiences";
import { useExperienceLocations, useDiscoverExperiences, DiscoverExperience } from "@/hooks/useDiscoverExperiences";
import ExperienceComposer from "@/components/ExperienceComposer";
import { toast } from "sonner";

const ACTIVITY_FILTERS = [
  { id: "food", label: "Food", icon: Utensils, emoji: "🍽️" },
  { id: "culture", label: "Culture", icon: Landmark, emoji: "🏛️" },
  { id: "nature", label: "Nature", icon: TreePine, emoji: "🌿" },
  { id: "hike", label: "Hiking", icon: Mountain, emoji: "🥾" },
  { id: "nightlife", label: "Nightlife", icon: Moon, emoji: "🌙" },
  { id: "beach", label: "Beach", icon: Compass, emoji: "🏖️" },
  { id: "museum", label: "Museum", icon: Building2, emoji: "🎨" },
  { id: "hidden_gem", label: "Hidden Gem", icon: Gem, emoji: "💎" },
  { id: "stay", label: "Stay", icon: Home, emoji: "🏨" },
];

const sortOptions = [
  { id: "recent" as const, label: "Recent" },
  { id: "rating" as const, label: "Top Rated" },
  { id: "helpful" as const, label: "Most Helpful" },
  { id: "engagement" as const, label: "Popular" },
];

const Experiences = () => {
  const { data: myExperiences = [], isLoading: myLoading } = useExperiencesWithPhotos();
  const deleteExperience = useDeleteExperience();
  const { data: locations } = useExperienceLocations();
  const [showComposer, setShowComposer] = useState(false);
  const [shareItem, setShareItem] = useState<ShareableItem | null>(null);

  const [viewMode, setViewMode] = useState<"mine" | "discover">("discover");

  // Filters
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [withPhotos, setWithPhotos] = useState(false);
  const [connectionsOnly, setConnectionsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "rating" | "helpful" | "engagement">("recent");

  // UI state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showPlacePicker, setShowPlacePicker] = useState(true);
  const [placeSearch, setPlaceSearch] = useState("");

  const hasPlaceSelected = !!(selectedCountry || selectedCity);
  const hasAnyFilter = hasPlaceSelected || selectedActivities.length > 0 || searchQuery.length > 0;
  const activeFilterCount = (selectedCountry ? 1 : 0) + (selectedCity ? 1 : 0) + selectedActivities.length + (minRating > 0 ? 1 : 0) + (withPhotos ? 1 : 0) + (connectionsOnly ? 1 : 0);

  const { data: discoveredExperiences = [], isLoading: discoverLoading } = useDiscoverExperiences({
    country: selectedCountry,
    city: selectedCity,
    category: null,
    categories: selectedActivities,
    minRating,
    withPhotos,
    sortBy,
    connectionsOnly,
    searchQuery,
  });

  const filteredCountries = useMemo(() => {
    if (!locations) return [];
    const q = placeSearch.toLowerCase();
    if (!q) return locations.countries;
    return locations.countries.filter(c =>
      c.toLowerCase().includes(q) ||
      (locations.citiesByCountry[c] || []).some(ci => ci.toLowerCase().includes(q))
    );
  }, [locations, placeSearch]);

  const availableCities = useMemo(() => {
    if (!selectedCountry || !locations) return [];
    return locations.citiesByCountry[selectedCountry] || [];
  }, [selectedCountry, locations]);

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    setSelectedCity(null);
    setPlaceSearch("");
    const cities = locations?.citiesByCountry[country] || [];
    if (cities.length === 1) {
      setSelectedCity(cities[0]);
      setShowPlacePicker(false);
    }
  };

  const handleSelectCity = (city: string) => {
    setSelectedCity(city);
    setShowPlacePicker(false);
  };

  const clearPlace = () => {
    setSelectedCountry(null);
    setSelectedCity(null);
    setShowPlacePicker(true);
    setPlaceSearch("");
  };

  const toggleActivity = (id: string) => {
    setSelectedActivities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const clearAllFilters = () => {
    setSelectedCountry(null);
    setSelectedCity(null);
    setSelectedActivities([]);
    setSearchQuery("");
    setMinRating(0);
    setWithPhotos(false);
    setConnectionsOnly(false);
    setShowPlacePicker(true);
    setPlaceSearch("");
  };

  const handleDelete = (id: string) => {
    deleteExperience.mutate(id, {
      onSuccess: () => toast.success("Experience removed"),
      onError: () => toast.error("Failed to delete"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[80px] px-4 pb-12 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Experiences</h1>
            <p className="text-sm text-muted-foreground">Discover what travelers have done</p>
          </div>
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* View toggle */}
        <div className="flex gap-0.5 mb-4 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("discover")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              viewMode === "discover" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Discover
          </button>
          <button
            onClick={() => setViewMode("mine")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              viewMode === "mine" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            My Experiences
          </button>
        </div>

        {viewMode === "discover" ? (
          <>
            {/* ═══════ SEARCH BAR + FILTER TOGGLE ═══════ */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search experiences..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  showFilterPanel || activeFilterCount > 0
                    ? "border-primary/30 bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && !showFilterPanel && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedCountry && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Globe className="w-3 h-3" /> {selectedCountry}
                    <button onClick={() => { setSelectedCountry(null); setSelectedCity(null); }}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedCity && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <MapPin className="w-3 h-3" /> {selectedCity}
                    <button onClick={() => setSelectedCity(null)}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {selectedActivities.map(a => {
                  const af = ACTIVITY_FILTERS.find(f => f.id === a);
                  return (
                    <span key={a} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {af?.emoji} {af?.label}
                      <button onClick={() => toggleActivity(a)}><X className="w-3 h-3" /></button>
                    </span>
                  );
                })}
                {minRating > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Star className="w-3 h-3" /> {minRating}+
                    <button onClick={() => setMinRating(0)}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {withPhotos && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Image className="w-3 h-3" /> Photos
                    <button onClick={() => setWithPhotos(false)}><X className="w-3 h-3" /></button>
                  </span>
                )}
                {connectionsOnly && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    <Users className="w-3 h-3" /> Connections
                    <button onClick={() => setConnectionsOnly(false)}><X className="w-3 h-3" /></button>
                  </span>
                )}
                <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline">
                  Clear all
                </button>
              </div>
            )}

            {/* ═══════ FILTER PANEL ═══════ */}
            <AnimatePresence>
              {showFilterPanel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl bg-card border border-border mb-4 overflow-hidden">
                    <div className="max-h-[60vh] overflow-y-auto p-4 space-y-5">

                      {/* Section 1: Location */}
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" /> Location
                        </h4>

                        {/* Selected location display */}
                        {hasPlaceSelected && (
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/15 mb-2">
                            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground flex-1">
                              {selectedCity ? `${selectedCity}, ${selectedCountry}` : selectedCountry}
                            </span>
                            <button onClick={() => { setShowPlacePicker(true); }} className="text-xs text-primary font-medium hover:underline">Change</button>
                            <button onClick={clearPlace} className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                              <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        )}

                        {/* Place picker inline */}
                        {(!hasPlaceSelected || showPlacePicker) && (
                          <div>
                            <div className="relative mb-2">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <input
                                value={placeSearch}
                                onChange={(e) => setPlaceSearch(e.target.value)}
                                placeholder={selectedCountry ? "Search cities..." : "Search countries or cities..."}
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                              />
                            </div>
                            <div className="max-h-[160px] overflow-y-auto space-y-0.5">
                              {!selectedCountry ? (
                                filteredCountries.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-3">No destinations found</p>
                                ) : (
                                  filteredCountries.map(country => {
                                    const cities = locations?.citiesByCountry[country] || [];
                                    return (
                                      <button
                                        key={country}
                                        onClick={() => handleSelectCountry(country)}
                                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                                      >
                                        <div className="flex items-center gap-2">
                                          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                                          <span className="text-sm font-medium text-foreground">{country}</span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{cities.length} cities</span>
                                      </button>
                                    );
                                  })
                                )
                              ) : (
                                <>
                                  <button
                                    onClick={() => { setSelectedCity(null); setShowPlacePicker(false); }}
                                    className="w-full flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 text-left"
                                  >
                                    <Globe className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-sm font-medium text-foreground">All of {selectedCountry}</span>
                                  </button>
                                  {availableCities
                                    .filter(c => !placeSearch || c.toLowerCase().includes(placeSearch.toLowerCase()))
                                    .map(city => (
                                      <button
                                        key={city}
                                        onClick={() => handleSelectCity(city)}
                                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors text-left ${
                                          selectedCity === city ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/60"
                                        }`}
                                      >
                                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">{city}</span>
                                      </button>
                                    ))}
                                  <button
                                    onClick={() => { setSelectedCountry(null); setSelectedCity(null); setPlaceSearch(""); }}
                                    className="text-xs text-muted-foreground hover:text-foreground mt-1"
                                  >
                                    ← All countries
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-border" />

                      {/* Section 2: Activity Type */}
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5" /> Activity Type
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {ACTIVITY_FILTERS.map(af => {
                            const isActive = selectedActivities.includes(af.id);
                            const Icon = af.icon;
                            return (
                              <button
                                key={af.id}
                                onClick={() => toggleActivity(af.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  isActive
                                    ? "border-primary/30 bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {af.label}
                                {isActive && <Check className="w-3 h-3" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="h-px bg-border" />

                      {/* Section 3: Additional Filters */}
                      <div>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5" /> Additional Filters
                        </h4>

                        {/* Min rating */}
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1.5">Minimum Rating</p>
                          <div className="flex gap-1.5">
                            {[0, 1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                onClick={() => setMinRating(n)}
                                className={`flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                  minRating === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {n === 0 ? "Any" : <><Star className="w-3 h-3" /> {n}+</>}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Toggle options */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setWithPhotos(!withPhotos)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              withPhotos ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                            }`}
                          >
                            <Image className="w-3 h-3" />
                            With photos
                            {withPhotos && <Check className="w-3 h-3" />}
                          </button>
                          <button
                            onClick={() => setConnectionsOnly(!connectionsOnly)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              connectionsOnly ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"
                            }`}
                          >
                            <Users className="w-3 h-3" />
                            Connections only
                            {connectionsOnly && <Check className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Panel footer */}
                    <div className="flex items-center justify-between p-3 border-t border-border bg-muted/30">
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </button>
                      <div className="flex items-center gap-2">
                        {/* Sort */}
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none"
                        >
                          {sortOptions.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setShowFilterPanel(false)}
                          className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sort row (when filter panel is closed) */}
            {!showFilterPanel && hasAnyFilter && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">
                  {discoveredExperiences.length} result{discoveredExperiences.length !== 1 ? "s" : ""}
                </p>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none"
                >
                  {sortOptions.map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ═══════ RESULTS ═══════ */}
            {!hasAnyFilter ? (
              <div className="text-center py-16">
                <Globe className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="font-display text-lg font-medium text-foreground mb-2">Start exploring</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
                  Use the filters above to discover experiences by country, city, or activity type.
                </p>
                <button
                  onClick={() => setShowFilterPanel(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Open Filters
                </button>
              </div>
            ) : discoverLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : discoveredExperiences.length === 0 ? (
              <div className="text-center py-16">
                <Camera className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display text-lg font-medium text-foreground mb-2">No experiences found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your filters or be the first to share
                </p>
                <button
                  onClick={() => setShowComposer(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Experience
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {discoveredExperiences.map(exp => (
                  <DiscoverCard key={exp.id} exp={exp} onShare={setShareItem} />
                ))}
              </div>
            )}
          </>
        ) : (
          /* ═══════ MY EXPERIENCES ═══════ */
          <>
            {myLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : myExperiences.length === 0 ? (
              <div className="text-center py-16">
                <Camera className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display text-lg font-medium text-foreground mb-2">No experiences yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your first travel experience</p>
                <button
                  onClick={() => setShowComposer(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Experience
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myExperiences.map(exp => (
                  <MyExperienceCard key={exp.id} exp={exp} onDelete={handleDelete} onShare={setShareItem} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ExperienceComposer open={showComposer} onClose={() => setShowComposer(false)} />
    </div>
  );
};

/* ── Discover Experience Card ── */
const DiscoverCard = ({ exp }: { exp: DiscoverExperience }) => {
  const [showGallery, setShowGallery] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border hover:border-primary/10 transition-colors overflow-hidden"
    >
      {exp.photos.length > 0 && (
        <div className="relative cursor-pointer" onClick={() => setShowGallery(!showGallery)}>
          {exp.photos.length === 1 ? (
            <img src={exp.photos[0]} alt="" className="w-full h-44 object-cover" />
          ) : (
            <div className="grid grid-cols-2 gap-0.5 h-44">
              <img src={exp.photos[0]} alt="" className="w-full h-full object-cover" />
              <div className="relative">
                <img src={exp.photos[1]} alt="" className="w-full h-full object-cover" />
                {exp.photos.length > 2 && (
                  <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-medium">+{exp.photos.length - 2}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {showGallery && exp.photos.length > 2 && (
        <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-0.5">
          {exp.photos.slice(2).map((url, i) => <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />)}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-semibold text-foreground">{exp.title}</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              by {exp.author_name} · {exp.city}{exp.country ? `, ${exp.country}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {exp.rating > 0 && (
              <span className="flex items-center gap-0.5 text-xs">
                {[...Array(Math.min(exp.rating, 5))].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground capitalize">
              {exp.category.replace("_", " ")}
            </span>
          </div>
        </div>
        {exp.caption && <p className="text-sm text-foreground/80 mt-1.5 leading-relaxed line-clamp-2">{exp.caption}</p>}
        {exp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {exp.tags.slice(0, 5).map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary">{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          {exp.saves_count > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Heart className="w-3 h-3" /> {exp.saves_count} save{exp.saves_count !== 1 ? "s" : ""}
            </span>
          )}
          {exp.rating_avg >= 4 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
              <Award className="w-3 h-3" /> Highly rated
            </span>
          )}
          {exp.engagement_score >= 50 && (
            <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
              <TrendingUp className="w-3 h-3" /> Popular
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ── My Experience Card ── */
const MyExperienceCard = ({ exp, onDelete }: { exp: ExperienceWithPhotos; onDelete: (id: string) => void }) => {
  const [showGallery, setShowGallery] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border hover:border-primary/10 transition-colors overflow-hidden"
    >
      {exp.photos.length > 0 && (
        <div className="relative cursor-pointer" onClick={() => setShowGallery(!showGallery)}>
          {exp.photos.length === 1 ? (
            <img src={exp.photos[0]} alt="" className="w-full h-48 object-cover" />
          ) : (
            <div className="grid grid-cols-2 gap-0.5 h-48">
              <img src={exp.photos[0]} alt="" className="w-full h-full object-cover" />
              <div className="relative">
                <img src={exp.photos[1]} alt="" className="w-full h-full object-cover" />
                {exp.photos.length > 2 && (
                  <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-medium">+{exp.photos.length - 2}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {showGallery && exp.photos.length > 2 && (
        <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-0.5">
          {exp.photos.slice(2).map((url, i) => <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />)}
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-display text-base font-semibold text-foreground">{exp.title}</h3>
            {exp.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {exp.city}{exp.country ? `, ${exp.country}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {exp.rating > 0 && (
              <span className="flex items-center gap-0.5 text-xs">
                {[...Array(exp.rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground capitalize">{exp.category}</span>
          </div>
        </div>
        {exp.caption && <p className="text-sm text-foreground/80 leading-relaxed">{exp.caption}</p>}
        {exp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {exp.tags.map(tag => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary">{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          {exp.experience_date && (
            <p className="text-[10px] text-muted-foreground">{new Date(exp.experience_date).toLocaleDateString()}</p>
          )}
          <button
            onClick={() => onDelete(exp.id)}
            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-0.5"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Experiences;
