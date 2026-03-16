import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Users, Search, MapPin, Globe } from "lucide-react";
import { useState } from "react";

const Travelers = () => {
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
            <Users className="w-5 h-5 text-primary" />
            <h1 className="font-display text-3xl font-semibold text-foreground">Travelers</h1>
          </div>
          <p className="text-muted-foreground mb-6">Discover people who share your wanderlust</p>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by destination, e.g. 'People who visited Japan'..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
            />
          </div>
        </motion.div>

        {/* Browse by */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all text-left group"
          >
            <Globe className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-display text-lg font-medium text-foreground group-hover:text-primary transition-colors mb-1">
              By Destination
            </h3>
            <p className="text-xs text-muted-foreground">Find travelers who visited or want to visit a place</p>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-all text-left group"
          >
            <MapPin className="w-8 h-8 text-visited mb-3" />
            <h3 className="font-display text-lg font-medium text-foreground group-hover:text-primary transition-colors mb-1">
              Most Explored
            </h3>
            <p className="text-xs text-muted-foreground">Travelers with the most countries and cities visited</p>
          </motion.button>
        </div>

        {/* Coming soon */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-muted/50 border border-border text-center"
        >
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Traveler discovery is coming soon. Browse profiles by destination, find people who share your interests, and get inspired by their journeys.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Travelers;
