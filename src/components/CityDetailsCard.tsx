import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Check, Heart, Star, Bookmark, Plus, Loader2, ArrowLeftRight,
  BadgeCheck, Utensils, Mountain, Landmark, Eye, Bus, Gem, TreePine, Wine, Camera,
  Search, MoreVertical, SlidersHorizontal, TrendingUp, Flame, Users, PenLine
} from "lucide-react";
import { City } from "@/data/cities";
import { Place, useAddPlace, useUpdatePlace } from "@/hooks/usePlaces";
import { useLists, useAddList } from "@/hooks/useLists";
import { useAddPlaceToList } from "@/hooks/useListPlaces";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUnifiedExperiences, UnifiedExperience, useToggleExperienceSave, useExperienceSaves } from "@/hooks/useCityExperiences";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import ExperienceComposer from "@/components/ExperienceComposer";

interface CityDetailsCardProps {
  city: City;
  savedPlace: Place | null;
  onClose: () => void;
}

// --- Filter definitions per category ---
interface FilterOption {
  key: string;
  label: string;
  type: "toggle" | "select" | "range";
  options?: string[];
}

const categoryFilters: Record<string, FilterOption[]> = {
  food: [
    { key: "cuisine", label: "Cuisine", type: "select", options: ["Italian", "Asian", "Mexican", "French", "Local", "Fusion"] },
    { key: "dietary", label: "Dietary", type: "select", options: ["Vegan", "Vegetarian", "Gluten-free"] },
    { key: "price", label: "Price range", type: "select", options: ["€", "€€", "€€€", "€€€€"] },
    { key: "kidFriendly", label: "Kid-friendly", type: "toggle" },
  ],
  bars: [
    { key: "barType", label: "Type", type: "select", options: ["Cocktail bar", "Wine bar", "Pub", "Rooftop", "Dive bar"] },
    { key: "price", label: "Price range", type: "select", options: ["€", "€€", "€€€"] },
  ],
  hiking: [
    { key: "difficulty", label: "Difficulty", type: "select", options: ["Easy", "Moderate", "Hard"] },
    { key: "duration", label: "Duration", type: "select", options: ["< 1h", "1-3h", "3-6h", "Full day"] },
  ],
  hike: [
    { key: "difficulty", label: "Difficulty", type: "select", options: ["Easy", "Moderate", "Hard"] },
    { key: "duration", label: "Duration", type: "select", options: ["< 1h", "1-3h", "3-6h", "Full day"] },
  ],
  nature: [
    { key: "activityType", label: "Type", type: "select", options: ["Park", "Garden", "Lake", "Beach", "Forest"] },
    { key: "kidFriendly", label: "Kid-friendly", type: "toggle" },
  ],
  culture: [
    { key: "cultureType", label: "Type", type: "select", options: ["Museum", "Monument", "Architecture", "Historic", "Gallery"] },
    { key: "duration", label: "Duration", type: "select", options: ["< 1h", "1-2h", "Half day", "Full day"] },
  ],
  scenic: [
    { key: "scenicType", label: "Type", type: "select", options: ["Viewpoint", "Sunset spot", "Photo spot", "Panorama"] },
  ],
  hidden_gem: [
    { key: "gemType", label: "Type", type: "select", options: ["Local spot", "Off-beat", "Secret", "Underrated"] },
  ],
};

const genericFilters: FilterOption[] = [
  { key: "rating", label: "Min rating", type: "select", options: ["4.0+", "4.5+", "4.8+"] },
  { key: "popularity", label: "Popularity", type: "select", options: ["Any", "Popular", "Hidden"] },
];

const categoryConfig: Record<string, { icon: typeof Utensils; label: string; color: string }> = {
  food: { icon: Utensils, label: "Food", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  hiking: { icon: Mountain, label: "Hiking", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  hike: { icon: Mountain, label: "Hike", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  nature: { icon: TreePine, label: "Nature", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  culture: { icon: Landmark, label: "Culture", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  scenic: { icon: Eye, label: "Scenic", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  transport: { icon: Bus, label: "Transport", color: "bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400" },
  hidden_gem: { icon: Gem, label: "Hidden Gems", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  bars: { icon: Wine, label: "Bars", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
  monument: { icon: Landmark, label: "Monument", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  beach: { icon: Eye, label: "Beach", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" },
  museum: { icon: Landmark, label: "Museum", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  city_walk: { icon: MapPin, label: "City Walk", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  road_trip: { icon: Bus, label: "Road Trip", color: "bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400" },
  hotel: { icon: MapPin, label: "Hotel", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400" },
  general: { icon: Camera, label: "Other", color: "bg-muted text-muted-foreground" },
};

const labelConfig: Record<string, { icon: typeof Star; color: string }> = {
  Sponsored: { icon: BadgeCheck, color: "bg-primary/10 text-primary" },
  Trending: { icon: Flame, color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" },
  Rising: { icon: TrendingUp, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  Community: { icon: Users, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  Verified: { icon: BadgeCheck, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  Popular: { icon: Star, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
};

// --- Experience Card ---
const ExperienceCard = ({
  item,
  idx,
  onSaveToWishlist,
  onSaveToVisited,
  lists,
  onAddToList,
  isSaved: isExpSaved,
  saving,
}: {
  item: UnifiedExperience;
  idx: number;
  onSaveToWishlist: () => void;
  onSaveToVisited: () => void;
  lists: { id: string; title: string; emoji: string }[];
  onAddToList: (listId: string) => void;
  isSaved: boolean;
  saving: boolean;
}) => {
  const [showListPicker, setShowListPicker] = useState(false);
  const conf = categoryConfig[item.category] || categoryConfig.general;
  const Icon = conf?.icon || Camera;
  const lbl = item.label ? labelConfig[item.label] : null;
  const LblIcon = lbl?.icon || Star;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      className={`group p-3 rounded-xl transition-colors ${
        item.type === "sponsored"
          ? "bg-primary/5 border border-primary/10 hover:border-primary/20"
          : "bg-muted/30 hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${conf.color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">{item.name}</h4>
            {item.rating > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 flex-shrink-0">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {item.rating.toFixed(1)}
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {item.reviewCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {item.reviewCount.toLocaleString()} reviews
              </span>
            )}
            {item.label && lbl && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium ${lbl.color}`}>
                <LblIcon className="w-2.5 h-2.5" />
                {item.label}
              </span>
            )}
          </div>
          {/* Save actions */}
          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={onSaveToWishlist}
              disabled={saving}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                isExpSaved
                  ? "bg-primary/15 text-primary"
                  : "bg-accent/50 text-accent-foreground hover:bg-accent"
              }`}
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className="w-3 h-3" />}
              {isExpSaved ? "Saved" : "Wishlist"}
            </button>
            <button
              onClick={onSaveToVisited}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-accent/50 text-accent-foreground hover:bg-accent transition-colors"
            >
              <Check className="w-3 h-3" />
              Visited
            </button>
            <div className="relative">
              <button
                onClick={() => setShowListPicker(!showListPicker)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
              >
                <Bookmark className="w-3 h-3" />
                List
              </button>
              <AnimatePresence>
                {showListPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    className="absolute bottom-full left-0 mb-1 w-[180px] bg-card border border-border rounded-xl shadow-xl z-30"
                  >
                    <div className="p-2 max-h-[140px] overflow-y-auto space-y-0.5">
                      {lists.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground text-center py-2">No lists yet</p>
                      ) : lists.map(list => (
                        <button
                          key={list.id}
                          onClick={() => { onAddToList(list.id); setShowListPicker(false); }}
                          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                        >
                          <span className="text-sm">{list.emoji}</span>
                          <span className="text-[11px] font-medium text-foreground truncate flex-1">{list.title}</span>
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Section Header ---
const SectionHeader = ({ title, icon: SIcon }: { title: string; icon: typeof Star }) => (
  <div className="flex items-center gap-2 pt-3 pb-1.5">
    <SIcon className="w-3.5 h-3.5 text-muted-foreground" />
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
  </div>
);

const CityDetailsCard = ({ city, savedPlace, onClose }: CityDetailsCardProps) => {
  const { user } = useAuth();
  const addPlace = useAddPlace();
  const updatePlace = useUpdatePlace();
  const { data: lists = [] } = useLists();
  const addList = useAddList();
  const addToList = useAddPlaceToList();
  const { data: profile } = useProfile();
  const { sponsored, topPicks, trending, hiddenGems, allSeeded, loading: unifiedLoading } = useUnifiedExperiences(city.name, city.country);
  const toggleSave = useToggleExperienceSave();
  const { data: savedExpIds = new Set<string>() } = useExperienceSaves();

  const [showLists, setShowLists] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [activeSection, setActiveSection] = useState<"top" | "trending" | "hidden" | "recommended">("top");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, string | boolean>>({});
  const filterRef = useRef<HTMLDivElement>(null);
  const [savingItem, setSavingItem] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const isVisited = savedPlace?.type === "visited";
  const isWishlist = savedPlace?.type === "wishlist";
  const isSaved = !!savedPlace;
  const isPending = addPlace.isPending || updatePlace.isPending;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (!showFilters) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilters]);

  useEffect(() => {
    setSearchQuery("");
    setActiveFilters({});
    setShowFilters(false);
  }, [activeSection]);

  // Section data
  const sectionItems = useMemo((): UnifiedExperience[] => {
    switch (activeSection) {
      case "top": return topPicks;
      case "trending": return trending;
      case "hidden": return hiddenGems;
      case "recommended": return allSeeded;
      default: return topPicks;
    }
  }, [activeSection, topPicks, trending, hiddenGems, allSeeded]);

  // Filter + search
  const displayedItems = useMemo(() => {
    let items = sectionItems;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    }
    return items;
  }, [sectionItems, searchQuery]);

  // Detect active category for filters
  const dominantCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    displayedItems.forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1; });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "general";
  }, [displayedItems]);

  const currentFilters = useMemo(() => {
    const specific = categoryFilters[dominantCategory] || [];
    return [...specific, ...genericFilters];
  }, [dominantCategory]);

  const activeFilterChips = useMemo(() => {
    return Object.entries(activeFilters)
      .filter(([, v]) => v !== undefined && v !== "" && v !== false)
      .map(([key, value]) => {
        const def = currentFilters.find(f => f.key === key);
        return { key, label: def?.label || key, value: typeof value === "boolean" ? def?.label || key : String(value) };
      });
  }, [activeFilters, currentFilters]);

  const toggleFilter = (key: string, value: string | boolean) => {
    setActiveFilters(prev => {
      if (prev[key] === value) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  };

  const clearFilters = () => { setActiveFilters({}); setSearchQuery(""); };

  // --- Save handlers ---
  const handleSave = async (type: "visited" | "wishlist") => {
    if (!user) { toast.error("Sign in to save places"); return; }
    if (isSaved && savedPlace.type === type) {
      toast.info(`Already ${type === "visited" ? "marked as visited" : "in your wishlist"}`);
      return;
    }
    try {
      if (isSaved && savedPlace.type !== type) {
        await updatePlace.mutateAsync({
          id: savedPlace.id, type,
          date_visited: type === "visited" ? new Date().toISOString().split("T")[0] : null,
        });
        toast.success(type === "visited" ? `${city.name} moved to visited! ✓` : `${city.name} moved to wishlist! ♡`);
      } else {
        await addPlace.mutateAsync({
          name: city.name, country: city.country, lat: city.lat, lng: city.lng,
          type, tags: [], rating: 0, notes: "",
          date_visited: type === "visited" ? new Date().toISOString().split("T")[0] : null,
        });
        toast.success(type === "visited" ? `${city.name} marked as visited! ✓` : `${city.name} added to wishlist! ♡`);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to save";
      if (msg.includes("Already")) toast.info(msg);
      else toast.error("Couldn't save city. Please try again.");
    }
  };

  const handleAddToList = async (listId: string) => {
    if (!user) { toast.error("Sign in first"); return; }
    if (!savedPlace) {
      try {
        const result = await addPlace.mutateAsync({
          name: city.name, country: city.country, lat: city.lat, lng: city.lng,
          type: "wishlist", tags: [], rating: 0, notes: "", date_visited: null,
        });
        if (result?.id) {
          await addToList.mutateAsync({ listId, placeId: result.id });
          toast.success("Saved & added to list!");
        }
      } catch { toast.error("Failed to add to list."); }
      return;
    }
    try {
      await addToList.mutateAsync({ listId, placeId: savedPlace.id });
      toast.success("Added to list!");
    } catch { toast.error("Already in this list or failed to add"); }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      const placeId = savedPlace?.id;
      const list = await addList.mutateAsync({ title: newListName.trim(), description: "", emoji: "📍" });
      if (list?.id && placeId) {
        await addToList.mutateAsync({ listId: list.id, placeId });
      }
      toast.success(`Created "${newListName}"${placeId ? ` and added ${city.name}` : ""}`);
      setNewListName("");
      setShowNewList(false);
    } catch { toast.error("Failed to create list"); }
  };

  const handleItemSave = async (item: UnifiedExperience, type: "visited" | "wishlist") => {
    if (!user) { toast.error("Sign in to save"); return; }
    setSavingItem(item.name);
    try {
      await addPlace.mutateAsync({
        name: item.name, country: city.country, lat: city.lat, lng: city.lng,
        type, tags: [item.category], rating: 0, notes: item.description || "",
        date_visited: type === "visited" ? new Date().toISOString().split("T")[0] : null,
      });
      // If community experience, toggle save
      if (item.type === "community" && item.experience && type === "wishlist") {
        const alreadySaved = savedExpIds.has(item.experience.id);
        if (!alreadySaved) {
          await toggleSave.mutateAsync({ experienceId: item.experience.id, isSaved: false });
        }
      }
      toast.success(`${item.name} added to ${type}!`);
    } catch (err: any) {
      if (err?.message?.includes("Already")) toast.info(err.message);
      else toast.error("Failed to save");
    } finally {
      setSavingItem(null);
    }
  };

  const handleItemAddToList = async (item: UnifiedExperience, listId: string) => {
    if (!user) { toast.error("Sign in first"); return; }
    setSavingItem(item.name);
    try {
      const result = await addPlace.mutateAsync({
        name: item.name, country: city.country, lat: city.lat, lng: city.lng,
        type: "wishlist", tags: [item.category], rating: 0, notes: item.description || "",
        date_visited: null,
      });
      if (result?.id) {
        await addToList.mutateAsync({ listId, placeId: result.id });
        toast.success(`${item.name} added to list!`);
      }
    } catch (err: any) {
      if (err?.message?.includes("Already")) toast.info("Already saved");
      else toast.error("Failed to add to list");
    } finally {
      setSavingItem(null);
    }
  };

  const sections = [
    { id: "top" as const, label: `Top picks in ${city.name}`, icon: Star },
    { id: "trending" as const, label: "Trending now", icon: Flame },
    { id: "hidden" as const, label: "Hidden gems", icon: Gem },
    { id: "recommended" as const, label: "Recommended for you", icon: Heart },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[999] bg-transparent" onClick={onClose} />

      <AnimatePresence>
        <motion.div
          key={city.name}
          initial={{ opacity: 0, x: 20, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-[72px] right-4 bottom-4 w-[380px] z-[1000] flex flex-col bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 pt-5 pb-4 bg-gradient-to-b from-muted/60 to-transparent flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-3 pr-10">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isVisited ? "bg-visited text-visited-foreground" :
                isWishlist ? "bg-wishlist text-wishlist-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground leading-tight">{city.name}</h2>
                <p className="text-sm text-muted-foreground">{city.country}</p>
              </div>
            </div>

            {isSaved && (
              <div className="mt-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  isVisited ? "bg-visited/15 text-visited" : "bg-wishlist/15 text-wishlist"
                }`}>
                  {isVisited ? <Check className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                  {isVisited ? "Visited" : "On Wishlist"}
                </span>
              </div>
            )}
          </div>

          {/* Save Actions */}
          <div className="px-5 py-3 border-b border-border space-y-2 flex-shrink-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Save to collection</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSave("visited")}
                disabled={isPending}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isVisited ? "bg-visited text-visited-foreground cursor-default"
                  : "bg-visited/10 text-visited hover:bg-visited/20 active:scale-[0.98]"
                }`}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    {isVisited ? <Check className="w-4 h-4" /> : isWishlist ? <ArrowLeftRight className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    {isVisited ? "Visited ✓" : isWishlist ? "Move here" : "Visited"}
                  </>
                )}
              </button>
              <button
                onClick={() => handleSave("wishlist")}
                disabled={isPending}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isWishlist ? "bg-wishlist text-wishlist-foreground cursor-default"
                  : "bg-wishlist/10 text-wishlist hover:bg-wishlist/20 active:scale-[0.98]"
                }`}
              >
                {isWishlist ? <Check className="w-4 h-4" /> : isVisited ? <ArrowLeftRight className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                {isWishlist ? "Wishlist ✓" : isVisited ? "Move here" : "Wishlist"}
              </button>
            </div>
            <button
              onClick={() => setShowLists(!showLists)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all bg-primary/10 text-primary hover:bg-primary/15"
            >
              <Bookmark className="w-4 h-4" />
              Add to Custom List
            </button>
          </div>

          {/* Custom Lists Panel */}
          <AnimatePresence>
            {showLists && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-border overflow-hidden flex-shrink-0"
              >
                <div className="px-5 py-3 max-h-[160px] overflow-y-auto space-y-1">
                  {lists.length === 0 && !showNewList ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No custom lists yet</p>
                  ) : (
                    lists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => handleAddToList(list.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                      >
                        <span className="text-lg">{list.emoji}</span>
                        <span className="text-sm font-medium text-foreground truncate flex-1">{list.title}</span>
                        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ))
                  )}
                  {showNewList ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="List name..."
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
                      />
                      <button
                        onClick={handleCreateList}
                        disabled={!newListName.trim()}
                        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
                      >
                        Create
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewList(true)}
                      className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg text-sm text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New List
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Discovery – scrollable area */}
          <div className="flex-1 overflow-y-auto">
            {/* Section tabs */}
            <div className="px-5 pt-3 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
              {sections.map(sec => {
                const SIcon = sec.icon;
                const isActive = activeSection === sec.id;
                const count = sec.id === "top" ? topPicks.length :
                  sec.id === "trending" ? trending.length :
                  sec.id === "hidden" ? hiddenGems.length : allSeeded.length;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveSection(sec.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <SIcon className="w-3 h-3" />
                    {sec.id === "top" ? "Top picks" : sec.id === "trending" ? "Trending" : sec.id === "hidden" ? "Hidden gems" : "For you"}
                    {count > 0 && <span className="text-[9px] opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Search + filters */}
            <div className="px-5 py-2 sticky top-0 z-10 bg-card">
              <div className="flex items-center gap-1.5">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search in ${city.name}...`}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20"
                    >
                      <X className="w-2.5 h-2.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                {/* Filter button */}
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      showFilters || activeFilterChips.length > 0
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    aria-label="Filters"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-11 w-[240px] bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden"
                      >
                        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Filters
                          </div>
                          {activeFilterChips.length > 0 && (
                            <button onClick={clearFilters} className="text-[10px] text-primary hover:underline">
                              Clear all
                            </button>
                          )}
                        </div>
                        <div className="p-3 space-y-3 max-h-[280px] overflow-y-auto">
                          {currentFilters.map(filter => (
                            <div key={filter.key}>
                              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">{filter.label}</p>
                              {filter.type === "toggle" ? (
                                <button
                                  onClick={() => toggleFilter(filter.key, !activeFilters[filter.key])}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    activeFilters[filter.key]
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  {activeFilters[filter.key] ? "✓ " : ""}{filter.label}
                                </button>
                              ) : filter.options ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {filter.options.map(opt => (
                                    <button
                                      key={opt}
                                      onClick={() => toggleFilter(filter.key, opt)}
                                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                                        activeFilters[filter.key] === opt
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Add experience button */}
                <button
                  onClick={() => setShowComposer(true)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                  aria-label="Share experience"
                >
                  <PenLine className="w-4 h-4" />
                </button>
              </div>

              {/* Active filter chips */}
              {activeFilterChips.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {activeFilterChips.map(chip => (
                    <button
                      key={chip.key}
                      onClick={() => toggleFilter(chip.key, activeFilters[chip.key])}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
                    >
                      {chip.value}
                      <X className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Results */}
            <div className="px-5 pb-5 space-y-2">
              {/* Sponsored (always at top, max 2) */}
              {sponsored.length > 0 && (
                <>
                  {sponsored.map((item, idx) => (
                    <ExperienceCard
                      key={`sp-${idx}`}
                      item={item}
                      idx={idx}
                      onSaveToWishlist={() => handleItemSave(item, "wishlist")}
                      onSaveToVisited={() => handleItemSave(item, "visited")}
                      lists={lists}
                      onAddToList={(listId) => handleItemAddToList(item, listId)}
                      isSaved={false}
                      saving={savingItem === item.name}
                    />
                  ))}
                  {displayedItems.length > 0 && (
                    <div className="flex items-center gap-2 py-1">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/50 font-medium">Recommended for you</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                </>
              )}

              {/* Loading */}
              {unifiedLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="p-3 rounded-xl bg-muted/30 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : displayedItems.length > 0 ? (
                displayedItems.map((item, idx) => (
                  <ExperienceCard
                    key={`${item.type}-${item.name}-${idx}`}
                    item={item}
                    idx={idx}
                    onSaveToWishlist={() => handleItemSave(item, "wishlist")}
                    onSaveToVisited={() => handleItemSave(item, "visited")}
                    lists={lists}
                    onAddToList={(listId) => handleItemAddToList(item, listId)}
                    isSaved={item.type === "community" && item.experience ? savedExpIds.has(item.experience.id) : false}
                    saving={savingItem === item.name}
                  />
                ))
              ) : !unifiedLoading && (searchQuery || activeFilterChips.length > 0) ? (
                <div className="text-center py-6">
                  <Search className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No results match your filters</p>
                  <button onClick={clearFilters} className="text-xs text-primary hover:underline mt-1">
                    Clear filters
                  </button>
                </div>
              ) : !unifiedLoading ? (
                <div className="text-center py-6">
                  <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {activeSection === "trending" ? "No trending experiences yet" :
                     activeSection === "hidden" ? "No community discoveries yet — be the first!" :
                     "Discovering activities..."}
                  </p>
                  {(activeSection === "trending" || activeSection === "hidden") && (
                    <button
                      onClick={() => setShowComposer(true)}
                      className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline"
                    >
                      <PenLine className="w-3 h-3" />
                      Share your experience
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Experience Composer */}
      <ExperienceComposer
        open={showComposer}
        onClose={() => setShowComposer(false)}
      />
    </>
  );
};

export default CityDetailsCard;
