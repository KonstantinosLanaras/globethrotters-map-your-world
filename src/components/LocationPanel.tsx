import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Star, Heart, Calendar, Tag, Flag, Bookmark,
  Utensils, Mountain, Landmark, Camera, Train, Gem,
  Loader2, Clock, Gauge, Share2, Plane, Info, ShieldCheck, Sparkles, CheckCircle2, Send,
} from "lucide-react";
import { Pin } from "@/types/travel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AuthenticityMeter from "@/components/AuthenticityMeter";
import ReportDialog from "@/components/ReportDialog";
import AddToListDialog from "@/components/AddToListDialog";
import RatingModal from "@/components/RatingModal";
import ShareModal, { ShareableExperience } from "@/components/ShareModal";
import AddToTripDialog from "@/components/AddToTripDialog";
import FeaturedTooltip from "@/components/FeaturedTooltip";
import { useAuth } from "@/hooks/useAuth";
import { useAddPlace } from "@/hooks/usePlaces";
import { useActivities, Activity } from "@/hooks/useActivities";
import { toast } from "sonner";

interface LocationPanelProps {
  pin: Pin | null;
  onClose: () => void;
}

const categoryConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  food: { icon: <Utensils className="w-3.5 h-3.5" />, color: "bg-visited/15 text-visited", label: "Food" },
  hiking: { icon: <Mountain className="w-3.5 h-3.5" />, color: "bg-ocean/15 text-ocean", label: "Nature" },
  nature: { icon: <Mountain className="w-3.5 h-3.5" />, color: "bg-ocean/15 text-ocean", label: "Nature" },
  culture: { icon: <Landmark className="w-3.5 h-3.5" />, color: "bg-gold/15 text-gold", label: "Culture" },
  scenic: { icon: <Camera className="w-3.5 h-3.5" />, color: "bg-primary/15 text-primary", label: "Scenic" },
  transport: { icon: <Train className="w-3.5 h-3.5" />, color: "bg-secondary/15 text-secondary", label: "Transport" },
  hidden_gem: { icon: <Gem className="w-3.5 h-3.5" />, color: "bg-terracotta/15 text-terracotta", label: "Hidden Gem" },
};

const difficultyColors: Record<string, string> = {
  easy: "text-ocean",
  moderate: "text-gold",
  challenging: "text-destructive",
};

const LocationPanel = ({ pin, onClose }: LocationPanelProps) => {
  const [showReport, setShowReport] = useState(false);
  const [showAddToList, setShowAddToList] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTripDialog, setShowTripDialog] = useState(false);
  const [shareActivityName, setShareActivityName] = useState<string | null>(null);
  const [tripActivityName, setTripActivityName] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { user } = useAuth();
  const addPlace = useAddPlace();

  const { activities, loading: activitiesLoading, error: activitiesError } = useActivities(
    pin?.name ?? null,
    pin?.country ?? null
  );

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

  const isVisited = pin.type === "visited";
  const isWishlist = pin.type === "wishlist";

  const handleMarkVisited = async () => {
    if (!user) { toast.error("Sign in to mark as visited"); return; }
    try {
      await addPlace.mutateAsync({
        name: pin.name, country: pin.country, city: pin.name,
        lat: pin.lat, lng: pin.lng, type: "visited",
        tags: pin.tags, rating: 0, notes: "",
        date_visited: new Date().toISOString().split("T")[0],
      });
      toast.success(`Marked ${pin.name} as visited!`);
    } catch { toast.error("Failed to mark as visited"); }
  };

  const handleMarkWishlist = async () => {
    if (!user) { toast.error("Sign in to add to wishlist"); return; }
    try {
      await addPlace.mutateAsync({
        name: pin.name, country: pin.country, city: pin.name,
        lat: pin.lat, lng: pin.lng, type: "wishlist",
        tags: pin.tags, rating: 0, notes: "", date_visited: null,
      });
      toast.success(`Added ${pin.name} to wishlist!`);
    } catch { toast.error("Failed to add to wishlist"); }
  };

  const handleRateClick = () => {
    if (!isVisited) { toast.info("You can rate this after marking it as Visited."); return; }
    setShowRating(true);
  };

  const handleAddToTrip = () => {
    if (!user) { toast.error("Sign in to add to a trip"); return; }
    setShowTripDialog(true);
  };

  const currentShareTitle = shareActivityName || pin.name;
  const shareItem: ShareableExperience = {
    type: "experience", id: pin.id, title: currentShareTitle,
    city: pin.name, country: pin.country, category: "destination",
    rating: pin.rating > 0 ? pin.rating : undefined,
  };

  const currentTripTitle = tripActivityName || pin.name;

  const filteredActivities = activeCategory
    ? activities.filter((a) => a.category === activeCategory)
    : activities;

  const uniqueCategories = [...new Set(activities.map((a) => a.category))];

  return (
    <>
      <AnimatePresence>
        <motion.div
          key={pin.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 30 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-[65px] right-4 bottom-4 w-[390px] z-[1000] bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
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
              <button onClick={() => setShowReport(true)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors" title="Report">
                <Flag className="w-3 h-3 text-muted-foreground" />
              </button>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex items-start gap-3 pr-16">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isVisited ? "bg-visited/15 text-visited" : "bg-wishlist/15 text-wishlist"}`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground leading-tight">{pin.name}</h2>
                <p className="text-sm text-muted-foreground">{pin.country}</p>
              </div>
            </div>
          </div>

          {/* ===== Primary Action Row ===== */}
          <div className="px-5 pb-3 flex items-center gap-1.5 flex-wrap">
            <button
              onClick={handleMarkVisited}
              disabled={addPlace.isPending}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isVisited ? "bg-visited text-white" : "bg-visited/10 text-visited hover:bg-visited/20"
              }`}
            >
              <Star className="w-3 h-3" />
              Visited{isVisited ? " ✓" : ""}
            </button>

            <button
              onClick={handleMarkWishlist}
              disabled={addPlace.isPending}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isWishlist ? "bg-wishlist text-white" : "bg-wishlist/10 text-wishlist hover:bg-wishlist/20"
              }`}
            >
              <Heart className="w-3 h-3" />
              Wishlist{isWishlist ? " ✓" : ""}
            </button>

            <button
              onClick={handleRateClick}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isVisited ? "bg-gold/10 text-gold hover:bg-gold/20" : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              }`}
              title={isVisited ? "Rate this place" : "You can rate this after marking it as Visited."}
            >
              <Star className="w-3 h-3" />
              Rate
            </button>

            <button
              onClick={handleAddToTrip}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all"
              title="Plan it with friends"
            >
              <Plane className="w-3 h-3" />
              Trip
            </button>

            <div className="flex-1" />

            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors"
            >
              <Share2 className="w-3 h-3" />
              Share
            </button>
          </div>

          {/* Secondary actions */}
          <div className="px-5 pb-3 flex items-center gap-2">
            {reviewScore && <AuthenticityMeter score={reviewScore.authenticity_score} compact />}
            <div className="flex-1" />
            <button
              onClick={() => setShowAddToList(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bookmark className="w-3 h-3" />
              Save to list
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
            {/* Rating */}
            {isVisited && pin.rating > 0 && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < pin.rating ? "text-gold fill-gold" : "text-muted"}`} />
                ))}
              </div>
            )}

            {/* Date */}
            {pin.dateVisited && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(pin.dateVisited).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
              </div>
            )}

            {/* Notes */}
            {pin.notes && <p className="text-sm leading-relaxed text-foreground/80">{pin.notes}</p>}

            {/* Tags */}
            {pin.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {pin.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Authenticity detail */}
            {reviewScore && isVisited && (
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

            {/* ══════ THINGS TO DO ══════ */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-medium text-foreground">
                  Things to do in {pin.name}
                </h3>
                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                  Community + AI
                </span>
              </div>

              <p className="text-[11px] text-muted-foreground -mt-1">
                Find places worth experiencing 🌿 — save them, mark what you've done, or share with friends.
              </p>

              {activitiesLoading && (
                <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Discovering activities...</span>
                </div>
              )}

              {activitiesError && (
                <div className="p-3 rounded-xl bg-destructive/5 text-destructive text-xs">{activitiesError}</div>
              )}

              {!activitiesLoading && activities.length > 0 && (
                <>
                  {/* Category filter chips */}
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                        activeCategory === null ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      All ({activities.length})
                    </button>
                    {uniqueCategories.map((cat) => {
                      const config = categoryConfig[cat];
                      const count = activities.filter((a) => a.category === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                            activeCategory === cat
                              ? "bg-foreground text-background"
                              : `${config?.color || "bg-muted text-muted-foreground"} hover:opacity-80`
                          }`}
                        >
                          {config?.icon}
                          {config?.label || cat} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Activity cards — first 2 are sponsored, rest are organic */}
                  <div className="space-y-2">
                    {filteredActivities.map((activity, i) => (
                      <ActivityCard
                        key={`${activity.name}-${i}`}
                        activity={activity}
                        index={i}
                        isSponsored={i < 2}
                        pinName={pin.name}
                        pinCountry={pin.country}
                        pinLat={pin.lat}
                        pinLng={pin.lng}
                        onShare={(name) => { setShareActivityName(name); setShowShare(true); }}
                        onTrip={(name) => { setTripActivityName(name); setShowTripDialog(true); }}
                      />
                    ))}
                  </div>

                  {/* Trust footer */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <ShieldCheck className="w-3 h-3 text-muted-foreground/40" />
                    <span className="text-[10px] text-muted-foreground/50">
                      Every recommendation is curated — featured places still have to earn their spot.
                    </span>
                  </div>
                </>
              )}

              {!activitiesLoading && !activitiesError && activities.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No activities found for this destination yet.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {showReport && <ReportDialog placeId={pin.id} onClose={() => setShowReport(false)} />}
      {showAddToList && <AddToListDialog placeId={pin.id} placeName={pin.name} onClose={() => setShowAddToList(false)} />}
      {showRating && <RatingModal open={showRating} onClose={() => setShowRating(false)} placeId={pin.id} placeName={pin.name} />}
      <ShareModal open={showShare} onClose={() => { setShowShare(false); setShareActivityName(null); }} item={shareItem} />
      {showTripDialog && (
        <AddToTripDialog
          open={showTripDialog}
          onOpenChange={(open) => { setShowTripDialog(open); if (!open) setTripActivityName(null); }}
          experienceId={pin.id}
          experienceTitle={currentTripTitle}
        />
      )}
    </>
  );
};

/* ═══════════════════════════════════════════════
   Share Dropdown — Chat or Trip
   ═══════════════════════════════════════════════ */
const ShareDropdown = ({ onChat, onTrip }: { onChat: () => void; onTrip: () => void }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
      >
        <Share2 className="w-2.5 h-2.5" /> Share
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
            <button
              onClick={() => { onChat(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <Send className="w-3 h-3" /> Share to Chat
            </button>
            <button
              onClick={() => { onTrip(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted transition-colors"
            >
              <Plane className="w-3 h-3" /> Add to Trip
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Sponsored Info Button — ⓘ with tooltip
   ═══════════════════════════════════════════════ */
const SponsoredInfoButton = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-4 h-4 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center hover:bg-primary/10 transition-colors"
        title="About sponsored experiences"
      >
        <span className="text-[9px] font-semibold text-primary leading-none">i</span>
      </button>
      {showTooltip && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowTooltip(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-20 w-[240px] p-3 bg-popover border border-border rounded-xl shadow-lg">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-semibold text-foreground">Sponsored by Globetrotters</span>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              We only feature experiences that are positively reviewed by the community, meet our quality standards, and are confirmed by local collaborators.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Activity Card — Unified: sponsored + organic
   ═══════════════════════════════════════════════ */
const ActivityCard = ({
  activity,
  index,
  isSponsored,
  pinName,
  pinCountry,
  pinLat,
  pinLng,
  onShare,
  onTrip,
}: {
  activity: Activity;
  index: number;
  isSponsored: boolean;
  pinName: string;
  pinCountry: string;
  pinLat: number;
  pinLng: number;
  onShare: (name: string) => void;
  onTrip: (name: string) => void;
}) => {
  const config = categoryConfig[activity.category] || categoryConfig.culture;
  const { user } = useAuth();
  const addPlace = useAddPlace();

  const handleWishlist = async () => {
    if (!user) { toast.error("Sign in to add to wishlist"); return; }
    try {
      await addPlace.mutateAsync({
        name: activity.name, country: pinCountry, city: pinName,
        lat: pinLat, lng: pinLng, type: "wishlist",
        tags: [activity.category], rating: 0, notes: activity.description,
        date_visited: null,
      });
      toast.success("Added to wishlist 🤍");
    } catch { toast.error("Failed to add"); }
  };

  const handleVisited = async () => {
    if (!user) { toast.error("Sign in to mark as visited"); return; }
    try {
      await addPlace.mutateAsync({
        name: activity.name, country: pinCountry, city: pinName,
        lat: pinLat, lng: pinLng, type: "visited",
        tags: [activity.category], rating: 0, notes: activity.description,
        date_visited: new Date().toISOString().split("T")[0],
      });
      toast.success("Marked as visited ✓");
    } catch { toast.error("Failed to mark"); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`p-3 rounded-xl transition-colors ${
        isSponsored
          ? "bg-primary/[0.03] border border-primary/10 hover:border-primary/20"
          : "bg-muted/40 hover:bg-muted/60"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isSponsored ? "bg-primary/10 text-primary" : config.color
        }`}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">{activity.name}</p>
            {activity.rating && activity.rating > 0 && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Star className="w-3 h-3 text-gold fill-gold" />
                <span className="text-[11px] font-medium text-foreground">{activity.rating.toFixed(1)}</span>
              </div>
            )}
            {/* Sponsored info icon — top right */}
            {isSponsored && (
              <div className="ml-auto flex-shrink-0">
                <SponsoredInfoButton />
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{activity.description}</p>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${config.color}`}>
              {categoryConfig[activity.category]?.label || activity.category}
            </span>
            {activity.review_count && activity.review_count > 0 && (
              <span className="text-[10px] text-muted-foreground">{activity.review_count} reviews</span>
            )}
            {isSponsored && (
              <>
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-primary font-medium">Verified</span>
              </>
            )}
            {!isSponsored && activity.duration && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                {activity.duration}
              </span>
            )}
            {!isSponsored && activity.difficulty && activity.difficulty !== "none" && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium capitalize ${difficultyColors[activity.difficulty] || "text-muted-foreground"}`}>
                <Gauge className="w-2.5 h-2.5" />
                {activity.difficulty}
              </span>
            )}
          </div>

          {/* ── Wishlist + Visited + Share ── */}
          <div className="flex items-center gap-1.5 mt-2">
            <button onClick={handleWishlist} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-wishlist/10 text-wishlist hover:bg-wishlist/20 transition-colors">
              <Heart className="w-2.5 h-2.5" /> Wishlist
            </button>
            <button onClick={handleVisited} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-visited/10 text-visited hover:bg-visited/20 transition-colors">
              <CheckCircle2 className="w-2.5 h-2.5" /> Visited
            </button>
            <ShareDropdown onChat={() => onShare(activity.name)} onTrip={() => onTrip(activity.name)} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LocationPanel;
