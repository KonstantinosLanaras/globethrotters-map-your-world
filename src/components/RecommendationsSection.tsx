import { motion } from "framer-motion";
import { Sparkles, Heart, Loader2, ArrowRight, X } from "lucide-react";
import { useSuggestions, Suggestion } from "@/hooks/useSuggestions";
import { useAddPlace } from "@/hooks/usePlaces";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

interface RecommendationsSectionProps {
  onClose?: () => void;
}

const RecommendationsSection = ({ onClose }: RecommendationsSectionProps) => {
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
        className="mx-4 mt-4 rounded-2xl border border-border bg-card p-5"
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold text-foreground">Recommended for You</h3>
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={onClose}
              aria-label="Close recommendations"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mb-3 text-sm text-muted-foreground">
          Complete your travel profile to unlock personalized destination suggestions.
        </p>
        <button
          onClick={() => navigate("/profile")}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Complete Profile <ArrowRight className="h-3.5 w-3.5" />
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
      <div className="rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold text-foreground">Recommended for You</h3>
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={onClose}
              aria-label="Close recommendations"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {suggestions.length > 0 ? (
          <div className="scrollbar-hide -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
            {suggestions.slice(0, 6).map((s, i) => (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="group w-[180px] flex-shrink-0 rounded-xl border border-border/50 bg-muted/50 p-3 transition-all hover:border-primary/20"
              >
                <div className="mb-1.5 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold leading-tight text-foreground">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.country}</p>
                  </div>
                  <span className="text-[10px] font-mono text-primary/70">{s.match_score}%</span>
                </div>
                <p className="mb-2 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">{s.reason}</p>
                <div className="mb-2 flex flex-wrap gap-1">
                  {s.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-md bg-primary/8 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleSaveToWishlist(s)}
                  disabled={addPlace.isPending}
                  className="w-full rounded-lg bg-wishlist/10 py-1.5 text-[11px] font-medium text-wishlist transition-colors hover:bg-wishlist/20"
                >
                  <span className="flex items-center justify-center gap-1">
                    <Heart className="h-3 w-3" />
                    Save to Wishlist
                  </span>
                </button>
              </motion.div>
            ))}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
};

export default RecommendationsSection;
