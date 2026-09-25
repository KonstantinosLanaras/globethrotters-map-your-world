import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, Heart, Map, Search, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useDeletePlace, usePlaces, useUpdatePlace, type Place } from "@/hooks/usePlaces";
import { toast } from "sonner";

type StatusFilter = "all" | Place["type"];

const SavedPlaces = () => {
  const { data: places = [], isLoading } = usePlaces();
  const updatePlace = useUpdatePlace();
  const deletePlace = useDeletePlace();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return places.filter((place) => {
      const matchesStatus = filter === "all" || place.type === filter;
      const matchesQuery = !normalizedQuery || [place.name, place.city, place.country]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [filter, places, query]);

  const changeStatus = async (place: Place, type: Place["type"]) => {
    setOpenStatusId(null);
    if (place.type === type) return;
    try {
      await updatePlace.mutateAsync({
        id: place.id,
        type,
        date_visited: type === "visited" ? new Date().toISOString().split("T")[0] : null,
      });
      toast.success(type === "visited" ? `${place.name} marked as visited` : `${place.name} moved to your wishlist`);
    } catch {
      toast.error("Could not update this place");
    }
  };

  const removePlace = async (place: Place) => {
    try {
      await deletePlace.mutateAsync(place.id);
      toast.success(`${place.name} removed`);
    } catch {
      toast.error("Could not remove this place");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-[84px] px-4 sm:px-6 pb-12 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-foreground">Places</h1>
          <p className="text-sm text-muted-foreground mt-1">Your visited places and wishlist, together.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your places"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-sm outline-none focus:border-primary/40"
            />
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50">
            {(["all", "visited", "wishlist"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  filter === status ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {status === "all" ? "All" : status}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading places…</div>
        ) : filteredPlaces.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-border">
            <Map className="w-9 h-9 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No places match this view.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Save places from Explore to build your library.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredPlaces.map((place, index) => (
              <motion.article
                key={place.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.025, 0.2) }}
                className="relative flex items-center gap-3 p-4 rounded-2xl bg-card border border-border"
              >
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-foreground truncate">{place.name}</h2>
                  <p className="text-xs text-muted-foreground truncate">
                    {[place.city && place.city !== place.name ? place.city : null, place.country].filter(Boolean).join(", ")}
                  </p>
                  {place.tags?.length > 0 && (
                    <div className="flex gap-1 mt-2 overflow-hidden">
                      {place.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setOpenStatusId(openStatusId === place.id ? null : place.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                      place.type === "visited"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                    }`}
                    aria-label={`Change status for ${place.name}`}
                  >
                    {place.type === "visited" ? <Check className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                    {place.type === "visited" ? "Visited" : "Wishlist"}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {openStatusId === place.id && (
                    <div className="absolute right-0 top-full mt-1 z-20 w-36 p-1 rounded-xl border border-border bg-card shadow-lg">
                      <button onClick={() => changeStatus(place, "visited")} className="w-full px-3 py-2 rounded-lg text-xs text-left hover:bg-muted">Visited</button>
                      <button onClick={() => changeStatus(place, "wishlist")} className="w-full px-3 py-2 rounded-lg text-xs text-left hover:bg-muted">Wishlist</button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => removePlace(place)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  aria-label={`Remove ${place.name}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SavedPlaces;
