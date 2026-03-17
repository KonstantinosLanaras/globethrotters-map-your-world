import { motion } from "framer-motion";
import { Sparkles, MapPin, Heart, Loader2, ArrowRight } from "lucide-react";
import { useSuggestions, Suggestion } from "@/hooks/useSuggestions";
import { useAddPlace } from "@/hooks/usePlaces";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const RecommendationsSection = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: suggestions = [], isLoading } = useSuggestions();
  const addPlace = useAddPlace();
  const navigate = useNavigate();

  const hasProfile = !!(profile?.personality || (profile?.interests && profile.interests.length > 0));

  if (!hasProfile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 p-5 rounded-2xl bg-card border border-border"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Recommended for You</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Complete your travel profile to unlock personalized destination suggestions.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Complete Profile <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  const handleSaveToWishlist = async (s: Suggestion) => {
    if (!user) return;
    try {
      await addPlace.mutateAsync({
        name: s.name,
        country: s.country,
        lat: s.lat,
        lng: s.lng,
        type: "wishlist",
        tags: s.tags,
        rating: 0,
        notes: s.reason,
        date_visited: null,
      });
      toast.success(`${s.name} added to wishlist!`);
    } catch (err: any) {
      if (err?.message?.includes("Already")) {
        toast.info(err.message);
      } else {
        toast.error("Failed to save");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-4 left-4 right-4 z-[900] max-w-[600px]"
    >
      <div className="p-4 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm font-semibold text-foreground">Recommended for You</h3>
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        </div>

        {suggestions.length > 0 ? (
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {suggestions.slice(0, 6).map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex-shrink-0 w-[180px] p-3 rounded-xl bg-muted/50 border border-border/50 hover:border-primary/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.country}</p>
                  </div>
                  <span className="text-[10px] font-mono text-primary/70">{s.match_score}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-2 line-clamp-2">{s.reason}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {s.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded-md bg-primary/8 text-[9px] font-medium text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleSaveToWishlist(s)}
                  disabled={addPlace.isPending}
                  className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-wishlist/10 text-wishlist text-[11px] font-medium hover:bg-wishlist/20 transition-colors"
                >
                  <Heart className="w-3 h-3" />
                  Save to Wishlist
                </button>
              </motion.div>
            ))}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

export default RecommendationsSection;
