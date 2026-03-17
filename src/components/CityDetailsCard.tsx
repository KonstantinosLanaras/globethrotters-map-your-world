import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Check, Heart, Star, Bookmark, Plus, Loader2, ArrowLeftRight,
  Sparkles, BadgeCheck, Utensils, Mountain, Landmark, Eye, Bus, Gem, TreePine, Wine, Camera, Info,
  Search, MoreVertical, SlidersHorizontal
} from "lucide-react";
import { City } from "@/data/cities";
import { Place, useAddPlace, useUpdatePlace } from "@/hooks/usePlaces";
import { useLists, useAddList } from "@/hooks/useLists";
import { useAddPlaceToList } from "@/hooks/useListPlaces";
import { useAuth } from "@/hooks/useAuth";
import { useActivities, Activity } from "@/hooks/useActivities";
import { useProfile } from "@/hooks/useProfile";
import { usePromotedPlaces, PromotedPlace } from "@/hooks/usePromotedPlaces";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

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
  transport: [],
};

// Generic fallback filters for any category
const genericFilters: FilterOption[] = [
  { key: "rating", label: "Min rating", type: "select", options: ["4.0+", "4.5+", "4.8+"] },
  { key: "popularity", label: "Popularity", type: "select", options: ["Any", "Popular", "Hidden"] },
];

const searchPlaceholders: Record<string, string> = {
  food: "Search restaurants or cuisines",
  bars: "Search bars or nightlife",
  hiking: "Search trails or hikes",
  nature: "Search nature spots",
  culture: "Search museums, monuments...",
  scenic: "Search viewpoints or scenic spots",
  hidden_gem: "Search hidden gems",
  transport: "Search transport options",
};

const categoryConfig: Record<string, { icon: typeof Utensils; label: string; color: string }> = {
  food: { icon: Utensils, label: "Food", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  hiking: { icon: Mountain, label: "Hiking", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  nature: { icon: TreePine, label: "Nature", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  culture: { icon: Landmark, label: "Culture", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  scenic: { icon: Eye, label: "Scenic", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  transport: { icon: Bus, label: "Transport", color: "bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400" },
  hidden_gem: { icon: Gem, label: "Hidden Gems", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  bars: { icon: Wine, label: "Bars", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
};

const SPONSORED_MIN_RATING = 4.5;
const SPONSORED_MIN_SHIPMENTS = 5;

const getPersonalizedOrder = (interests: string[], personality: string, travelStyle: string[]): string[] => {
  const all = [...interests, ...travelStyle, personality].map(s => s?.toLowerCase() || "");
  const scores: Record<string, number> = {
    food: 5, culture: 4, hidden_gem: 3, scenic: 3, hiking: 2, nature: 2, bars: 2, transport: 1,
  };
  if (all.some(s => s.includes("food") || s.includes("culinary") || s.includes("gastro"))) scores.food += 5;
  if (all.some(s => s.includes("adventure") || s.includes("explorer") || s.includes("hik"))) { scores.hiking += 5; scores.nature += 3; }
  if (all.some(s => s.includes("culture") || s.includes("history") || s.includes("museum") || s.includes("art"))) scores.culture += 5;
  if (all.some(s => s.includes("nightlife") || s.includes("bar") || s.includes("party"))) scores.bars += 5;
  if (all.some(s => s.includes("nature") || s.includes("outdoor"))) { scores.nature += 4; scores.scenic += 3; }
  if (all.some(s => s.includes("hidden") || s.includes("off-beat") || s.includes("local"))) scores.hidden_gem += 5;
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([k]) => k);
};

const getMatchReason = (activity: Activity, interests: string[], personality: string): string | null => {
  const all = [...interests, personality].map(s => s?.toLowerCase() || "");
  if (activity.category === "food" && all.some(s => s.includes("food"))) return "Matches your foodie profile";
  if (activity.category === "hiking" && all.some(s => s.includes("adventure") || s.includes("hik"))) return "Great for your adventurous side";
  if (activity.category === "culture" && all.some(s => s.includes("culture") || s.includes("history"))) return "Perfect for culture lovers";
  if (activity.category === "hidden_gem" && all.some(s => s.includes("hidden") || s.includes("local"))) return "A hidden gem just for you";
  if (activity.category === "scenic") return "Top-rated scenic spot";
  return null;
};

const isPromotedQualified = (p: PromotedPlace): boolean => {
  const rating = p.quality_score / 10;
  return p.is_active && rating >= SPONSORED_MIN_RATING && p.impressions >= SPONSORED_MIN_SHIPMENTS;
};

const SponsoredCard = ({ place }: { place: PromotedPlace }) => {
  const rating = (place.quality_score / 10).toFixed(1);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-xl bg-primary/5 border border-primary/10 hover:border-primary/20 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BadgeCheck className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground truncate">{place.business_name}</h4>
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              {rating}
            </span>
          </div>
          {place.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{place.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
              {place.business_type}
            </span>
            {place.impressions > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {place.impressions.toLocaleString()} reviews
              </span>
            )}
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium uppercase tracking-wider">
              Sponsored
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CityDetailsCard = ({ city, savedPlace, onClose }: CityDetailsCardProps) => {
  const { user } = useAuth();
  const addPlace = useAddPlace();
  const updatePlace = useUpdatePlace();
  const { data: lists = [] } = useLists();
  const addList = useAddList();
  const addToList = useAddPlaceToList();
  const { data: profile } = useProfile();
  const { activities, loading: activitiesLoading } = useActivities(city.name, city.country);
  const { data: promotedPlaces = [] } = usePromotedPlaces();

  const [showLists, setShowLists] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isVisited = savedPlace?.type === "visited";
  const isWishlist = savedPlace?.type === "wishlist";
  const isSaved = !!savedPlace;
  const isPending = addPlace.isPending || updatePlace.isPending;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Category & activity logic
  const orderedCategories = getPersonalizedOrder(
    profile?.interests || [], profile?.personality || "", profile?.travel_style || []
  );
  const activityMap: Record<string, Activity[]> = {};
  activities.forEach(a => {
    if (!activityMap[a.category]) activityMap[a.category] = [];
    activityMap[a.category].push(a);
  });
  const availableCategories = orderedCategories.filter(c => activityMap[c]?.length);
  const activeCategory = selectedCategory && activityMap[selectedCategory] ? selectedCategory : availableCategories[0] || null;
  const displayedActivities = activeCategory ? activityMap[activeCategory] || [] : [];

  // Sponsored
  const qualifiedSponsored = promotedPlaces.filter(isPromotedQualified).slice(0, 3);

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
      } catch { toast.error("Failed to add to list. Please try again."); }
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

          {/* Recommendations – scrollable area */}
          <div className="flex-1 overflow-y-auto">
            {/* Section header */}
            <div className="px-5 pt-4 pb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {profile?.personality ? "Recommended for you" : "Things to do"}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                    Sponsored results are promoted listings from highly rated businesses.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Sponsored results (top 1-3, only if qualified) */}
            {qualifiedSponsored.length > 0 && (
              <div className="px-5 pb-2 space-y-2">
                {qualifiedSponsored.map(p => (
                  <SponsoredCard key={p.id} place={p} />
                ))}
              </div>
            )}

            {/* Category chips */}
            {activitiesLoading ? (
              <div className="px-5 py-2 flex gap-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-7 w-20 rounded-full" />)}
              </div>
            ) : availableCategories.length > 0 ? (
              <div className="px-5 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
                {availableCategories.map(cat => {
                  const conf = categoryConfig[cat];
                  if (!conf) return null;
                  const Icon = conf.icon;
                  const isActive = cat === activeCategory;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : `${conf.color} hover:opacity-80`
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {conf.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Activity cards */}
            <div className="px-5 pb-5 pt-1 space-y-2">
              {activitiesLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="p-3 rounded-xl bg-muted/30 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : displayedActivities.length > 0 ? (
                displayedActivities.map((activity, idx) => {
                  const conf = categoryConfig[activity.category];
                  const Icon = conf?.icon || Camera;
                  const matchReason = getMatchReason(activity, profile?.interests || [], profile?.personality || "");
                  const rating = (4.0 + (activity.name.length % 10) / 10).toFixed(1);
                  const reviewCount = 50 + (activity.name.length * 17) % 2000;

                  return (
                    <motion.div
                      key={`${activity.name}-${idx}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="group p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${conf?.color || "bg-muted text-muted-foreground"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium text-foreground truncate">{activity.name}</h4>
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 flex-shrink-0">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              {rating}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{activity.description}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">
                              {reviewCount.toLocaleString()} reviews
                            </span>
                            {activity.duration && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-background text-muted-foreground">
                                {activity.duration}
                              </span>
                            )}
                            {matchReason && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                ✨ {matchReason}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              ) : !activitiesLoading && activities.length === 0 ? (
                <div className="text-center py-6">
                  <Camera className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Discovering activities...</p>
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default CityDetailsCard;
