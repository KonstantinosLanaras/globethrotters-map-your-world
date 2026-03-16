import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Utensils, Mountain, Landmark, Camera, Train, Gem, Search } from "lucide-react";
import { useState } from "react";

const categories = [
  { icon: <Utensils className="w-6 h-6" />, label: "Food & Dining", description: "Local dishes, restaurants, street food", count: 0, color: "bg-visited/10 text-visited" },
  { icon: <Mountain className="w-6 h-6" />, label: "Hiking & Nature", description: "Trails, national parks, viewpoints", count: 0, color: "bg-ocean/10 text-ocean" },
  { icon: <Landmark className="w-6 h-6" />, label: "Culture & History", description: "Museums, monuments, historical sites", count: 0, color: "bg-gold/10 text-gold" },
  { icon: <Camera className="w-6 h-6" />, label: "Scenic Views", description: "Lookouts, sunsets, photography spots", count: 0, color: "bg-primary/10 text-primary" },
  { icon: <Train className="w-6 h-6" />, label: "Transport & Routes", description: "Trains, ferries, scenic drives, bike routes", count: 0, color: "bg-secondary/10 text-secondary" },
  { icon: <Gem className="w-6 h-6" />, label: "Hidden Gems", description: "Off-the-beaten-path discoveries", count: 0, color: "bg-terracotta/10 text-terracotta" },
];

const Activities = () => {
  const [search, setSearch] = useState("");

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
            <Utensils className="w-5 h-5 text-primary" />
            <h1 className="font-display text-3xl font-semibold text-foreground">Activities</h1>
          </div>
          <p className="text-muted-foreground mb-6">Discover what to do at every destination</p>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activities, e.g. 'best hikes in Switzerland'..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
            />
          </div>
        </motion.div>

        {/* Categories grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat, i) => (
            <motion.button
              key={cat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all text-left group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${cat.color}`}>
                {cat.icon}
              </div>
              <h3 className="font-display text-lg font-medium text-foreground group-hover:text-primary transition-colors mb-1">
                {cat.label}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{cat.description}</p>
            </motion.button>
          ))}
        </div>

        {/* Coming soon note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 p-6 rounded-2xl bg-muted/50 border border-border text-center"
        >
          <p className="text-sm text-muted-foreground">
            Activity discovery is coming soon. We'll automatically show famous activities for every destination — food spots, hikes, monuments, and more.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Activities;
