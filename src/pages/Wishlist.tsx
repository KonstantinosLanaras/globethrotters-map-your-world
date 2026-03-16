import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Heart, MapPin, Star } from "lucide-react";
import { usePlaces } from "@/hooks/usePlaces";

const Wishlist = () => {
  const { data: places = [] } = usePlaces();
  const wishlistPlaces = places.filter((p) => p.type === "wishlist");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[80px] px-6 pb-12 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-wishlist" />
            <h1 className="font-display text-3xl font-semibold text-foreground">Wishlist</h1>
          </div>
          <p className="text-muted-foreground mb-6">Places you dream of visiting</p>
        </motion.div>

        {wishlistPlaces.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Your wishlist is empty. Click places on the map to add them!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wishlistPlaces.map((place, i) => (
              <motion.div
                key={place.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl bg-card border border-border hover:border-wishlist/20 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-wishlist/15 text-wishlist">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base font-medium text-foreground group-hover:text-wishlist transition-colors truncate">
                      {place.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{place.country}</p>
                    {place.tags && place.tags.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {place.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
