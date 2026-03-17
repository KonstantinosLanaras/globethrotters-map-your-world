import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Check, Heart, Star, Bookmark, Plus, Loader2, ArrowLeftRight, Sparkles, ChevronRight } from "lucide-react";
import { City } from "@/data/cities";
import { Place, useAddPlace, useUpdatePlace } from "@/hooks/usePlaces";
import { useLists, useAddList } from "@/hooks/useLists";
import { useAddPlaceToList } from "@/hooks/useListPlaces";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import CityRecommendationsDrawer from "@/components/CityRecommendationsDrawer";

interface CityDetailsCardProps {
  city: City;
  savedPlace: Place | null;
  onClose: () => void;
}

const CityDetailsCard = ({ city, savedPlace, onClose }: CityDetailsCardProps) => {
  const { user } = useAuth();
  const addPlace = useAddPlace();
  const updatePlace = useUpdatePlace();
  const { data: lists = [] } = useLists();
  const addList = useAddList();
  const addToList = useAddPlaceToList();

  const [showLists, setShowLists] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showNewList, setShowNewList] = useState(false);
  const [showRecs, setShowRecs] = useState(false);

  const isVisited = savedPlace?.type === "visited";
  const isWishlist = savedPlace?.type === "wishlist";
  const isSaved = !!savedPlace;
  const isPending = addPlace.isPending || updatePlace.isPending;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async (type: "visited" | "wishlist") => {
    if (!user) { toast.error("Sign in to save places"); return; }
    if (isSaved && savedPlace.type === type) {
      toast.info(`Already ${type === "visited" ? "marked as visited" : "in your wishlist"}`);
      return;
    }
    try {
      if (isSaved && savedPlace.type !== type) {
        await updatePlace.mutateAsync({
          id: savedPlace.id,
          type,
          date_visited: type === "visited" ? new Date().toISOString().split("T")[0] : null,
        });
        toast.success(type === "visited" ? `${city.name} moved to visited! ✓` : `${city.name} moved to wishlist! ♡`);
      } else {
        await addPlace.mutateAsync({
          name: city.name, country: city.country, lat: city.lat, lng: city.lng,
          type, tags: [], rating: 0, notes: "",
          date_visited: type === "visited" ? new Date().toISOString().split("T")[0] : null,
        });
        toast.success(type === "visited" ? `${city.name} marked as visited! ✓` : `${city.name} added to wishlist! ♡`);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to save";
      if (msg.includes("Already")) toast.info(msg);
      else toast.error("Couldn't save city. Please try again.");
    }
  };

  const handleAddToList = async (listId: string) => {
    if (!savedPlace) {
      try {
        const result = await addPlace.mutateAsync({
          name: city.name, country: city.country, lat: city.lat, lng: city.lng,
          type: "wishlist", tags: [], rating: 0, notes: "", date_visited: null,
        });
        if (result?.id) {
          await addToList.mutateAsync({ listId, placeId: result.id });
          toast.success("Saved & added to list!");
        }
      } catch { toast.error("Failed to add to list. Please try again."); }
      return;
    }
    try {
      await addToList.mutateAsync({ listId, placeId: savedPlace.id });
      toast.success("Added to list!");
    } catch { toast.error("Already in this list or failed to add"); }
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    try {
      const placeId = savedPlace?.id;
      const list = await addList.mutateAsync({ title: newListName.trim(), description: "", emoji: "📍" });
      if (list?.id && placeId) {
        await addToList.mutateAsync({ listId: list.id, placeId });
      }
      toast.success(`Created "${newListName}"${placeId ? ` and added ${city.name}` : ""}`);
      setNewListName("");
      setShowNewList(false);
    } catch { toast.error("Failed to create list"); }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[999] bg-transparent" onClick={onClose} />

      <AnimatePresence>
        <motion.div
          key={city.name}
          initial={{ opacity: 0, x: 20, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed top-[72px] right-4 bottom-4 w-[380px] z-[1000] flex flex-col bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative px-5 pt-5 pb-4 bg-gradient-to-b from-muted/60 to-transparent flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="flex items-start gap-3 pr-10">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isVisited ? "bg-visited text-visited-foreground" :
                isWishlist ? "bg-wishlist text-wishlist-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground leading-tight">{city.name}</h2>
                <p className="text-sm text-muted-foreground">{city.country}</p>
                {city.continent && <p className="text-xs text-muted-foreground/60 mt-0.5">{city.continent}</p>}
              </div>
            </div>

            {isSaved && (
              <div className="mt-3">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  isVisited ? "bg-visited/15 text-visited" : "bg-wishlist/15 text-wishlist"
                }`}>
                  {isVisited ? <Check className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                  {isVisited ? "Visited" : "On Wishlist"}
                </span>
              </div>
            )}
          </div>

          {/* Save Actions */}
          <div className="px-5 py-4 border-b border-border space-y-2 flex-shrink-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Save to collection</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSave("visited")}
                disabled={isPending}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isVisited ? "bg-visited text-visited-foreground cursor-default"
                  : "bg-visited/10 text-visited hover:bg-visited/20 active:scale-[0.98]"
                }`}
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    {isVisited ? <Check className="w-4 h-4" /> : isWishlist ? <ArrowLeftRight className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    {isVisited ? "Visited ✓" : isWishlist ? "Move here" : "Visited"}
                  </>
                )}
              </button>
              <button
                onClick={() => handleSave("wishlist")}
                disabled={isPending}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isWishlist ? "bg-wishlist text-wishlist-foreground cursor-default"
                  : "bg-wishlist/10 text-wishlist hover:bg-wishlist/20 active:scale-[0.98]"
                }`}
              >
                {isWishlist ? <Check className="w-4 h-4" /> : isVisited ? <ArrowLeftRight className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                {isWishlist ? "Wishlist ✓" : isVisited ? "Move here" : "Wishlist"}
              </button>
            </div>

            <button
              onClick={() => setShowLists(!showLists)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all bg-primary/10 text-primary hover:bg-primary/15"
            >
              <Bookmark className="w-4 h-4" />
              Add to Custom List
            </button>
          </div>

          {/* Custom Lists Panel */}
          <AnimatePresence>
            {showLists && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-border overflow-hidden flex-shrink-0"
              >
                <div className="px-5 py-3 max-h-[200px] overflow-y-auto space-y-1">
                  {lists.length === 0 && !showNewList ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No custom lists yet</p>
                  ) : (
                    lists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => handleAddToList(list.id)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                      >
                        <span className="text-lg">{list.emoji}</span>
                        <span className="text-sm font-medium text-foreground truncate flex-1">{list.title}</span>
                        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ))
                  )}

                  {showNewList ? (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="List name..."
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
                      />
                      <button
                        onClick={handleCreateList}
                        disabled={!newListName.trim()}
                        className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-40"
                      >
                        Create
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewList(true)}
                      className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg text-sm text-primary hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New List
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom CTA for recommendations */}
          <div className="px-5 py-4 border-t border-border flex-shrink-0">
            <button
              onClick={() => setShowRecs(true)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Recommended for you</span>
              </div>
              <ChevronRight className="w-4 h-4 text-primary/60 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Recommendations Drawer */}
      <CityRecommendationsDrawer city={city} open={showRecs} onClose={() => setShowRecs(false)} />
    </>
  );
};

export default CityDetailsCard;
