import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import {
  Star, MapPin, Globe, Trash2, ChevronDown, ChevronRight, Filter,
  Plus, Calendar, Plane, X, Camera, Loader2, Compass
} from "lucide-react";
import { usePlaces, useDeletePlace } from "@/hooks/usePlaces";
import type { Place } from "@/hooks/usePlaces";
import { useExperiencesWithPhotos, useDeleteExperience, ExperienceWithPhotos } from "@/hooks/useExperiences";
import { useJourneys, useAddJourney, useDeleteJourney, useJourneyWithExperiences, useAddExperienceToJourney, useRemoveExperienceFromJourney, Journey } from "@/hooks/useJourneys";
import ExperienceComposer from "@/components/ExperienceComposer";
import { toast } from "sonner";

const categoryEmoji: Record<string, string> = {
  Food: "🍽️", Culture: "🏛️", Nature: "🌿", Nightlife: "🌙", general: "📍",
};
const categoryFilters = ["All", "Food", "Culture", "Nature", "Nightlife"] as const;

interface VisitedDestinationNode {
  city: string;
  country: string;
  lat: number;
  lng: number;
  places: Place[];
  experiences: ExperienceWithPhotos[];
}

const Visited = () => {
  const { data: places = [] } = usePlaces();
  const deletePlace = useDeletePlace();
  const { data: experiences = [] } = useExperiencesWithPhotos();
  const deleteExperience = useDeleteExperience();
  const { data: journeys = [] } = useJourneys();
  const addJourney = useAddJourney();
  const deleteJourney = useDeleteJourney();

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedDestinations, setExpandedDestinations] = useState<Set<string>>(new Set());
  const [showComposer, setShowComposer] = useState(false);
  const [showJourneyCreate, setShowJourneyCreate] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"experiences" | "journeys">("experiences");

  // Journey create state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEmoji, setNewEmoji] = useState("✈️");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  const visitedPlaces = useMemo(() => places.filter((p) => p.type === "visited"), [places]);

  // Build destination hierarchy: Country → Destination (city) → places + experiences
  const hierarchy = useMemo(() => {
    const destMap = new Map<string, VisitedDestinationNode>();

    // Add visited places
    visitedPlaces.forEach((p) => {
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
      destMap.get(key)!.places.push(p);
    });

    // Add experiences (they may or may not have a matching place)
    experiences.forEach((e) => {
      const destinationName = e.city || "Unknown";
      const country = e.country || "Unknown";
      const key = `${country}||${destinationName}`;
      if (!destMap.has(key)) {
        destMap.set(key, {
          city: destinationName,
          country,
          lat: e.lat || 0,
          lng: e.lng || 0,
          places: [],
          experiences: [],
        });
      }
      destMap.get(key)!.experiences.push(e);
    });

    // Group by country
    const countryMap = new Map<string, VisitedDestinationNode[]>();
    destMap.forEach((dest) => {
      if (!countryMap.has(dest.country)) countryMap.set(dest.country, []);
      countryMap.get(dest.country)!.push(dest);
    });

    return Array.from(countryMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, dests]) => ({
        country,
        destinations: dests.sort((a, b) => a.city.localeCompare(b.city)),
      }));
  }, [visitedPlaces, experiences]);

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
  const totalItems = useMemo(() => {
    return filteredHierarchy.reduce((sum, c) =>
      sum + c.destinations.reduce((s, d) => {
        const subPlaces = d.places.filter(p => p.name.toLowerCase() !== d.city.toLowerCase());
        return s + subPlaces.length + d.experiences.length;
      }, 0), 0);
  }, [filteredHierarchy]);

  const totalDestinations = useMemo(() => {
    return filteredHierarchy.reduce((sum, c) => sum + c.destinations.length, 0);
  }, [filteredHierarchy]);

  // Auto-expand on load
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


  const handleCreateJourney = async () => {
    if (!newTitle.trim()) { toast.error("Add a title"); return; }
    try {
      await addJourney.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim(),
        emoji: newEmoji,
        start_date: newStartDate || undefined,
        end_date: newEndDate || undefined,
      });
      toast.success("Journey created!");
      setShowJourneyCreate(false);
      setNewTitle(""); setNewDescription(""); setNewEmoji("✈️"); setNewStartDate(""); setNewEndDate("");
    } catch { toast.error("Failed to create journey"); }
  };

  const handleDeletePlace = async (id: string, name: string) => {
    try {
      await deletePlace.mutateAsync(id);
      toast.success(`Removed ${name}`);
    } catch {
      toast.error("Failed to remove");
    }
  };

  const handleDeleteExp = (id: string) => {
    deleteExperience.mutate(id, {
      onSuccess: () => toast.success("Experience removed"),
      onError: () => toast.error("Failed to delete"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[76px] px-4 sm:px-6 pb-12 max-w-3xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-5 h-5 text-visited" />
                <h1 className="font-display text-2xl font-semibold text-foreground">Visited</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {totalItems > 0
                  ? `${totalItems} ${totalItems === 1 ? "experience" : "experiences"} across ${totalDestinations} ${totalDestinations === 1 ? "destination" : "destinations"} in ${filteredHierarchy.length} ${filteredHierarchy.length === 1 ? "country" : "countries"}`
                  : `${totalDestinations} ${totalDestinations === 1 ? "destination" : "destinations"} in ${filteredHierarchy.length} ${filteredHierarchy.length === 1 ? "country" : "countries"}`}
              </p>
            </div>
            <button
              onClick={() => setShowComposer(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </motion.div>

        {/* View toggle: Experiences / Journeys */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => { setViewMode("experiences"); setSelectedJourney(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              viewMode === "experiences" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Camera className="w-3 h-3 inline mr-1" /> Experiences
          </button>
          <button
            onClick={() => setViewMode("journeys")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              viewMode === "journeys" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plane className="w-3 h-3 inline mr-1" /> Journeys
          </button>
        </div>

        {viewMode === "experiences" ? (
          <>
            {/* Category tag filters */}
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

            {/* Destination hierarchy */}
            {filteredHierarchy.length === 0 ? (
              <div className="text-center py-20">
                <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {activeFilter !== "All" ? `No ${activeFilter} visited items yet.` : "No visited places yet."}
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Mark places as visited on the map to start building your travel memory!
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
                                <div className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border hover:border-visited/20 transition-all">
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
                                    <div className="w-7 h-7 rounded-md flex items-center justify-center bg-visited/10 text-visited flex-shrink-0">
                                      <Compass className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">{dest.city}</span>
                                    <span className="text-[11px] text-muted-foreground ml-auto">
                                      {itemCount > 0
                                        ? `${itemCount} ${itemCount === 1 ? "experience" : "experiences"}`
                                        : "destination visited"}
                                    </span>
                                  </button>
                                  {cityLevelPlace && (
                                    <button
                                      onClick={() => handleDeletePlace(cityLevelPlace.id, cityLevelPlace.name)}
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>

                                {/* Nested items */}
                                <AnimatePresence>
                                  {isExpanded && itemCount > 0 && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="pl-8 space-y-1 mt-1 overflow-hidden"
                                    >
                                      {/* Sub-places */}
                                      {subPlaces.map((place, pi) => (
                                        <motion.div
                                          key={place.id}
                                          initial={{ opacity: 0, x: -4 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: pi * 0.02 }}
                                          className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                                        >
                                          <MapPin className="w-3.5 h-3.5 text-visited flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-foreground truncate">{place.name}</p>
                                            {place.tags && place.tags.length > 0 && (
                                              <div className="flex gap-1 mt-0.5">
                                                {place.tags.slice(0, 3).map((tag) => (
                                                  <span key={tag} className="px-1.5 py-0.5 rounded-full bg-muted text-[9px] text-muted-foreground">{tag}</span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                          <button
                                            onClick={() => handleDeletePlace(place.id, place.name)}
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </motion.div>
                                      ))}

                                      {/* Experiences */}
                                      {dest.experiences.map((exp, ei) => (
                                        <motion.div
                                          key={exp.id}
                                          initial={{ opacity: 0, x: -4 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: (subPlaces.length + ei) * 0.02 }}
                                          className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group"
                                        >
                                          {exp.photos[0] ? (
                                            <img src={exp.photos[0]} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                          ) : (
                                            <span className="text-xs flex-shrink-0">{categoryEmoji[exp.category] || "📍"}</span>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-foreground truncate">{exp.title}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{exp.category}</span>
                                              {exp.rating > 0 && (
                                                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {exp.rating}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => handleDeleteExp(exp.id)}
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </motion.div>
                                      ))}
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
          </>
        ) : (
          /* Journeys view - embedded inside Visited */
          <>
            {selectedJourney ? (
              <JourneyDetail
                journeyId={selectedJourney}
                allExperiences={experiences}
                onBack={() => setSelectedJourney(null)}
                onDelete={(id) => {
                  deleteJourney.mutate(id, {
                    onSuccess: () => { toast.success("Journey deleted"); setSelectedJourney(null); },
                    onError: () => toast.error("Failed to delete"),
                  });
                }}
              />
            ) : (
              <>
                <button
                  onClick={() => setShowJourneyCreate(!showJourneyCreate)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors mb-4"
                >
                  <Plus className="w-4 h-4" /> New Journey
                </button>

                <AnimatePresence>
                  {showJourneyCreate && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mb-4"
                    >
                      <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display text-base font-semibold text-foreground">New Journey</h3>
                          <button onClick={() => setShowJourneyCreate(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <input value={newEmoji} onChange={e => setNewEmoji(e.target.value.slice(0, 2))}
                            className="w-12 text-center px-2 py-2.5 rounded-xl border border-border bg-background text-lg focus:outline-none focus:border-primary/40" />
                          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Greece Trip 2024"
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40" autoFocus />
                        </div>
                        <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description (optional)" rows={2}
                          className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none" />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">Start date</p>
                            <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/40" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground mb-1">End date</p>
                            <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/40" />
                          </div>
                        </div>
                        <button onClick={handleCreateJourney} disabled={!newTitle.trim() || addJourney.isPending}
                          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90">
                          {addJourney.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Journey"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {journeys.length === 0 ? (
                  <div className="text-center py-16">
                    <Plane className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No journeys yet</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Group your visited experiences into trips</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {journeys.map((j, i) => (
                      <motion.button
                        key={j.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => setSelectedJourney(j.id)}
                        className="w-full p-4 rounded-2xl bg-card border border-border hover:border-primary/10 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{j.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-foreground truncate">{j.title}</h3>
                            {j.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{j.description}</p>}
                            {(j.start_date || j.end_date) && (
                              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {j.start_date ? new Date(j.start_date).toLocaleDateString() : ""}
                                {j.start_date && j.end_date ? " – " : ""}
                                {j.end_date ? new Date(j.end_date).toLocaleDateString() : ""}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <ExperienceComposer open={showComposer} onClose={() => setShowComposer(false)} />
    </div>
  );
};

/* Journey detail with timeline — reused from old Journeys page */
const JourneyDetail = ({
  journeyId, allExperiences, onBack, onDelete,
}: {
  journeyId: string;
  allExperiences: ExperienceWithPhotos[];
  onBack: () => void;
  onDelete: (id: string) => void;
}) => {
  const { data: journey, isLoading } = useJourneyWithExperiences(journeyId);
  const addExpToJourney = useAddExperienceToJourney();
  const removeExpFromJourney = useRemoveExperienceFromJourney();
  const [showAddExp, setShowAddExp] = useState(false);

  if (isLoading || !journey) {
    return <div className="text-center py-12"><div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" /></div>;
  }

  const linkedIds = new Set(journey.experiences.map(e => e.id));
  const available = allExperiences.filter(e => !linkedIds.has(e.id));

  const handleAdd = (expId: string) => {
    addExpToJourney.mutate({ journeyId, experienceId: expId }, {
      onSuccess: () => toast.success("Experience added to journey"),
      onError: () => toast.error("Failed to add"),
    });
  };

  const handleRemove = (expId: string) => {
    removeExpFromJourney.mutate({ journeyId, experienceId: expId }, {
      onSuccess: () => toast.success("Removed from journey"),
      onError: () => toast.error("Failed to remove"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">← Back</button>
        <button onClick={() => onDelete(journeyId)} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{journey.emoji}</span>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">{journey.title}</h2>
            {journey.description && <p className="text-sm text-muted-foreground">{journey.description}</p>}
          </div>
        </div>
        {(journey.start_date || journey.end_date) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {journey.start_date ? new Date(journey.start_date).toLocaleDateString() : ""}
            {journey.start_date && journey.end_date ? " – " : ""}
            {journey.end_date ? new Date(journey.end_date).toLocaleDateString() : ""}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">{journey.experiences.length} experience{journey.experiences.length !== 1 ? "s" : ""}</p>
      </div>

      <button onClick={() => setShowAddExp(!showAddExp)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors">
        <Plus className="w-4 h-4" /> Add Experience
      </button>

      <AnimatePresence>
        {showAddExp && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-3 rounded-2xl bg-muted/30 border border-border space-y-2 max-h-[300px] overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground px-1">Select experiences to add:</p>
              {available.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">All experiences already added</p>
              ) : (
                available.map(exp => (
                  <button key={exp.id} onClick={() => handleAdd(exp.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-card/80 transition-colors text-left">
                    {exp.photos[0] ? (
                      <img src={exp.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{exp.title}</p>
                      <p className="text-[10px] text-muted-foreground">{exp.city}{exp.country ? `, ${exp.country}` : ""} · {exp.category}</p>
                    </div>
                    <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {journey.experiences.length === 0 ? (
        <div className="text-center py-8"><p className="text-sm text-muted-foreground">No experiences in this journey yet</p></div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
          {journey.experiences.map((exp, i) => (
            <motion.div key={exp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="relative pl-12 pb-6">
              <div className="absolute left-[14px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
              <div className="rounded-2xl bg-card border border-border overflow-hidden">
                {exp.photos.length > 0 && <img src={exp.photos[0]} alt="" className="w-full h-32 object-cover" />}
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{exp.title}</h4>
                      {exp.city && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" /> {exp.city}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {exp.rating > 0 && (
                        <span className="flex items-center gap-0.5">
                          {[...Array(exp.rating)].map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          ))}
                        </span>
                      )}
                      <button onClick={() => handleRemove(exp.id)}
                        className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  {exp.caption && <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{exp.caption}</p>}
                  {exp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {exp.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-[9px] font-medium text-primary">{tag}</span>
                      ))}
                    </div>
                  )}
                  {exp.experience_date && <p className="text-[9px] text-muted-foreground mt-1.5">{new Date(exp.experience_date).toLocaleDateString()}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Visited;
