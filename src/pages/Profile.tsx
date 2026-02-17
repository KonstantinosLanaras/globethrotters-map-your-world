import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import { User, Globe, MapPin, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { usePlaces } from "@/hooks/usePlaces";
import { useTravelerLevel } from "@/hooks/useTravelerLevel";
import { useNavigate } from "react-router-dom";
import VerifiedBadge from "@/components/VerifiedBadge";
import TrustScoreCard from "@/components/TrustScoreCard";
import TravelerLevelCard from "@/components/TravelerLevelCard";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { data: places = [] } = usePlaces();
  const navigate = useNavigate();

  const visitedCount = places.filter((p) => p.type === "visited").length;
  const wishlistCount = places.filter((p) => p.type === "wishlist").length;
  const countries = new Set(places.filter((p) => p.type === "visited").map((p) => p.country)).size;
  const level = useTravelerLevel(places);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

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
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              {profile?.display_name || "Traveler"}
            </h1>
            <VerifiedBadge isVerified={profile?.is_verified ?? false} size="md" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground capitalize">{profile?.privacy || "private"}</span>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <StatCard icon={<Globe className="w-4 h-4" />} value={countries} label="Countries" />
          <StatCard icon={<MapPin className="w-4 h-4" />} value={visitedCount} label="Visited" />
          <StatCard icon={<MapPin className="w-4 h-4" />} value={wishlistCount} label="Wishlist" />
        </motion.div>

        {/* Trust Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <TrustScoreCard
            trustScore={profile?.trust_score ?? 0}
            isVerified={profile?.is_verified ?? false}
          />
        </motion.div>

        {/* Traveler Level */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-6"
        >
          <TravelerLevelCard level={level} />
        </motion.div>

        {/* Interests */}
        {profile?.interests && profile.interests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-5 rounded-2xl bg-card border border-border mb-6"
          >
            <h3 className="font-display text-base font-medium text-foreground mb-3">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize"
                >
                  {interest}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Sign out */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
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
