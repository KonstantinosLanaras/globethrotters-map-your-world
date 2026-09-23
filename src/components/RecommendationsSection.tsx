import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, Loader2, ArrowRight, Plus, X, ExternalLink } from "lucide-react";
import { useSuggestions, Suggestion } from "@/hooks/useSuggestions";
import { useAddPlace } from "@/hooks/usePlaces";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { destinationLinks, trackOutboundClick } from "@/lib/externalLinks";

interface RecommendationsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
}

const RecommendationsSection = ({ isOpen, onToggle }: RecommendationsSectionProps) => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: suggestions = [], isLoading } = useSuggestions();
  const addPlace = useAddPlace();
  const navigate = useNavigate();

  const hasProfile = !!(profile?.personality || (profile?.interests && profile.interests.length > 0));

  const handleSaveToWishlist = async (s: Suggestion) => {
    if (!user) return;
    try {
      await addPlace.mutateAsync({
        name: s.name,
        country: s.country,
        city: s.name,
        lat: s.lat,
        lng: s.lng,
        type: "wishlist",
        tags: s.tags,
        rating: 0,
        notes: s.reason,
        date_visited: null,
      });
      toast.success(`${s.name} added to wishlist!`);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("Already")) {
        toast.info(err.message);
      } else {
        toast.error("Failed to save");
      }
    }
  };

  return (
    <div className="absolute bottom-5 left-5 z-[900]">
      {/* FAB button */}
      <motion.button
        onClick={onToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary/90"
        aria-label={isOpen ? "Close recommendations" : "Open recommendations"}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-5 w-5" />
            </motion.div>
          ) : (
            <motion.div key="plus" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Plus className="h-5 w-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 left-0 w-[340px] rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-xl sm:w-[480px]"
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-display text-sm font-semibold text-foreground">Recommended for You</h3>
              {isLoading && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            {!hasProfile ? (
              <div>
                <p className="mb-3 text-sm text-muted-foreground">
                  Complete your travel profile to unlock personalized destination suggestions.
                </p>
                <button
                  onClick={() => navigate("/profile")}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  Complete Profile <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : suggestions.length > 0 ? (
              <div className="scrollbar-hide -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
                {suggestions.slice(0, 6).map((s, i) => (
                  <motion.div
                    key={s.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="group w-[160px] flex-shrink-0 rounded-xl border border-border/50 bg-muted/50 p-3 transition-all hover:border-primary/20"
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
                      className="w-full rounded-lg bg-accent/50 py-1.5 text-[11px] font-medium text-accent-foreground transition-colors hover:bg-accent"
                    >
                      <span className="flex items-center justify-center gap-1">
                        <Heart className="h-3 w-3" />
                        Save to Wishlist
                      </span>
                    </button>
                    <div className="mt-1.5 grid grid-cols-2 gap-1">
                      {destinationLinks(s.name, s.country).map((link) => (
                        <a
                          key={link.provider}
                          href={link.url}
                          target="_blank"
                          rel="sponsored noopener noreferrer"
                          onClick={() => trackOutboundClick(link.provider, "destination", s.name, `${s.name}, ${s.country}`)}
                          className="flex items-center justify-center gap-1 rounded-lg bg-muted px-1 py-1.5 text-[10px] font-medium text-foreground hover:bg-muted/80"
                          aria-label={`${link.label} in ${s.name} (opens an external website)`}
                        >
                          <ExternalLink className="h-2.5 w-2.5" />
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : null}
            {suggestions.length > 0 && (
              <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
                External providers set availability and prices. Globetrotters does not complete the booking.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RecommendationsSection;
