import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Heart, MapPin, Trash2 } from "lucide-react";
import { usePlaces, useDeletePlace } from "@/hooks/usePlaces";
import { toast } from "sonner";

const Wishlist = () => {
  const { data: places = [] } = usePlaces();
  const deletePlace = useDeletePlace();
  const wishlistPlaces = places.filter((p) => p.type === "wishlist");

  const handleDelete = async (id: string, name: string) => {
    try {
      await deletePlace.mutateAsync(id);
      toast.success(`Removed ${name} from wishlist`);
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
            <Heart className="w-5 h-5 text-wishlist" />
            <h1 className="font-display text-2xl font-semibold text-foreground">Wishlist</h1>
          </div>
          <p className="text-sm text-muted-foreground">{wishlistPlaces.length} places you want to visit</p>
        </motion.div>

        {wishlistPlaces.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nothing here yet.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Toggle "Cities" on the map and start saving places!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wishlistPlaces.map((place, i) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-wishlist/20 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-wishlist/10 text-wishlist flex-shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
                  <p className="text-xs text-muted-foreground">{place.country}</p>
                </div>
                {place.tags && place.tags.length > 0 && (
                  <div className="hidden sm:flex gap-1">
                    {place.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{tag}</span>
                    ))}
                  </div>
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

export default Wishlist;
