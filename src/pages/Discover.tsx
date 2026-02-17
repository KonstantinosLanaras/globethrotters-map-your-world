import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Compass, TrendingUp, MapPin, Star } from "lucide-react";

const featured = [
  { title: "Hidden Kyoto", subtitle: "Beyond the tourist temples", emoji: "⛩️", tag: "Culture" },
  { title: "Coastal Portugal", subtitle: "Algarve's secret coves", emoji: "🌊", tag: "Nature" },
  { title: "Oaxacan Nights", subtitle: "Mezcal, mole & markets", emoji: "🌮", tag: "Food" },
];

const trending = [
  { name: "Ljubljana", country: "Slovenia", score: 94 },
  { name: "Tbilisi", country: "Georgia", score: 91 },
  { name: "Valletta", country: "Malta", score: 88 },
  { name: "Chefchaouen", country: "Morocco", score: 86 },
];

const Discover = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[90px] px-6 pb-12 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Compass className="w-5 h-5 text-primary" />
            <h1 className="font-display text-3xl font-semibold text-foreground">Discover</h1>
          </div>
          <p className="text-muted-foreground mb-8">Curated inspiration for your next journey</p>
        </motion.div>

        {/* Featured stories */}
        <section className="mb-10">
          <h2 className="font-display text-lg font-medium text-foreground mb-4">Featured Stories</h2>
          <div className="space-y-3">
            {featured.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors cursor-pointer group"
              >
                <span className="text-3xl">{item.emoji}</span>
                <div className="flex-1">
                  <p className="font-display text-base font-medium text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {item.tag}
                </span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Trending */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-gold" />
            <h2 className="font-display text-lg font-medium text-foreground">Trending Destinations</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {trending.map((place, i) => (
              <motion.div
                key={place.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="p-4 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-gold fill-gold" />
                    <span className="text-xs font-medium text-foreground">{place.score}</span>
                  </div>
                </div>
                <p className="font-display text-base font-medium text-foreground">{place.name}</p>
                <p className="text-xs text-muted-foreground">{place.country}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Discover;
