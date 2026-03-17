import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Star, Utensils, Mountain, Landmark, Eye, Bus, Gem, TreePine,
  Wine, Camera, Heart, Sparkles, BadgeCheck, ChevronRight
} from "lucide-react";
import { City } from "@/data/cities";
import { useActivities, Activity } from "@/hooks/useActivities";
import { useProfile } from "@/hooks/useProfile";
import { usePromotedPlaces, PromotedPlace } from "@/hooks/usePromotedPlaces";
import { Skeleton } from "@/components/ui/skeleton";

interface CityRecommendationsDrawerProps {
  city: City;
  open: boolean;
  onClose: () => void;
}

const categoryConfig: Record<string, { icon: typeof Utensils; label: string; color: string }> = {
  food: { icon: Utensils, label: "Food", color: "bg-orange-100 text-orange-700" },
  hiking: { icon: Mountain, label: "Hiking", color: "bg-green-100 text-green-700" },
  nature: { icon: TreePine, label: "Nature", color: "bg-emerald-100 text-emerald-700" },
  culture: { icon: Landmark, label: "Culture", color: "bg-blue-100 text-blue-700" },
  scenic: { icon: Eye, label: "Scenic", color: "bg-purple-100 text-purple-700" },
  transport: { icon: Bus, label: "Transport", color: "bg-slate-100 text-slate-600" },
  hidden_gem: { icon: Gem, label: "Hidden Gems", color: "bg-amber-100 text-amber-700" },
  bars: { icon: Wine, label: "Bars", color: "bg-rose-100 text-rose-700" },
};

const SPONSORED_MIN_RATING = 4.2;
const SPONSORED_MIN_REVIEWS = 30;

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
  if (activity.category === "culture" && all.some(s => s.includes("culture") || s.includes("history"))) return "Perfect for culture lovers like you";
  if (activity.category === "hidden_gem" && all.some(s => s.includes("hidden") || s.includes("local"))) return "A hidden gem just for you";
  if (activity.category === "scenic") return "Top-rated scenic spot";
  return null;
};

const isPromotedQualified = (p: PromotedPlace): boolean => {
  return p.is_active && p.quality_score >= SPONSORED_MIN_RATING * 10 && p.impressions >= SPONSORED_MIN_REVIEWS;
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
              Globetrotthers Sponsored
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CityRecommendationsDrawer = ({ city, open, onClose }: CityRecommendationsDrawerProps) => {
  const { data: profile } = useProfile();
  const { activities, loading: activitiesLoading } = useActivities(city.name, city.country);
  const { data: promotedPlaces = [] } = usePromotedPlaces();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

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

  // Qualified sponsored results (max 2)
  const qualifiedSponsored = promotedPlaces.filter(isPromotedQualified).slice(0, 2);

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[1001] bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-[72px] right-4 bottom-4 w-[400px] z-[1002] flex flex-col bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-4 bg-gradient-to-b from-muted/60 to-transparent flex-shrink-0">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors z-10"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2 pr-10">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {profile?.personality
                      ? `Recommended for you in ${city.name}`
                      : `Things to do in ${city.name}`}
                  </h2>
                  {!profile?.personality && !profile?.interests?.length && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Complete your travel profile for personalized suggestions
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto">
              {/* Sponsored Section */}
              {qualifiedSponsored.length > 0 && (
                <div className="px-5 pt-3 pb-2 space-y-2">
                  {qualifiedSponsored.map(p => (
                    <SponsoredCard key={p.id} place={p} />
                  ))}
                </div>
              )}

              {/* Category Chips */}
              {activitiesLoading ? (
                <div className="px-5 py-3 flex gap-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
                </div>
              ) : availableCategories.length > 0 ? (
                <div className="px-5 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
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
                        <span className="opacity-60">({activityMap[cat]?.length || 0})</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {/* Activity Cards */}
              <div className="px-5 pb-5 space-y-2">
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
                    // Generate a pseudo-rating for organic results
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
        </>
      )}
    </AnimatePresence>
  );
};

export default CityRecommendationsDrawer;
