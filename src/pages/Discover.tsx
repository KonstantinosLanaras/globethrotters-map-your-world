import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Compass, Search, TrendingUp, MapPin, Star, Bookmark, Eye, MessageSquare, X, ThumbsUp, Heart, CheckCircle2, Plane, Sparkles, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToggleHelpful, useUserHelpfulMarks } from "@/hooks/useReputation";
import { useFavoriteExperienceIds, useToggleFavoriteExperience } from "@/hooks/useFavorites";
import FeaturedTooltip from "@/components/FeaturedTooltip";
import AddToTripDialog from "@/components/AddToTripDialog";
import { toast } from "sonner";

const categories = ["All", "Food", "Culture", "Nature", "Nightlife"] as const;
type Category = (typeof categories)[number];

interface DiscoverExperience {
  id: string;
  title: string;
  caption: string | null;
  category: string;
  city: string | null;
  country: string | null;
  tags: string[] | null;
  rating: number | null;
  rating_avg: number;
  saves_count: number;
  review_count: number;
  engagement_score: number;
  created_at: string;
  user_id: string;
  is_sponsored: boolean;
  photos: { url: string; thumbnail_url: string | null }[];
  author: { display_name: string | null; avatar_url: string | null; username: string | null } | null;
}

const useDiscoverExperiencesLocal = () => {
  return useQuery({
    queryKey: ["discover-experiences"],
    queryFn: async () => {
      const { data: experiences, error } = await supabase
        .from("experiences")
        .select("*")
        .eq("visibility", "public")
        .order("engagement_score", { ascending: false })
        .limit(50);

      if (error) throw error;

      const userIds = [...new Set((experiences || []).map((e) => e.user_id))];
      const expIds = (experiences || []).map((e) => e.id);

      const [attachRes, profileRes] = await Promise.all([
        expIds.length > 0
          ? supabase.from("experience_attachments").select("experience_id, url, thumbnail_url").in("experience_id", expIds).eq("attachment_type", "photo")
          : { data: [], error: null },
        userIds.length > 0
          ? supabase.from("profiles").select("user_id, display_name, avatar_url, username").in("user_id", userIds)
          : { data: [], error: null },
      ]);

      const photoMap = new Map<string, { url: string; thumbnail_url: string | null }[]>();
      (attachRes.data || []).forEach((a) => {
        const arr = photoMap.get(a.experience_id) || [];
        arr.push({ url: a.url, thumbnail_url: a.thumbnail_url });
        photoMap.set(a.experience_id, arr);
      });

      const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null; username: string | null }>();
      (profileRes.data || []).forEach((p) => {
        profileMap.set(p.user_id, p);
      });

      return (experiences || []).map((e) => ({
        ...e,
        photos: photoMap.get(e.id) || [],
        author: profileMap.get(e.user_id) || null,
      })) as DiscoverExperience[];
    },
  });
};

const useTrendingCities = () => {
  return useQuery({
    queryKey: ["trending-cities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("city, country")
        .eq("visibility", "public")
        .not("city", "is", null);

      if (error) throw error;

      const cityCount = new Map<string, { city: string; country: string; count: number }>();
      (data || []).forEach((e) => {
        if (!e.city) return;
        const key = `${e.city}-${e.country}`;
        const existing = cityCount.get(key);
        if (existing) existing.count++;
        else cityCount.set(key, { city: e.city, country: e.country || "", count: 1 });
      });

      return Array.from(cityCount.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    },
  });
};

const categoryEmoji: Record<string, string> = {
  Food: "🍽️",
  Culture: "🏛️",
  Nature: "🌿",
  Nightlife: "🌙",
  general: "📍",
};

const ExperienceCard = ({
  exp,
  index,
  isHelpful,
  isFavorited,
  onToggleHelpful,
  onToggleFavorite,
  onAddToTrip,
}: {
  exp: DiscoverExperience;
  index: number;
  isHelpful: boolean;
  isFavorited: boolean;
  onToggleHelpful: (id: string, current: boolean) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onAddToTrip: (exp: DiscoverExperience) => void;
}) => {
  const photo = exp.photos[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/20 hover:shadow-lg transition-all duration-300"
    >
      {/* Photo */}
      {photo ? (
        <div className="relative h-40 overflow-hidden bg-muted">
          <img
            src={photo.thumbnail_url || photo.url}
            alt={exp.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {exp.is_sponsored && (
            <span className="absolute top-2 left-2 text-[9px] font-semibold text-primary-foreground bg-primary/80 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Featured
            </span>
          )}
          <span className="absolute top-2 right-2 text-[10px] font-medium text-foreground bg-card/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {categoryEmoji[exp.category] || "📍"} {exp.category}
          </span>
        </div>
      ) : (
        <div className="relative h-24 bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center">
          <span className="text-4xl">{categoryEmoji[exp.category] || "📍"}</span>
          {exp.is_sponsored && (
            <span className="absolute top-2 left-2 text-[9px] font-semibold text-primary-foreground bg-primary/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Featured
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {exp.title}
        </h3>

        {(exp.city || exp.country) && (
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{[exp.city, exp.country].filter(Boolean).join(", ")}</span>
          </div>
        )}

        {exp.caption && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{exp.caption}</p>}

        {/* Tags */}
        {exp.tags && exp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {exp.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border">
          {/* Wishlist / Favorite */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(exp.id, isFavorited);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              isFavorited
                ? "bg-primary/10 text-primary"
                : "bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            }`}
            title={isFavorited ? "Saved to Wishlist" : "Keep it for later"}
          >
            <Heart className={`w-3 h-3 ${isFavorited ? "fill-primary" : ""}`} />
            {isFavorited ? "Saved" : "Wishlist"}
          </button>

          {/* Visited */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toast.info("Mark as visited coming soon!");
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-muted/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
            title="Mark your experience"
          >
            <CheckCircle2 className="w-3 h-3" />
            Visited
          </button>

          {/* Add to Trip */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToTrip(exp);
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-muted/60 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all"
            title="Plan it with friends"
          >
            <Plane className="w-3 h-3" />
            Trip
          </button>

          <div className="flex-1" />

          {/* Helpful */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleHelpful(exp.id, isHelpful);
            }}
            className={`flex items-center gap-0.5 transition-colors ${isHelpful ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
            title={isHelpful ? "Marked as helpful" : "Mark as helpful"}
          >
            <ThumbsUp className={`w-3 h-3 ${isHelpful ? "fill-primary" : ""}`} />
          </button>
        </div>

        {/* Engagement row */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            {exp.rating_avg > 0 && (
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-gold fill-gold" />
                <span className="text-xs font-medium text-foreground">{Number(exp.rating_avg).toFixed(1)}</span>
              </div>
            )}
            {exp.saves_count > 0 && (
              <div className="flex items-center gap-0.5">
                <Bookmark className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{exp.saves_count}</span>
              </div>
            )}
            {exp.review_count > 0 && (
              <div className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{exp.review_count}</span>
              </div>
            )}
          </div>

          {/* Author */}
          {exp.author && (
            <div className="flex items-center gap-1.5">
              {exp.author.avatar_url ? (
                <img src={exp.author.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-[9px] font-medium text-muted-foreground">{(exp.author.display_name || "?")[0]}</span>
                </div>
              )}
              <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">
                {exp.author.display_name || exp.author.username || "Traveler"}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Discover = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category>("All");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [tripDialogExp, setTripDialogExp] = useState<DiscoverExperience | null>(null);

  const { user } = useAuth();
  const { data: experiences = [], isLoading } = useDiscoverExperiencesLocal();
  const { data: trendingCities = [] } = useTrendingCities();
  const { data: helpfulSet = new Set<string>() } = useUserHelpfulMarks();
  const { data: favoriteIds = new Set<string>() } = useFavoriteExperienceIds();
  const toggleHelpful = useToggleHelpful();
  const toggleFavorite = useToggleFavoriteExperience();

  const handleToggleHelpful = (experienceId: string, isHelpful: boolean) => {
    if (!user) { toast.error("Sign in to mark as helpful"); return; }
    toggleHelpful.mutate({ experienceId, isHelpful }, { onError: () => toast.error("Could not update") });
  };

  const handleToggleFavorite = (experienceId: string, isFavorited: boolean) => {
    if (!user) { toast.error("Sign in to save experiences"); return; }
    toggleFavorite.mutate(
      { experienceId, isFavorite: isFavorited },
      {
        onSuccess: () => toast.success(isFavorited ? "Removed from favorites" : "Saved to favorites 🤍"),
        onError: () => toast.error("Could not update"),
      }
    );
  };

  const handleAddToTrip = (exp: DiscoverExperience) => {
    if (!user) { toast.error("Sign in to add to a trip"); return; }
    setTripDialogExp(exp);
  };

  const filtered = useMemo(() => {
    let result = experiences;

    // Featured first (max 2), then organic
    const featured = result.filter((e) => e.is_sponsored).slice(0, 2);
    const organic = result.filter((e) => !e.is_sponsored);
    result = [...featured, ...organic];

    if (activeCategory !== "All") {
      result = result.filter((e) => e.category.toLowerCase() === activeCategory.toLowerCase());
    }

    if (selectedCity) {
      result = result.filter((e) => e.city === selectedCity);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.caption?.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q) ||
          e.country?.toLowerCase().includes(q) ||
          e.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [experiences, activeCategory, selectedCity, search]);

  const hasFeatured = filtered.some((e) => e.is_sponsored);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[72px] px-4 sm:px-6 pb-16 max-w-5xl mx-auto">
        {/* Header — warm discovery copy */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-primary" />
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">Discover</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Find places worth experiencing 🌿 — save them, mark what you've done, or add them to your trip.
          </p>
        </motion.div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search experiences, cities, tags..." className="pl-9 h-10 rounded-xl bg-card border-border" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/20"
              }`}
            >
              {cat !== "All" && <span className="mr-1">{categoryEmoji[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Trending city chips */}
        {trendingCities.length > 0 && !search && activeCategory === "All" && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs font-medium text-muted-foreground">Trending cities</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {selectedCity && (
                <button
                  onClick={() => setSelectedCity(null)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20"
                >
                  <X className="w-3 h-3 inline mr-1" />
                  Clear
                </button>
              )}
              {trendingCities.map((c) => (
                <button
                  key={c.city}
                  onClick={() => setSelectedCity(selectedCity === c.city ? null : c.city)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCity === c.city
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  <MapPin className="w-3 h-3 inline mr-1" />
                  {c.city}
                  <span className="ml-1 opacity-60">({c.count})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Featured trust label — only when featured exist */}
        {hasFeatured && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 mb-4 px-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">Featured</span>
              <FeaturedTooltip />
            </div>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground italic">We highlight quality — not just popularity.</span>
          </motion.div>
        )}

        {/* Results grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="h-40 bg-muted" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Compass className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No experiences found</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search or category</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((exp, i) => (
              <ExperienceCard
                key={exp.id}
                exp={exp}
                index={i}
                isHelpful={helpfulSet.has(exp.id)}
                isFavorited={favoriteIds.has(exp.id)}
                onToggleHelpful={handleToggleHelpful}
                onToggleFavorite={handleToggleFavorite}
                onAddToTrip={handleAddToTrip}
              />
            ))}
          </div>
        )}

        {/* Trust reassurance footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="text-center mt-8 space-y-1">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} experience{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Shield className="w-3 h-3" />
              <span>Every recommendation is curated — featured places still have to earn their spot.</span>
            </div>
          </div>
        )}
      </div>

      {/* Add to Trip dialog */}
      {tripDialogExp && (
        <AddToTripDialog
          open={!!tripDialogExp}
          onOpenChange={(open) => !open && setTripDialogExp(null)}
          experienceId={tripDialogExp.id}
          experienceTitle={tripDialogExp.title}
        />
      )}
    </div>
  );
};

export default Discover;
