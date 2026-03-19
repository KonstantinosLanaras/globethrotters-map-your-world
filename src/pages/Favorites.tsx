import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import {
  Star, MapPin, Calendar, Plane, Heart,
  Utensils, Landmark, TreePine, Mountain, Moon, Compass, Building2, Gem, Home, Layers
} from "lucide-react";
import {
  useFavoriteExperiences, useFavoriteJourneys,
  useToggleFavoriteExperience, useToggleFavoriteJourney,
  FavoriteExperience, FavoriteJourney,
} from "@/hooks/useFavorites";
import { toast } from "sonner";

const CATEGORY_META: Record<string, { label: string; icon: any; emoji: string }> = {
  food: { label: "Food", icon: Utensils, emoji: "🍽️" },
  culture: { label: "Culture", icon: Landmark, emoji: "🏛️" },
  nature: { label: "Nature", icon: TreePine, emoji: "🌿" },
  hike: { label: "Hiking", icon: Mountain, emoji: "🥾" },
  nightlife: { label: "Nightlife", icon: Moon, emoji: "🌙" },
  beach: { label: "Beach", icon: Compass, emoji: "🏖️" },
  museum: { label: "Museum", icon: Building2, emoji: "🎨" },
  hidden_gem: { label: "Hidden Gem", icon: Gem, emoji: "💎" },
  stay: { label: "Stay", icon: Home, emoji: "🏨" },
  general: { label: "Other", icon: Layers, emoji: "📌" },
};

const Favorites = () => {
  const { data: favExperiences = [], isLoading: loadingExp } = useFavoriteExperiences();
  const { data: favJourneys = [], isLoading: loadingJourneys } = useFavoriteJourneys();
  const toggleFavExp = useToggleFavoriteExperience();
  const toggleFavJourney = useToggleFavoriteJourney();
  const [view, setView] = useState<"experiences" | "trips">("experiences");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const isLoading = loadingExp || loadingJourneys;

  // Group experiences by category
  const grouped = useMemo(() => {
    const groups: Record<string, FavoriteExperience[]> = {};
    for (const exp of favExperiences) {
      const cat = exp.category || "general";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(exp);
    }
    return groups;
  }, [favExperiences]);

  const categoryKeys = Object.keys(grouped).sort((a, b) => {
    const aLabel = CATEGORY_META[a]?.label || a;
    const bLabel = CATEGORY_META[b]?.label || b;
    return aLabel.localeCompare(bLabel);
  });

  const filteredGroups = filterCategory
    ? { [filterCategory]: grouped[filterCategory] || [] }
    : grouped;

  const handleRemoveExp = (id: string) => {
    toggleFavExp.mutate(
      { experienceId: id, isFavorite: true },
      { onSuccess: () => toast.success("Removed from favorites") }
    );
  };

  const handleRemoveJourney = (id: string) => {
    toggleFavJourney.mutate(
      { journeyId: id, isFavorite: true },
      { onSuccess: () => toast.success("Removed from favorites") }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[80px] px-4 pb-12 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            Favorites
          </h1>
          <p className="text-sm text-muted-foreground">Your best travel memories, curated</p>
        </div>

        {/* View toggle */}
        <div className="flex gap-0.5 mb-4 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => setView("experiences")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              view === "experiences" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            Experiences ({favExperiences.length})
          </button>
          <button
            onClick={() => setView("trips")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
              view === "trips" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            Trips ({favJourneys.length})
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" />
          </div>
        ) : view === "experiences" ? (
          <>
            {/* Category filter chips */}
            {categoryKeys.length > 1 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    !filterCategory
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All
                </button>
                {categoryKeys.map((cat) => {
                  const meta = CATEGORY_META[cat] || CATEGORY_META.general;
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        filterCategory === cat
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {meta.emoji} {meta.label} ({grouped[cat].length})
                    </button>
                  );
                })}
              </div>
            )}

            {favExperiences.length === 0 ? (
              <EmptyState
                icon={<Star className="w-10 h-10 text-muted-foreground/20" />}
                title="No favorite experiences yet"
                subtitle="Star your best experiences to curate your travel highlights"
              />
            ) : (
              <div className="space-y-6">
                {Object.entries(filteredGroups).map(([cat, exps]) => {
                  if (!exps || exps.length === 0) return null;
                  const meta = CATEGORY_META[cat] || CATEGORY_META.general;
                  return (
                    <div key={cat}>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <span>{meta.emoji}</span> {meta.label}
                      </h3>
                      <div className="space-y-2">
                        {exps.map((exp, i) => (
                          <FavExpCard key={exp.id} exp={exp} index={i} onRemove={handleRemoveExp} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            {favJourneys.length === 0 ? (
              <EmptyState
                icon={<Plane className="w-10 h-10 text-muted-foreground/20" />}
                title="No favorite trips yet"
                subtitle="Star your favorite journeys to highlight them"
              />
            ) : (
              <div className="space-y-3">
                {favJourneys.map((j, i) => (
                  <FavJourneyCard key={j.id} journey={j} index={i} onRemove={handleRemoveJourney} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const FavExpCard = ({ exp, index, onRemove }: { exp: FavoriteExperience; index: number; onRemove: (id: string) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.03 }}
    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/10 transition-colors"
  >
    {exp.photos[0] ? (
      <img src={exp.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
    ) : (
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <MapPin className="w-4 h-4 text-muted-foreground" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground truncate">{exp.title}</p>
      <p className="text-[10px] text-muted-foreground truncate">
        {exp.city}{exp.country ? `, ${exp.country}` : ""}
        {exp.experience_date ? ` · ${new Date(exp.experience_date).toLocaleDateString()}` : ""}
      </p>
    </div>
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {exp.rating > 0 && (
        <div className="flex items-center gap-0.5">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-[10px] font-medium text-foreground">{exp.rating}</span>
        </div>
      )}
      <button
        onClick={() => onRemove(exp.id)}
        className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
        title="Remove from favorites"
      >
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      </button>
    </div>
  </motion.div>
);

const FavJourneyCard = ({ journey: j, index, onRemove }: { journey: FavoriteJourney; index: number; onRemove: (id: string) => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.03 }}
    className="p-4 rounded-2xl bg-card border border-border hover:border-primary/10 transition-colors"
  >
    <div className="flex items-center gap-3">
      {j.cover_image_url ? (
        <img src={j.cover_image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 text-2xl">
          {j.emoji || "✈️"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{j.title}</p>
        {j.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{j.description}</p>}
        <div className="flex items-center gap-2 mt-1">
          {j.destinations.length > 0 && (
            <span className="text-[10px] text-muted-foreground truncate">
              {j.destinations.slice(0, 3).join(", ")}
            </span>
          )}
          {(j.start_date || j.end_date) && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" />
              {j.start_date ? new Date(j.start_date).toLocaleDateString() : ""}
              {j.start_date && j.end_date ? " – " : ""}
              {j.end_date ? new Date(j.end_date).toLocaleDateString() : ""}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onRemove(j.id)}
        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
        title="Remove from favorites"
      >
        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
      </button>
    </div>
  </motion.div>
);

const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="text-center py-16">
    <div className="mx-auto mb-4">{icon}</div>
    <h3 className="font-display text-lg font-medium text-foreground mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{subtitle}</p>
  </div>
);

export default Favorites;
