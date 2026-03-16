import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Check, Heart, Star, Bookmark, Plus, Loader2 } from "lucide-react";
import { City } from "@/data/cities";
import { Place, useAddPlace } from "@/hooks/usePlaces";
import { useLists, useAddList } from "@/hooks/useLists";
import { useAddPlaceToList } from "@/hooks/useListPlaces";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CityDetailsCardProps {
  city: City;
  savedPlace: Place | null; // null if not saved
  onClose: () => void;
}

const CityDetailsCard = ({ city, savedPlace, onClose }: CityDetailsCardProps) => {
  const { user } = useAuth();
  const addPlace = useAddPlace();
  const { data: lists = [] } = useLists();
  const addList = useAddList();
  const addToList = useAddPlaceToList();
  const [showLists, setShowLists] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [showNewList, setShowNewList] = useState(false);

  const isVisited = savedPlace?.type === "visited";
  const isWishlist = savedPlace?.type === "wishlist";
  const isSaved = !!savedPlace;

  const handleSave = async (type: "visited" | "wishlist") => {
    if (!user) {
      toast.error("Sign in to save places");
      return;
    }
    if (isSaved && savedPlace.type === type) return;

    try {
      await addPlace.mutateAsync({
        name: city.name,
        country: city.country,
        lat: city.lat,
        lng: city.lng,
        type,
        tags: [],
        rating: 0,
        notes: "",
        date_visited: type === "visited" ? new Date().toISOString().split("T")[0] : null,
      });
      toast.success(
        type === "visited"
          ? `${city.name} marked as visited! ✓`
          : `${city.name} added to wishlist! ♡`
      );
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleAddToList = async (listId: string) => {
    if (!savedPlace) {
      toast.error("Save the place first");
      return;
    }
    try {
      await addToList.mutateAsync({ listId, placeId: savedPlace.id });
      toast.success("Added to list!");
    } catch {
      toast.error("Already in this list or failed to add");
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim() || !savedPlace) return;
    try {
      const list = await addList.mutateAsync({
        title: newListName.trim(),
        description: "",
        emoji: "📍",
      });
      if (list?.id) {
        await addToList.mutateAsync({ listId: list.id, placeId: savedPlace.id });
      }
      toast.success(`Created "${newListName}" and added ${city.name}`);
      setNewListName("");
      setShowNewList(false);
    } catch {
      toast.error("Failed to create list");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key={city.name}
        initial={{ opacity: 0, x: 20, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 20, scale: 0.97 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed top-[72px] right-4 bottom-4 w-[360px] z-[1000] flex flex-col bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
      >
        {/* Header with gradient */}
        <div className="relative px-5 pt-5 pb-4 bg-gradient-to-b from-muted/60 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
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
              <h2 className="font-display text-xl font-semibold text-foreground leading-tight">
                {city.name}
              </h2>
              <p className="text-sm text-muted-foreground">{city.country}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{city.continent}</p>
            </div>
          </div>

          {/* Status badge */}
          {isSaved && (
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                isVisited
                  ? "bg-visited/15 text-visited"
                  : "bg-wishlist/15 text-wishlist"
              }`}>
                {isVisited ? <Check className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                {isVisited ? "Visited" : "On Wishlist"}
              </span>
            </div>
          )}
        </div>

        {/* Save Actions - the main CTA area */}
        <div className="px-5 py-4 border-b border-border space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            Save to collection
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSave("visited")}
              disabled={addPlace.isPending || isVisited}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isVisited
                  ? "bg-visited text-visited-foreground cursor-default"
                  : "bg-visited/10 text-visited hover:bg-visited/20 active:scale-[0.98]"
              }`}
            >
              {addPlace.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isVisited ? <Check className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                  {isVisited ? "Visited ✓" : "Visited"}
                </>
              )}
            </button>
            <button
              onClick={() => handleSave("wishlist")}
              disabled={addPlace.isPending || isWishlist}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isWishlist
                  ? "bg-wishlist text-wishlist-foreground cursor-default"
                  : "bg-wishlist/10 text-wishlist hover:bg-wishlist/20 active:scale-[0.98]"
              }`}
            >
              {isWishlist ? <Check className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
              {isWishlist ? "Wishlist ✓" : "Wishlist"}
            </button>
          </div>

          {/* Add to custom list */}
          <button
            onClick={() => setShowLists(!showLists)}
            disabled={!isSaved}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isSaved
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Add to Custom List
          </button>
          {!isSaved && (
            <p className="text-[10px] text-muted-foreground text-center">
              Save as Visited or Wishlist first to add to lists
            </p>
          )}
        </div>

        {/* Custom Lists Panel */}
        <AnimatePresence>
          {showLists && isSaved && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-border overflow-hidden"
            >
              <div className="px-5 py-3 max-h-[200px] overflow-y-auto space-y-1">
                {lists.length === 0 && !showNewList ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No custom lists yet
                  </p>
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

        {/* Info section */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Coordinates</p>
              <p className="text-xs font-medium text-foreground font-mono">
                {city.lat.toFixed(2)}°, {city.lng.toFixed(2)}°
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/40">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Region</p>
              <p className="text-xs font-medium text-foreground">{city.continent}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CityDetailsCard;
