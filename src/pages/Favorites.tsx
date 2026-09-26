import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import ShareModal, { ShareableExperience } from "@/components/ShareModal";
import {
  Star, MapPin, Calendar, Plane, Heart,
  Utensils, Landmark, TreePine, Mountain, Moon, Compass, Building2, Gem, Home, Layers,
  Send, Image, Upload, X, Loader2, Eye, EyeOff, Camera, Pencil
} from "lucide-react";
import {
  useFavoriteExperiences, useFavoriteJourneys,
  useToggleFavoriteExperience, useToggleFavoriteJourney,
  FavoriteExperience, FavoriteJourney,
} from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const CATEGORY_META: Record<string, { label: string; icon: any; emoji: string }> = {
  food: { label: "Food", icon: Utensils, emoji: "🍽️" },
  culture: { label: "Culture", icon: Landmark, emoji: "🏛️" },
  nature: { label: "Nature", icon: TreePine, emoji: "🌿" },
  hike: { label: "Nature", icon: TreePine, emoji: "🌿" },
  nightlife: { label: "Nightlife", icon: Moon, emoji: "🌙" },
  beach: { label: "Beach", icon: Compass, emoji: "🏖️" },
  museum: { label: "Museum", icon: Building2, emoji: "🎨" },
  hidden_gem: { label: "Hidden Gem", icon: Gem, emoji: "💎" },
  stay: { label: "Stay", icon: Home, emoji: "🏨" },
  general: { label: "Other", icon: Layers, emoji: "📌" },
};

const Favorites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: favExperiences = [], isLoading: loadingExp } = useFavoriteExperiences();
  const { data: favJourneys = [], isLoading: loadingJourneys } = useFavoriteJourneys();
  const toggleFavExp = useToggleFavoriteExperience();
  const toggleFavJourney = useToggleFavoriteJourney();
  const [view, setView] = useState<"experiences" | "trips">("experiences");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Enrichment modal state
  const [enriching, setEnriching] = useState<FavoriteExperience | null>(null);
  const [enrichNote, setEnrichNote] = useState("");
  const [enrichPhotos, setEnrichPhotos] = useState<File[]>([]);
  const [enrichPhotoUrls, setEnrichPhotoUrls] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Share modal state
  const [shareItem, setShareItem] = useState<ShareableExperience | null>(null);

  const isLoading = loadingExp || loadingJourneys;

  const grouped = useMemo(() => {
    const groups: Record<string, FavoriteExperience[]> = {};
    for (const exp of favExperiences) {
      const cat = exp.category || "general";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(exp);
    }
    return groups;
  }, [favExperiences]);

  const categoryKeys = Object.keys(grouped).sort((a, b) =>
    (CATEGORY_META[a]?.label || a).localeCompare(CATEGORY_META[b]?.label || b)
  );

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

  const openEnrich = (exp: FavoriteExperience) => {
    setEnriching(exp);
    setEnrichNote(exp.caption || "");
    setEnrichPhotos([]);
    setEnrichPhotoUrls(exp.photos || []);
  };

  const handleAddPhotos = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - enrichPhotos.length);
    setEnrichPhotos(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setEnrichPhotoUrls(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const handlePublish = async () => {
    if (!enriching || !user) return;
    setPublishing(true);
    try {
      // Upload any new photos
      for (const file of enrichPhotos) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${enriching.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("experience-photos")
          .upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("experience-photos").getPublicUrl(path);
        await supabase.from("experience_attachments").insert({
          experience_id: enriching.id,
          attachment_type: "photo",
          url: urlData.publicUrl,
        });
      }

      // Update experience: set visibility to public + caption
      await supabase
        .from("experiences")
        .update({ visibility: "public", caption: enrichNote.trim() || null })
        .eq("id", enriching.id);

      // Update favorite publish_status
      await supabase
        .from("favorite_experiences" as any)
        .update({ publish_status: "published", published_at: new Date().toISOString(), publish_note: enrichNote.trim() } as any)
        .eq("user_id", user.id)
        .eq("experience_id", enriching.id);

      qc.invalidateQueries({ queryKey: ["favorite-experiences"] });
      qc.invalidateQueries({ queryKey: ["experiences"] });
      toast.success("Published to your public profile!");
      setEnriching(null);
    } catch {
      toast.error("Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async (expId: string) => {
    if (!user) return;
    await supabase.from("experiences").update({ visibility: "private" }).eq("id", expId);
    await supabase
      .from("favorite_experiences" as any)
      .update({ publish_status: "draft", published_at: null } as any)
      .eq("user_id", user.id)
      .eq("experience_id", expId);
    qc.invalidateQueries({ queryKey: ["favorite-experiences"] });
    qc.invalidateQueries({ queryKey: ["experiences"] });
    toast.success("Unpublished — now private");
  };

  const handleShare = (exp: FavoriteExperience) => {
    setShareItem({
      type: "experience",
      id: exp.id,
      title: exp.title,
      city: exp.city,
      country: exp.country,
      category: exp.category,
      rating: exp.rating,
      photo: exp.photos[0] || null,
      caption: exp.caption,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[80px] px-4 pb-12 max-w-2xl mx-auto">
        <div className="flex gap-0.5 mb-4 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => navigate("/places")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Places
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-card text-foreground shadow-sm">
            <Star className="w-3.5 h-3.5" /> Favorites
          </button>
        </div>
        {/* Header */}
        <div className="mb-4">
          <h1 className="font-display text-2xl font-semibold text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            Favorites
          </h1>
          <p className="text-sm text-muted-foreground">
            Your curated highlights — enrich and publish to share with the world
          </p>
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
                subtitle="Star your best experiences — then enrich and publish them to share"
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
                          <FavExpCard
                            key={exp.id}
                            exp={exp}
                            index={i}
                            onRemove={handleRemoveExp}
                            onEnrich={() => openEnrich(exp)}
                            onShare={() => handleShare(exp)}
                            onUnpublish={() => handleUnpublish(exp.id)}
                          />
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

      {/* Enrichment + Publish Modal */}
      <AnimatePresence>
        {enriching && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setEnriching(null)} />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-display text-base font-semibold text-foreground">
                  Enrich & Publish
                </h2>
                <button
                  onClick={() => setEnriching(null)}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Preview */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                  {enriching.photos[0] ? (
                    <img src={enriching.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{enriching.title}</p>
                    <p className="text-[10px] text-muted-foreground">{enriching.city}{enriching.country ? `, ${enriching.country}` : ""}</p>
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Photos ({enrichPhotoUrls.length}/5)
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {enrichPhotoUrls.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {enrichPhotoUrls.length < 5 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary/30 transition-colors"
                      >
                        <Camera className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleAddPhotos(e.target.files)}
                  />
                </div>

                {/* Review note */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Your review
                  </p>
                  <textarea
                    value={enrichNote}
                    onChange={(e) => setEnrichNote(e.target.value.slice(0, 300))}
                    placeholder="Share why this experience was special…"
                    className="w-full h-24 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-primary/40"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{enrichNote.length}/300</p>
                </div>

                <div className="bg-muted/30 rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground">
                    <Eye className="w-3 h-3 inline mr-1" />
                    Publishing makes this experience visible on your public profile. Your other activity stays private.
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-muted/30">
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  {publishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Publish to Profile
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Share modal */}
      {shareItem && (
        <ShareModal open={!!shareItem} onClose={() => setShareItem(null)} item={shareItem} />
      )}
    </div>
  );
};

interface FavExpCardProps {
  exp: FavoriteExperience;
  index: number;
  onRemove: (id: string) => void;
  onEnrich: () => void;
  onShare: () => void;
  onUnpublish: () => void;
}

const FavExpCard = ({ exp, index, onRemove, onEnrich, onShare, onUnpublish }: FavExpCardProps) => {
  const isPublished = (exp as any).publish_status === "published";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="p-3 rounded-xl bg-card border border-border hover:border-primary/10 transition-colors"
    >
      <div className="flex items-center gap-3">
        {exp.photos[0] ? (
          <img src={exp.photos[0]} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground truncate">{exp.title}</p>
            {isPublished && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                Published
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {exp.city}{exp.country ? `, ${exp.country}` : ""}
            {exp.experience_date ? ` · ${new Date(exp.experience_date).toLocaleDateString()}` : ""}
          </p>
        </div>
        {exp.rating > 0 && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-[10px] font-medium text-foreground">{exp.rating}</span>
          </div>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
        {isPublished ? (
          <>
            <button
              onClick={onUnpublish}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              <EyeOff className="w-3 h-3" /> Unpublish
            </button>
            <button
              onClick={onShare}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <Send className="w-3 h-3" /> Share
            </button>
          </>
        ) : (
          <button
            onClick={onEnrich}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil className="w-3 h-3" /> Enrich & Publish
          </button>
        )}
        <div className="flex-1" />
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
};

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
