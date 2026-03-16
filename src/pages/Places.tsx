import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { MapPin, Star, Globe, Trash2 } from "lucide-react";
import { usePlaces, useDeletePlace } from "@/hooks/usePlaces";
import { toast } from "sonner";

const Places = () => {
  const { data: places = [] } = usePlaces();
  const deletePlace = useDeletePlace();
  const visitedPlaces = places.filter((p) => p.type === "visited");
  const countries = [...new Set(visitedPlaces.map((p) => p.country))];

  const handleDelete = async (id: string, name: string) => {
    try {
      await deletePlace.mutateAsync(id);
      toast.success(`Removed ${name}`);
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[76px] px-6 pb-12 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-visited" />
            <h1 className="font-display text-2xl font-semibold text-foreground">Visited</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {visitedPlaces.length} places across {countries.length} countries
          </p>
        </motion.div>

        {/* Country tags */}
        {countries.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 flex-wrap mb-6"
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            {countries.slice(0, 12).map((c) => (
              <span key={c} className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">{c}</span>
            ))}
            {countries.length > 12 && (
              <span className="text-xs text-muted-foreground">+{countries.length - 12}</span>
            )}
          </motion.div>
        )}

        {visitedPlaces.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No visited places yet.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Open the map, toggle "Cities", and mark places as visited!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {visitedPlaces.map((place, i) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-visited/20 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-visited/10 text-visited flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
                  <p className="text-xs text-muted-foreground">{place.country}</p>
                </div>
                {place.rating && place.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-gold fill-gold" />
                    <span className="text-xs font-medium text-foreground">{place.rating}</span>
                  </div>
                )}
                {place.date_visited && (
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {new Date(place.date_visited).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                )}
                <button
                  onClick={() => handleDelete(place.id, place.name)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Places;
