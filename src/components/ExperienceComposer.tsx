import { useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Camera, Globe, Users, Lock, Eye, Loader2, Star,
  ChevronLeft, ChevronRight, Image, Upload, Trash2, Search, Sparkles,
  Mountain, Landmark, Map as MapIcon, Plus
} from "lucide-react";
import { useAddExperience, useAddAttachment } from "@/hooks/useExperiences";
import { useAuth } from "@/hooks/useAuth";
import { useAddPlace } from "@/hooks/usePlaces";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { worldCities } from "@/data/cities";
import { toast } from "sonner";

type EntryType = "experience" | "place" | "city" | "region";

const entryTypes: { id: EntryType; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "experience", label: "Experience", icon: <Sparkles className="w-4 h-4" />, desc: "Something you did" },
  { id: "place", label: "Place", icon: <MapPin className="w-4 h-4" />, desc: "A specific spot" },
  { id: "city", label: "City", icon: <Landmark className="w-4 h-4" />, desc: "A destination city" },
  { id: "region", label: "Region", icon: <Mountain className="w-4 h-4" />, desc: "Island, coast, park" },
];

const categories = [
  { id: "food", label: "Food", emoji: "🍽️" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "nightlife", label: "Nightlife", emoji: "🌙" },
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "museum", label: "Museum", emoji: "🎨" },
  { id: "city_walk", label: "City Walk", emoji: "🚶" },
  { id: "hidden_gem", label: "Hidden Gem", emoji: "💎" },
  { id: "hotel", label: "Stay", emoji: "🏨" },
  { id: "general", label: "Other", emoji: "📍" },
];

const predefinedTags = [
  "Great food", "Overcrowded", "Beautiful", "Expensive", "Hidden gem",
  "Worth the hype", "Peaceful", "Family-friendly", "Instagram spot",
  "Local favorite", "Budget-friendly", "Romantic", "Adventurous",
  "Overrated", "Must-visit", "Unique experience", "Scenic views",
  "Good for solo", "Night vibes", "Cultural immersion",
];

const visibilityOptions = [
  { id: "public", label: "Public", icon: <Globe className="w-3.5 h-3.5" />, desc: "Anyone can see" },
  { id: "followers", label: "Followers", icon: <Users className="w-3.5 h-3.5" />, desc: "Only followers" },
  { id: "close_friends", label: "Close Friends", icon: <Eye className="w-3.5 h-3.5" />, desc: "Close friends only" },
  { id: "private", label: "Only Me", icon: <Lock className="w-3.5 h-3.5" />, desc: "Private" },
];

const STEPS = ["place", "category", "rating", "tags", "photos", "note"] as const;
type Step = (typeof STEPS)[number];

interface ExperienceComposerProps {
  open: boolean;
  onClose: () => void;
  defaultCity?: string;
  defaultCountry?: string;
}

interface SuggestionItem {
  id: string;
  title: string;
  category?: string;
  city?: string | null;
  country?: string | null;
  rating?: number | null;
  source: "experience" | "place" | "city";
  lat?: number;
  lng?: number;
}

const ExperienceComposer = ({ open, onClose, defaultCity, defaultCountry }: ExperienceComposerProps) => {
  const { user } = useAuth();
  const addExperience = useAddExperience();
  const addAttachment = useAddAttachment();
  const addPlace = useAddPlace();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Entry type
  const [entryType, setEntryType] = useState<EntryType>("experience");

  // Step 1 state
  const [step, setStep] = useState<Step>("place");
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [city, setCity] = useState(defaultCity || "");
  const [country, setCountry] = useState(defaultCountry || "");
  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionItem | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  // Rest of steps
  const [category, setCategory] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [experienceDate, setExperienceDate] = useState("");
  const [uploading, setUploading] = useState(false);

  const currentStepIdx = STEPS.indexOf(step);

  // Fetch existing experiences for autocomplete
  const { data: existingExperiences = [] } = useQuery({
    queryKey: ["autocomplete-experiences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("id, title, category, city, country, rating")
        .eq("visibility", "public")
        .order("engagement_score", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch user's existing places
  const { data: existingPlaces = [] } = useQuery({
    queryKey: ["autocomplete-places", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("id, name, country, city, lat, lng, type")
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!user,
  });

  // Build suggestions
  const suggestions = useMemo((): SuggestionItem[] => {
    const q = searchQuery.toLowerCase().trim();
    if (!q || q.length < 2) return [];

    const results: SuggestionItem[] = [];

    if (entryType === "experience") {
      existingExperiences
        .filter(e => e.title.toLowerCase().includes(q) || e.city?.toLowerCase().includes(q) || e.country?.toLowerCase().includes(q))
        .slice(0, 6)
        .forEach(e => results.push({
          id: e.id,
          title: e.title,
          category: e.category,
          city: e.city,
          country: e.country,
          rating: e.rating,
          source: "experience",
        }));
    }

    if (entryType === "place") {
      existingPlaces
        .filter(p => p.name.toLowerCase().includes(q) || p.country?.toLowerCase().includes(q))
        .slice(0, 6)
        .forEach(p => results.push({
          id: p.id,
          title: p.name,
          city: p.city,
          country: p.country,
          source: "place",
          lat: p.lat,
          lng: p.lng,
        }));
    }

    if (entryType === "city" || entryType === "region") {
      const typeFilter = entryType === "city"
        ? (c: typeof worldCities[0]) => !c.type || c.type === "city"
        : (c: typeof worldCities[0]) => c.type && c.type !== "city";

      worldCities
        .filter(c => typeFilter(c) && (c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)))
        .slice(0, 8)
        .forEach(c => results.push({
          id: `city-${c.name}-${c.country}`,
          title: c.name,
          country: c.country,
          source: "city",
          lat: c.lat,
          lng: c.lng,
        }));
    }

    return results;
  }, [searchQuery, entryType, existingExperiences, existingPlaces]);

  // Duplicate detection for custom creation
  const possibleDuplicates = useMemo(() => {
    if (!isCustom || !searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return suggestions.filter(s =>
      s.title.toLowerCase().includes(q) || q.includes(s.title.toLowerCase())
    ).slice(0, 3);
  }, [isCustom, searchQuery, suggestions]);

  const resetForm = () => {
    setStep("place");
    setEntryType("experience");
    setTitle("");
    setSearchQuery("");
    setCity(defaultCity || "");
    setCountry(defaultCountry || "");
    setSelectedSuggestion(null);
    setIsCustom(false);
    setShowDropdown(false);
    setCustomCategory("");
    setCategory("");
    setRating(0);
    setHoverRating(0);
    setSelectedTags([]);
    setPhotos([]);
    setPhotoPreviewUrls([]);
    setCaption("");
    setVisibility("private");
    setExperienceDate("");
  };

  const handleSelectSuggestion = useCallback((item: SuggestionItem) => {
    setSelectedSuggestion(item);
    setTitle(item.title);
    setSearchQuery(item.title);
    setShowDropdown(false);
    setIsCustom(false);
    if (item.city) setCity(item.city);
    if (item.country) setCountry(item.country);
    if (item.category) setCategory(item.category);
  }, []);

  const handleCreateCustom = useCallback(() => {
    setIsCustom(true);
    setTitle(searchQuery.trim());
    setShowDropdown(false);
    setSelectedSuggestion(null);
  }, [searchQuery]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    const remaining = 5 - photos.length;
    const newFiles = Array.from(files).slice(0, remaining);
    const newUrls = newFiles.map(f => URL.createObjectURL(f));
    setPhotos(prev => [...prev, ...newFiles]);
    setPhotoPreviewUrls(prev => [...prev, ...newUrls]);
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(photoPreviewUrls[idx]);
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const canProceed = (): boolean => {
    switch (step) {
      case "place": {
        if (entryType === "city" || entryType === "region") {
          return !!title.trim();
        }
        if (isCustom) {
          return !!title.trim() && !!city.trim();
        }
        return (!!selectedSuggestion || (!!title.trim() && !!city.trim()));
      }
      case "category": return !!category;
      case "rating": return rating > 0;
      default: return true;
    }
  };

  const getSteps = (): readonly Step[] => {
    if (entryType === "city" || entryType === "region") {
      // Cities/regions skip category, rating, tags, photos — just note
      return ["place", "note"] as const;
    }
    return STEPS;
  };

  const activeSteps = getSteps();
  const activeStepIdx = activeSteps.indexOf(step);

  const nextStep = () => {
    if (activeStepIdx < activeSteps.length - 1) setStep(activeSteps[activeStepIdx + 1]);
  };

  const prevStep = () => {
    if (activeStepIdx > 0) setStep(activeSteps[activeStepIdx - 1]);
  };

  const uploadPhotos = async (experienceId: string): Promise<string[]> => {
    if (!user || photos.length === 0) return [];
    const urls: string[] = [];
    for (const photo of photos) {
      const ext = photo.name.split(".").pop() || "jpg";
      const path = `${user.id}/${experienceId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("experience-photos")
        .upload(path, photo, { contentType: photo.type });
      if (error) {
        console.error("Upload error:", error);
        continue;
      }
      const { data: urlData } = supabase.storage
        .from("experience-photos")
        .getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async () => {
    setUploading(true);
    try {
      if (entryType === "city" || entryType === "region") {
        // Save as a place/destination
        const matchedCity = worldCities.find(c => c.name.toLowerCase() === title.toLowerCase());
        await addPlace.mutateAsync({
          name: title.trim(),
          country: country.trim() || matchedCity?.country || "",
          city: title.trim(),
          lat: matchedCity?.lat || 0,
          lng: matchedCity?.lng || 0,
          type: "visited",
          tags: selectedTags,
          rating: 0,
          notes: caption.trim(),
          date_visited: experienceDate || null,
        });
        toast.success(`${entryType === "city" ? "City" : "Region"} saved!`);
      } else {
        // Experience or Place → save as experience
        if (!title.trim() || !category || rating === 0) {
          toast.error("Please complete all required fields");
          setUploading(false);
          return;
        }
        const exp = await addExperience.mutateAsync({
          title: title.trim(),
          caption: caption.trim() || null,
          city: city.trim() || null,
          country: country.trim() || null,
          category,
          visibility,
          tags: selectedTags,
          experience_date: experienceDate || null,
          lat: selectedSuggestion?.lat || null,
          lng: selectedSuggestion?.lng || null,
          rating,
        });

        const photoUrls = await uploadPhotos(exp.id);
        for (const url of photoUrls) {
          await addAttachment.mutateAsync({
            experience_id: exp.id,
            attachment_type: "photo",
            url,
            title: null,
            thumbnail_url: null,
          });
        }
        toast.success("Experience saved!");
      }
      resetForm();
      onClose();
    } catch {
      toast.error("Failed to save");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  const stepLabels: Record<Step, string> = {
    place: "What are you adding?",
    category: "What type?",
    rating: "How was it?",
    tags: "Describe it",
    photos: "Add photos",
    note: "Final details",
  };

  const searchPlaceholder: Record<EntryType, string> = {
    experience: "Search experiences (e.g. Dinner at Taverna Kos)",
    place: "Search places (e.g. Seoul Tower)",
    city: "Search cities (e.g. Seoul, Paris)",
    region: "Search regions (e.g. Santorini, Tuscany)",
  };

  const categoryEmoji: Record<string, string> = {
    food: "🍽️", culture: "🏛️", nature: "🌿", hike: "🥾", nightlife: "🌙",
    beach: "🏖️", museum: "🎨", city_walk: "🚶", hidden_gem: "💎", hotel: "🏨", general: "📍",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {stepLabels[step]}
              </h2>
              <span className="text-xs text-muted-foreground">
                {activeStepIdx + 1}/{activeSteps.length}
              </span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${((activeStepIdx + 1) / activeSteps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === "place" && (
                  <div className="space-y-4">
                    {/* Type selector */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {entryTypes.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setEntryType(t.id);
                            setSelectedSuggestion(null);
                            setIsCustom(false);
                            setSearchQuery("");
                            setTitle("");
                          }}
                          className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all ${
                            entryType === t.id
                              ? "bg-primary/10 border-2 border-primary/30 text-primary"
                              : "bg-muted/30 border-2 border-transparent text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          {t.icon}
                          <span className="text-[10px] font-semibold">{t.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Smart search */}
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowDropdown(true);
                            setSelectedSuggestion(null);
                            setIsCustom(false);
                          }}
                          onFocus={() => setShowDropdown(true)}
                          placeholder={searchPlaceholder[entryType]}
                          className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-background text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                          autoFocus
                        />
                      </div>

                      {/* Autocomplete dropdown */}
                      <AnimatePresence>
                        {showDropdown && searchQuery.trim().length >= 2 && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-xl z-10 max-h-[240px] overflow-y-auto"
                          >
                            {suggestions.length > 0 ? (
                              <div className="py-1">
                                {suggestions.map((item) => (
                                  <button
                                    key={item.id}
                                    onClick={() => handleSelectSuggestion(item)}
                                    className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/50 text-left transition-colors"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                      {item.source === "experience" && (
                                        <span className="text-sm">{categoryEmoji[item.category || "general"]}</span>
                                      )}
                                      {item.source === "place" && <MapPin className="w-3.5 h-3.5 text-muted-foreground" />}
                                      {item.source === "city" && <Landmark className="w-3.5 h-3.5 text-muted-foreground" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {item.category && <span className="capitalize">{item.category} · </span>}
                                        {[item.city, item.country].filter(Boolean).join(", ")}
                                      </p>
                                    </div>
                                    {item.rating && item.rating > 0 && (
                                      <div className="flex items-center gap-0.5 flex-shrink-0">
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        <span className="text-[10px] font-medium text-foreground">{item.rating}</span>
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                                No matches found
                              </div>
                            )}

                            {/* Create custom */}
                            <div className="border-t border-border">
                              <button
                                onClick={handleCreateCustom}
                                className="w-full flex items-center gap-2.5 px-3.5 py-3 hover:bg-primary/5 text-left transition-colors"
                              >
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <Plus className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-primary">
                                    Create "{searchQuery.trim()}" as custom
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    Add a new {entryType}
                                  </p>
                                </div>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Selected / Custom badge */}
                    {selectedSuggestion && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/15">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{selectedSuggestion.title}</p>
                          <p className="text-[10px] text-muted-foreground">Linked to existing record</p>
                        </div>
                        <button
                          onClick={() => { setSelectedSuggestion(null); setSearchQuery(""); setTitle(""); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {isCustom && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gold/5 border border-gold/15">
                          <div className="w-7 h-7 rounded-lg bg-gold/10 flex items-center justify-center flex-shrink-0">
                            <Plus className="w-3.5 h-3.5 text-gold" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">Custom {entryType}</p>
                            <p className="text-[10px] text-muted-foreground">Creating new entry</p>
                          </div>
                          <button
                            onClick={() => { setIsCustom(false); setShowDropdown(true); }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Duplicate warning */}
                        {possibleDuplicates.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mb-1.5">Did you mean one of these?</p>
                            {possibleDuplicates.map(d => (
                              <button
                                key={d.id}
                                onClick={() => handleSelectSuggestion(d)}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/20 text-xs text-foreground transition-colors"
                              >
                                {d.title} <span className="text-muted-foreground">· {[d.city, d.country].filter(Boolean).join(", ")}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Inline category for custom experience/place */}
                        {(entryType === "experience" || entryType === "place") && (
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Category</p>
                            <div className="flex flex-wrap gap-1.5">
                              {categories.slice(0, 8).map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => { setCustomCategory(c.id); setCategory(c.id); }}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                    customCategory === c.id
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                                  }`}
                                >
                                  {c.emoji} {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Location fields (show unless city/region with auto-filled data) */}
                    {(entryType === "experience" || entryType === "place" || !selectedSuggestion) && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder={entryType === "city" || entryType === "region" ? "Name *" : "City *"}
                            className="w-full pl-9 pr-3 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                          />
                        </div>
                        <input
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          placeholder="Country"
                          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                        />
                      </div>
                    )}

                    {/* Date */}
                    <input
                      type="date"
                      value={experienceDate}
                      onChange={(e) => setExperienceDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/40"
                    />
                  </div>
                )}

                {step === "category" && (
                  <div className="grid grid-cols-3 gap-2">
                    {categories.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setCategory(c.id)}
                        className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all ${
                          category === c.id
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-background hover:border-primary/20 hover:bg-muted/30"
                        }`}
                      >
                        <span className="text-2xl">{c.emoji}</span>
                        <span className="text-xs font-medium text-foreground">{c.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {step === "rating" && (
                  <div className="flex flex-col items-center py-8 gap-4">
                    <p className="text-sm text-muted-foreground">How would you rate this experience?</p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          onMouseEnter={() => setHoverRating(n)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(n)}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-10 h-10 transition-colors ${
                              n <= (hoverRating || rating)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <motion.p
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm font-medium text-foreground"
                      >
                        {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Great" : "Amazing!"}
                      </motion.p>
                    )}
                  </div>
                )}

                {step === "tags" && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Select tags that describe this experience</p>
                    <div className="flex flex-wrap gap-2">
                      {predefinedTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            selectedTags.includes(tag)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    {selectedTags.length > 0 && (
                      <p className="text-xs text-muted-foreground">{selectedTags.length} selected</p>
                    )}
                  </div>
                )}

                {step === "photos" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Document your experience (max 5 photos)</p>
                      <span className="text-xs text-muted-foreground">{photos.length}/5</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {photoPreviewUrls.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => removePhoto(i)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {photos.length < 5 && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 hover:border-primary/30 hover:bg-muted/20 transition-colors"
                        >
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">Add</span>
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotos(e.target.files)}
                      className="hidden"
                    />
                    <p className="text-[11px] text-muted-foreground/60 text-center">
                      Photos are documentation, not content. They're always tied to this experience.
                    </p>
                  </div>
                )}

                {step === "note" && (
                  <div className="space-y-4">
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                      placeholder="Short note about the experience... (optional)"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{caption.length}/200</p>

                    {/* Visibility */}
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Who can see this?</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {visibilityOptions.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setVisibility(v.id)}
                            className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-all ${
                              visibility === v.id ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
                            }`}
                          >
                            {v.icon}
                            <div className="text-left">
                              <p>{v.label}</p>
                              <p className="text-[9px] opacity-70">{v.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-1.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Summary</p>
                      <p className="text-sm font-medium text-foreground">{title}</p>
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        {city && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{city}{country ? `, ${country}` : ""}</span>}
                        {category && (
                          <span>{categories.find(c => c.id === category)?.emoji} {categories.find(c => c.id === category)?.label}</span>
                        )}
                        {rating > 0 && (
                          <span className="flex items-center gap-0.5">
                            {[...Array(rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                          </span>
                        )}
                      </div>
                      {isCustom && (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-gold/10 text-gold text-[9px] font-medium">Custom {entryType}</span>
                      )}
                      {selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedTags.map(t => <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">{t}</span>)}
                        </div>
                      )}
                      {photos.length > 0 && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Image className="w-3 h-3" />{photos.length} photo{photos.length > 1 ? "s" : ""}</p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
            <button
              onClick={activeStepIdx === 0 ? onClose : prevStep}
              className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {activeStepIdx === 0 ? "Cancel" : "Back"}
            </button>

            {step === "note" || (activeStepIdx === activeSteps.length - 1) ? (
              <button
                onClick={handleSubmit}
                disabled={uploading || addExperience.isPending || addPlace.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {uploading || addExperience.isPending || addPlace.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  entryType === "city" || entryType === "region" ? "Save Destination" : "Save Experience"
                )}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={!canProceed()}
                className="flex items-center gap-1 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {step === "tags" || step === "photos" ? "Skip / Next" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExperienceComposer;
