import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Star, Heart, Calendar, Tag, ChevronRight, Flag } from "lucide-react";
import { Pin } from "@/types/travel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AuthenticityMeter from "@/components/AuthenticityMeter";
import ReportDialog from "@/components/ReportDialog";

interface LocationPanelProps {
  pin: Pin | null;
  onClose: () => void;
}

const LocationPanel = ({ pin, onClose }: LocationPanelProps) => {
  const [showReport, setShowReport] = useState(false);

  const { data: reviewScore } = useQuery({
    queryKey: ["review-score", pin?.id],
    enabled: !!pin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_scores")
        .select("authenticity_score, depth_score, has_photos, has_detailed_notes, has_specific_tags")
        .eq("place_id", pin!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!pin) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          key={pin.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-[73px] right-4 bottom-4 w-[360px] z-[1000] bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="relative p-6 pb-4">
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <button
                onClick={() => setShowReport(true)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Report"
              >
                <Flag className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  pin.type === "visited" ? "bg-visited/15 text-visited" : "bg-wishlist/15 text-wishlist"
                }`}
              >
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  {pin.name}
                </h2>
                <p className="text-sm text-muted-foreground">{pin.country}</p>
              </div>
            </div>
          </div>

          {/* Status badge + Authenticity */}
          <div className="px-6 pb-4 flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                pin.type === "visited"
                  ? "bg-visited/15 text-visited"
                  : "bg-wishlist/15 text-wishlist"
              }`}
            >
              {pin.type === "visited" ? (
                <Star className="w-3 h-3" />
              ) : (
                <Heart className="w-3 h-3" />
              )}
              {pin.type === "visited" ? "Visited" : "Wishlist"}
            </span>
            {reviewScore && (
              <AuthenticityMeter score={reviewScore.authenticity_score} compact />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-5">
            {/* Rating */}
            {pin.type === "visited" && pin.rating > 0 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < pin.rating ? "text-gold fill-gold" : "text-muted"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Date */}
            {pin.dateVisited && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(pin.dateVisited).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}

            {/* Notes */}
            <div>
              <p className="text-sm leading-relaxed text-foreground/80">{pin.notes}</p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {pin.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-muted-foreground"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Authenticity detail */}
            {reviewScore && pin.type === "visited" && (
              <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                <AuthenticityMeter score={reviewScore.authenticity_score} />
                <div className="flex flex-wrap gap-1.5">
                  {reviewScore.has_detailed_notes && (
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium">Detailed Notes</span>
                  )}
                  {reviewScore.has_photos && (
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium">Photos</span>
                  )}
                  {reviewScore.has_specific_tags && (
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-medium">Rich Tags</span>
                  )}
                </div>
              </div>
            )}

            {/* Discover section for wishlist */}
            {pin.type === "wishlist" && (
              <div className="pt-2 space-y-3">
                <h3 className="font-display text-lg font-medium text-foreground">
                  Discover
                </h3>
                {["Experiences", "Restaurants", "Hidden Gems", "Hotels"].map(
                  (category) => (
                    <button
                      key={category}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/60 hover:bg-muted transition-colors group"
                    >
                      <span className="text-sm font-medium text-foreground/80">
                        {category}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {showReport && (
        <ReportDialog placeId={pin.id} onClose={() => setShowReport(false)} />
      )}
    </>
  );
};

export default LocationPanel;
