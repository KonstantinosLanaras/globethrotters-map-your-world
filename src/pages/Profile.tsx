import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { User, Globe, MapPin, Trophy, ChevronRight } from "lucide-react";
import { travelStats } from "@/data/sampleData";

const Profile = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[90px] px-6 pb-12 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Traveler</h1>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Trophy className="w-3.5 h-3.5 text-gold" />
            <span className="text-sm text-muted-foreground">{travelStats.level}</span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          <StatCard icon={<Globe className="w-4 h-4" />} value={travelStats.countriesVisited} label="Countries" />
          <StatCard icon={<MapPin className="w-4 h-4" />} value={travelStats.visitedCount} label="Visited" />
          <StatCard icon={<MapPin className="w-4 h-4" />} value={travelStats.wishlistCount} label="Wishlist" />
        </motion.div>

        {/* Progress */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-5 rounded-2xl bg-card border border-border mb-6"
        >
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-foreground">{travelStats.level}</span>
            <span className="text-muted-foreground">{travelStats.nextLevel}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${travelStats.progress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{travelStats.progress}% to next level</p>
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="p-5 rounded-2xl bg-card border border-border"
        >
          <h3 className="font-display text-base font-medium text-foreground mb-3">Badges</h3>
          <div className="flex flex-wrap gap-2">
            {travelStats.badges.map((badge) => (
              <span
                key={badge}
                className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                {badge}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <div className="p-4 rounded-2xl bg-card border border-border text-center">
    <div className="text-primary mx-auto mb-1 flex justify-center">{icon}</div>
    <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default Profile;
