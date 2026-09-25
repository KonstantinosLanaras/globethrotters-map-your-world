import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Check, ChevronDown, Heart, Map, Plus, Search, Share2, Star, Trash2, Plane, MessageSquare, SlidersHorizontal, PenLine,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ShareModal, { type ShareableExperience } from "@/components/ShareModal";
import AddToTripDialog from "@/components/AddToTripDialog";
import RatingModal from "@/components/RatingModal";
import ExperienceComposer from "@/components/ExperienceComposer";
import { useDeletePlace, usePlaces, useUpdatePlace, type Place } from "@/hooks/usePlaces";
import { useFavoriteExperiences, useToggleFavoriteExperience, type FavoriteExperience } from "@/hooks/useFavorites";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type ContentFilter = "all" | "places" | "experiences";
type StatusFilter = "all" | "visited" | "wishlist";
type SortBy = "recent" | "alpha" | "rating";

const CATEGORIES = ["food", "culture", "nature", "hike", "nightlife", "beach", "museum", "stay"];

const useMyRatedPlaceIds = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-rated-place-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("place_ratings").select("place_id, overall_rating").eq("user_id", user!.id);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r) => { map[r.place_id] = r.overall_rating; });
      return map;
    },
  });
};

type ShareTarget = { item: ShareableExperience; experienceId?: string | null; catalogItemId?: string | null };

const MyAtlas = () => {
  const navigate = useNavigate();
  const { data: places = [], isLoading: loadingPlaces } = usePlaces();
  const { data: experiences = [], isLoading: loadingExp } = useFavoriteExperiences();
  const { data: rated = {} } = useMyRatedPlaceIds();
  const updatePlace = useUpdatePlace();
  const deletePlace = useDeletePlace();
  const toggleFav = useToggleFavoriteExperience();

  const [content, setContent] = useState<ContentFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [ratedFilter, setRatedFilter] = useState<"any" | "rated" | "unrated">("any");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [shareMenuId, setShareMenuId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  const [tripTarget, setTripTarget] = useState<{ title: string; experienceId?: string | null; catalogItemId?: string | null } | null>(null);
  const [reviewPlace, setReviewPlace] = useState<Place | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const q = query.trim().toLowerCase();
  const matchesText = (...vals: (string | null | undefined)[]) => !q || vals.some((v) => v?.toLowerCase().includes(q));

  const counts = {
    all: places.length,
    visited: places.filter((p) => p.type === "visited").length,
    wishlist: places.filter((p) => p.type === "wishlist").length,
  };

  const filteredPlaces = useMemo(() => {
    const list = places.filter((p) =>
      (status === "all" || p.type === status) &&
      matchesText(p.name, p.city, p.country) &&
      (!category || p.tags?.some((t) => t.toLowerCase().includes(category))) &&
      (ratedFilter === "any" || (ratedFilter === "rated" ? rated[p.id] != null : rated[p.id] == null))
    );
    return [...list].sort((a, b) =>
      sortBy === "alpha" ? a.name.localeCompare(b.name)
        : sortBy === "rating" ? (rated[b.id] ?? b.rating ?? 0) - (rated[a.id] ?? a.rating ?? 0)
        : b.created_at.localeCompare(a.created_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, status, q, category, ratedFilter, sortBy, rated]);

  const filteredExp = useMemo(() => {
    const list = experiences.filter((e) =>
      matchesText(e.title, e.city, e.country, e.caption) &&
      (!category || e.category === category) &&
      (ratedFilter === "any" || (ratedFilter === "rated" ? !!e.rating : !e.rating))
    );
    return [...list].sort((a, b) =>
      sortBy === "alpha" ? a.title.localeCompare(b.title)
        : sortBy === "rating" ? (b.rating ?? 0) - (a.rating ?? 0)
        : b.favorited_at.localeCompare(a.favorited_at));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experiences, q, category, ratedFilter, sortBy]);

  const showPlaces = content !== "experiences";
  const showExperiences = content !== "places" && status === "all";

  const changeStatus = async (place: Place, type: Place["type"]) => {
    setOpenStatusId(null);
    if (place.type === type) return;
    try {
      await updatePlace.mutateAsync({ id: place.id, type, date_visited: type === "visited" ? new Date().toISOString().split("T")[0] : null });
      toast.success(type === "visited" ? `${place.name} marked as visited` : `${place.name} moved to your wishlist`);
    } catch { toast.error("Could not update this place"); }
  };

  const removePlace = async (place: Place) => {
    try { await deletePlace.mutateAsync(place.id); toast.success(`${place.name} removed from My Atlas`); }
    catch { toast.error("Could not remove this place"); }
  };

  const removeExperience = async (exp: FavoriteExperience) => {
    try { await toggleFav.mutateAsync({ experienceId: exp.id, isFavorited: true } as never); toast.success(`${exp.title} removed from My Atlas`); }
    catch { toast.error("Could not remove this experience"); }
  };

  const placeShareItem = (p: Place): ShareableExperience => ({
    type: "experience", id: p.id, catalogItemId: p.catalog_item_id, title: p.name, city: p.city, country: p.country,
    category: p.tags?.[0] ?? "general", rating: rated[p.id] ?? p.rating, caption: p.notes,
  });
  const expShareItem = (e: FavoriteExperience): ShareableExperience => ({
    type: "experience", id: e.id, experienceId: e.id, title: e.title, city: e.city, country: e.country,
    category: e.category, rating: e.rating, photo: e.photos?.[0], caption: e.caption,
  });

  const ShareMenu = ({ id, item, title, experienceId, catalogItemId }: { id: string; item: ShareableExperience; title: string; experienceId?: string | null; catalogItemId?: string | null }) => (
    <div className="relative">
      <button onClick={() => setShareMenuId(shareMenuId === id ? null : id)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted">
        <Share2 className="w-3.5 h-3.5" /> Share
      </button>
      {shareMenuId === id && (
        <div className="absolute left-0 bottom-full mb-1 z-20 w-40 p-1 rounded-xl border border-border bg-card shadow-lg">
          <button onClick={() => { setShareMenuId(null); setShareTarget({ item }); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-muted"><MessageSquare className="w-3.5 h-3.5" /> Share to chat</button>
          <button onClick={() => { setShareMenuId(null); setTripTarget({ title, experienceId, catalogItemId }); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs hover:bg-muted"><Plane className="w-3.5 h-3.5" /> Add to trip</button>
        </div>
      )}
    </div>
  );

  const Empty = ({ text }: { text: string }) => (
    <div className="py-14 text-center rounded-2xl border border-dashed border-border">
      <Map className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{text}</p>
      <button onClick={() => navigate("/")} className="mt-4 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium">Go to Explore</button>
    </div>
  );

  const placeEmpty = status === "visited" ? "Places you mark as visited will appear here."
    : status === "wishlist" ? "Save places from Explore to plan where to go next." : "Save places from Explore to plan where to go next.";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-[84px] px-4 sm:px-6 pb-12 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">My Atlas</h1>
            <p className="text-sm text-muted-foreground mt-1">Your places, experiences and travel memories—all in one place.</p>
          </div>
          <button onClick={() => setShowComposer(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-sm hover:opacity-90 flex-shrink-0">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-fit mb-3">
          {(["all", "places", "experiences"] as const).map((c) => (
            <button key={c} onClick={() => setContent(c)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${content === c ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{c}</button>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search My Atlas" className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-primary/40" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`h-10 px-3 rounded-xl border border-border text-xs inline-flex items-center gap-1.5 ${showFilters ? "bg-primary/10 text-primary" : "bg-card text-muted-foreground"}`}>
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="mb-4 p-4 rounded-2xl border border-border bg-card space-y-3 text-xs">
            <div>
              <p className="text-muted-foreground mb-1.5">Category</p>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCategory(category === c ? null : c)} className={`px-2.5 py-1 rounded-full capitalize ${category === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{c === "hike" ? "hiking" : c}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-muted-foreground">Rating
                <select value={ratedFilter} onChange={(e) => setRatedFilter(e.target.value as never)} className="bg-muted rounded-lg px-2 py-1 text-foreground">
                  <option value="any">Any</option><option value="rated">Rated</option><option value="unrated">Not rated</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-muted-foreground">Sort
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="bg-muted rounded-lg px-2 py-1 text-foreground">
                  <option value="recent">Recently added</option><option value="alpha">Alphabetical</option><option value="rating">Rating</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {showPlaces && (
          <div className="flex gap-2 mb-5">
            {(["all", "visited", "wishlist"] as const).map((s) => (
              <button key={s} onClick={() => setStatus(s)} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${status === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}>
                {s === "visited" && <Check className="w-3.5 h-3.5" />}{s === "wishlist" && <Heart className="w-3.5 h-3.5" />}
                <span className="capitalize">{s}</span><span className="opacity-70">{counts[s]}</span>
              </button>
            ))}
          </div>
        )}

        {showPlaces && (
          <section className="mb-8">
            {content === "all" && <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Places</h2>}
            {loadingPlaces ? <p className="py-10 text-center text-sm text-muted-foreground">Loading places…</p>
              : filteredPlaces.length === 0 ? <Empty text={placeEmpty} />
              : (
                <div className="space-y-2">
                  {filteredPlaces.map((place, i) => {
                    const myRating = rated[place.id];
                    const isVisited = place.type === "visited";
                    return (
                      <motion.article key={place.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.025, 0.2) }} className="p-4 rounded-2xl bg-card border border-border">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-foreground truncate">{place.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">{[place.city && place.city !== place.name ? place.city : null, place.country].filter(Boolean).join(", ")}</p>
                            <div className="flex flex-wrap items-center gap-1 mt-2">
                              {place.tags?.slice(0, 3).map((t) => <span key={t} className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{t}</span>)}
                              {myRating != null && <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground ml-1"><Star className="w-3 h-3 fill-current" />{myRating}</span>}
                            </div>
                          </div>
                          <div className="relative flex-shrink-0">
                            <button onClick={() => setOpenStatusId(openStatusId === place.id ? null : place.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isVisited ? "bg-accent/15 text-accent-foreground" : "bg-primary/10 text-primary"}`} aria-label={`Change status for ${place.name}`}>
                              {isVisited ? <Check className="w-3 h-3" /> : <Heart className="w-3 h-3" />}{isVisited ? "Visited" : "Wishlist"}<ChevronDown className="w-3 h-3" />
                            </button>
                            {openStatusId === place.id && (
                              <div className="absolute right-0 top-full mt-1 z-20 w-36 p-1 rounded-xl border border-border bg-card shadow-lg">
                                <button onClick={() => changeStatus(place, "visited")} className="w-full px-3 py-2 rounded-lg text-xs text-left hover:bg-muted">Visited</button>
                                <button onClick={() => changeStatus(place, "wishlist")} className="w-full px-3 py-2 rounded-lg text-xs text-left hover:bg-muted">Wishlist</button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/60">
                          {isVisited ? (
                            <button onClick={() => setReviewPlace(place)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">
                              <PenLine className="w-3.5 h-3.5" /> {myRating != null ? "Edit review" : "Review"}
                            </button>
                          ) : (
                            <span title="Mark this place as visited to review it" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs text-muted-foreground/50 cursor-not-allowed">
                              <PenLine className="w-3.5 h-3.5" /> Review after visiting
                            </span>
                          )}
                          <ShareMenu id={place.id} item={placeShareItem(place)} title={place.name} catalogItemId={place.catalog_item_id} />
                          <button onClick={() => setTripTarget({ title: place.name, catalogItemId: place.catalog_item_id })} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted"><Plane className="w-3.5 h-3.5" /> Add to trip</button>
                          <button onClick={() => removePlace(place)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label={`Remove ${place.name}`}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              )}
          </section>
        )}

        {showExperiences && (
          <section>
            {content === "all" && <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Saved experiences</h2>}
            {loadingExp ? <p className="py-10 text-center text-sm text-muted-foreground">Loading experiences…</p>
              : filteredExp.length === 0 ? <Empty text="Save community experiences from Explore to find them here." />
              : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {filteredExp.map((exp) => (
                    <article key={exp.id} className="rounded-2xl bg-card border border-border overflow-hidden flex flex-col">
                      {exp.photos?.[0] && <img src={exp.photos[0]} alt={exp.title} className="w-full h-36 object-cover" loading="lazy" />}
                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground">{exp.title}</h3>
                          {exp.rating > 0 && <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground flex-shrink-0"><Star className="w-3 h-3 fill-current" />{Number(exp.rating).toFixed(1)}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{[exp.city, exp.country].filter(Boolean).join(", ")} · <span className="capitalize">{exp.category.replace("_", " ")}</span></p>
                        {exp.caption && <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">{exp.caption}</p>}
                        <div className="flex items-center gap-1 mt-auto pt-3">
                          <ShareMenu id={`e-${exp.id}`} item={expShareItem(exp)} title={exp.title} experienceId={exp.id} />
                          <button onClick={() => setTripTarget({ title: exp.title, experienceId: exp.id })} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-muted-foreground hover:text-foreground hover:bg-muted"><Plane className="w-3.5 h-3.5" /> Add to trip</button>
                          <button onClick={() => removeExperience(exp)} className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" aria-label={`Remove ${exp.title}`}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
          </section>
        )}
      </main>

      {shareTarget && <ShareModal open onClose={() => setShareTarget(null)} item={shareTarget.item} />}
      {tripTarget && (
        <AddToTripDialog open onOpenChange={(o) => !o && setTripTarget(null)} experienceId={tripTarget.experienceId} catalogItemId={tripTarget.catalogItemId} experienceTitle={tripTarget.title} />
      )}
      {reviewPlace && <RatingModal open onClose={() => setReviewPlace(null)} placeId={reviewPlace.id} placeName={reviewPlace.name} />}
      <ExperienceComposer open={showComposer} onClose={() => setShowComposer(false)} />
    </div>
  );
};

export default MyAtlas;
