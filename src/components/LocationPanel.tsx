import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Star, Heart, Calendar, Tag, ChevronRight, Flag, Bookmark, Plus, Utensils, Mountain, Landmark, Camera, Train, Gem } from "lucide-react";
import { Pin } from "@/types/travel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AuthenticityMeter from "@/components/AuthenticityMeter";
import ReportDialog from "@/components/ReportDialog";
import AddToListDialog from "@/components/AddToListDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAddPlace } from "@/hooks/usePlaces";
import { toast } from "sonner";

interface LocationPanelProps {
  pin: Pin | null;
  onClose: () => void;
}

const activityCategories = [
  { icon: <Utensils className="w-4 h-4" />, label: "Food & Dining", color: "text-visited" },
  { icon: <Mountain className="w-4 h-4" />, label: "Hiking & Nature", color: "text-ocean" },
  { icon: <Landmark className="w-4 h-4" />, label: "Culture & Monuments", color: "text-gold" },
  { icon: <Camera className="w-4 h-4" />, label: "Scenic Views", color: "text-primary" },
  { icon: <Train className="w-4 h-4" />, label: "Transport & Routes", color: "text-secondary" },
  { icon: <Gem className="w-4 h-4" />, label: "Hidden Gems", color: "text-terracotta" },
];

const LocationPanel = ({ pin, onClose }: LocationPanelProps) => {
  const [showReport, setShowReport] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);
  const { user } = useAuth();
  const addPlace = useAddPlace();

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

  const { data: photos = [] } = useQuery({
    queryKey: ["place-photos", pin?.id],
    enabled: !!pin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("url, caption")
        .eq("place_id", pin!.id)
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!pin) return null;

  const handleMarkVisited = async () => {
    if (!user) return;
    try {
      await addPlace.mutateAsync({
        name: pin.name,
        country: pin.country,
        lat: pin.lat,
        lng: pin.lng,
        type: "visited",
        tags: pin.tags,
        rating: 0,
        notes: "",
        date_visited: new Date().toISOString().split("T")[0],
      });
      toast.success(`Marked ${pin.name} as visited!`);
    } catch {
      toast.error("Failed to mark as visited");
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          key={pin.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-[65px] right-4 bottom-4 w-[380px] z-[1000] bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Photos strip */}
          {photos.length > 0 && (
            <div className="flex gap-1 p-2 pb-0 overflow-x-auto">
              {photos.slice(0, 4).map((photo, i) => (
                <div key={i} className="w-[90px] h-[70px] rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                  <img src={photo.url} alt={photo.caption || ""} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Header */}
          <div className="relative p-5 pb-3">
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <button
                onClick={() => setShowReport(true)}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                title="Report"
              >
                <Flag className="w-3 h-3 text-muted-foreground" />
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-start gap-3 pr-16">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  pin.type === "visited" ? "bg-visited/15 text-visited" : "bg-wishlist/15 text-wishlist"
                }`}
              >
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground leading-tight">
                  {pin.name}
                </h2>
                <p className="text-sm text-muted-foreground">{pin.country}</p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="px-5 pb-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                pin.type === "visited"
                  ? "bg-visited/15 text-visited"
                  : "bg-wishlist/15 text-wishlist"
              }`}
            >
              {pin.type === "visited" ? <Star className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
              {pin.type === "visited" ? "Visited" : "Wishlist"}
            </span>
            {reviewScore && (
              <AuthenticityMeter score={reviewScore.authenticity_score} compact />
            )}
            <div className="flex-1" />
            <button
              onClick={() => setShowAddToList(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
            >
              <Bookmark className="w-3 h-3" />
              Save
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
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
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(pin.dateVisited).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}

            {/* Notes */}
            {pin.notes && (
              <p className="text-sm leading-relaxed text-foreground/80">{pin.notes}</p>
            )}

            {/* Tags */}
            {pin.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pin.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Authenticity detail */}
            {reviewScore && pin.type === "visited" && (
              <div className="p-3 rounded-xl bg-muted/50 space-y-2">
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

            {/* Activity categories */}
            <div className="pt-2 space-y-2">
              <h3 className="font-display text-base font-medium text-foreground">
                Activities in {pin.name}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {activityCategories.map((cat) => (
                  <button
                    key={cat.label}
                    className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group text-left"
                  >
                    <span className={cat.color}>{cat.icon}</span>
                    <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mark as visited CTA for wishlist items */}
            {pin.type === "wishlist" && (
              <button
                onClick={handleMarkVisited}
                disabled={addPlace.isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-visited/10 text-visited font-medium text-sm hover:bg-visited/15 transition-colors"
              >
                <Star className="w-4 h-4" />
                Mark as Visited
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {showReport && (
        <ReportDialog placeId={pin.id} onClose={() => setShowReport(false)} />
      )}

      {showAddToList && (
        <AddToListDialog
          placeId={pin.id}
          placeName={pin.name}
          onClose={() => setShowAddToList(false)}
        />
      )}
    </>
  );
};

export default LocationPanel;
