import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  User, MapPin, Lock, UserPlus, UserCheck,
  Clock, UserX, ArrowLeft, Sparkles, MessageSquare,
  Map, Heart, BookOpen, Plane, Star, Camera, Users
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import {
  useConnectionStatus,
  useSendConnectionRequest,
  useAcceptConnection,
  useRemoveConnection,
} from "@/hooks/useConnections";
import { useStartConversation } from "@/hooks/useMessages";
import { useFollowerCount, useFollowingCount } from "@/hooks/useFollowers";
import Navbar from "@/components/Navbar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { Place } from "@/hooks/usePlaces";

const VISITED_COLOR = "hsl(0, 72%, 51%)";
const WISHLIST_COLOR = "hsl(217, 91%, 60%)";

interface UserProfileData {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  home_base: string | null;
  privacy: string;
  is_verified: boolean;
  trust_score: number;
  personality: string | null;
  interests: string[] | null;
  languages: string[] | null;
  travel_style: string[] | null;
}

type ProfileTab = "published" | "map" | "favorites";

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const isOwnProfile = currentUser?.id === userId;
  const [activeTab, setActiveTab] = useState<ProfileTab>("published");
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, bio, home_base, privacy, is_verified, trust_score, personality, interests, languages, travel_style")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data as UserProfileData;
    },
  });

  const { data: connectionStatus = "none" } = useConnectionStatus(userId);
  const sendRequest = useSendConnectionRequest();
  const acceptConnection = useAcceptConnection();
  const removeConnection = useRemoveConnection();
  const startConversation = useStartConversation();
  const { data: followerCount = 0 } = useFollowerCount(userId);
  const { data: followingCount = 0 } = useFollowingCount(userId);

  const canViewMap = useMemo(() => {
    if (isOwnProfile) return true;
    if (!profile) return false;
    return profile.privacy === "public" || profile.privacy === "mixed";
  }, [profile, isOwnProfile]);

  const canViewContent = useMemo(() => {
    if (isOwnProfile) return true;
    if (!profile) return false;
    return profile.privacy === "public";
  }, [profile, isOwnProfile]);

  const { data: places = [] } = useQuery({
    queryKey: ["user-places", userId],
    enabled: !!userId && canViewMap,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("places")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Place[]) ?? [];
    },
  });

  // Fetch user's journeys for Published tab
  const { data: journeys = [] } = useQuery({
    queryKey: ["user-journeys", userId],
    enabled: !!userId && canViewContent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journeys")
        .select("*")
        .eq("user_id", userId!)
        .eq("privacy", "public")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch user's published favorites
  const { data: favorites = [] } = useQuery({
    queryKey: ["user-favorites", userId],
    enabled: !!userId && canViewContent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorite_experiences")
        .select("*, experiences(*)")
        .eq("user_id", userId!)
        .eq("publish_status", "published")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch trip posts for Published tab
  const { data: tripPosts = [] } = useQuery({
    queryKey: ["user-trip-posts", userId],
    enabled: !!userId && canViewContent,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_posts")
        .select("*, journeys(title, destinations)")
        .eq("user_id", userId!)
        .eq("visibility", "public")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch followers list
  const { data: followersList = [] } = useQuery({
    queryKey: ["followers-list", userId],
    enabled: !!userId && showFollowers,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("followers")
        .select("follower_id")
        .eq("following_id", userId!);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const ids = data.map(f => f.follower_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", ids);
      return profiles ?? [];
    },
  });

  // Fetch following list
  const { data: followingList = [] } = useQuery({
    queryKey: ["following-list", userId],
    enabled: !!userId && showFollowing,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", userId!);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const ids = data.map(f => f.following_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, username")
        .in("user_id", ids);
      return profiles ?? [];
    },
  });

  const handleConnect = async () => {
    if (!userId) return;
    try {
      await sendRequest.mutateAsync(userId);
      toast.success("Connection request sent!");
    } catch { toast.error("Failed to send request"); }
  };

  const handleAccept = async () => {
    if (!userId) return;
    try {
      await acceptConnection.mutateAsync(userId);
      toast.success("Connection accepted!");
    } catch { toast.error("Failed to accept"); }
  };

  const handleRemove = async () => {
    if (!userId) return;
    try {
      await removeConnection.mutateAsync(userId);
      toast.success("Connection removed");
    } catch { toast.error("Failed to remove connection"); }
  };

  const handleMessage = async () => {
    if (!userId) return;
    try {
      const convoId = await startConversation.mutateAsync(userId);
      navigate(`/messages/${convoId}`);
    } catch { toast.error("Failed to start conversation"); }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[70px] flex items-center justify-center h-[50vh]">
          <div className="animate-pulse text-muted-foreground text-sm">Loading profile…</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[70px] flex flex-col items-center justify-center h-[50vh]">
          <User className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">User not found</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-xs text-primary hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  const tabs: { id: ProfileTab; label: string; icon: React.ReactNode }[] = [
    { id: "published", label: "Published", icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: "map", label: "Map", icon: <Map className="w-3.5 h-3.5" /> },
    { id: "favorites", label: "Favorites", icon: <Heart className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[70px] pb-12 max-w-2xl mx-auto px-4">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>

        {/* Profile Header — simplified */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-card border border-border mb-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-2xl font-semibold text-foreground truncate">
                  {profile.display_name || "Traveler"}
                </h1>
                <VerifiedBadge isVerified={profile.is_verified} size="md" />
              </div>
              {profile.personality && (
                <span className="inline-flex items-center gap-1 text-xs text-primary mt-0.5">
                  <Sparkles className="w-3 h-3" /> {profile.personality}
                </span>
              )}
              {profile.bio && (
                <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{profile.bio}</p>
              )}
              {profile.home_base && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                  <MapPin className="w-3 h-3" /> {profile.home_base}
                </span>
              )}
            </div>
          </div>

          {/* Followers / Following */}
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={() => setShowFollowers(true)}
              className="text-sm hover:text-primary transition-colors"
            >
              <span className="font-semibold text-foreground">{followerCount}</span>{" "}
              <span className="text-muted-foreground">Followers</span>
            </button>
            <button
              onClick={() => setShowFollowing(true)}
              className="text-sm hover:text-primary transition-colors"
            >
              <span className="font-semibold text-foreground">{followingCount}</span>{" "}
              <span className="text-muted-foreground">Following</span>
            </button>
          </div>

          {/* Connection buttons */}
          {!isOwnProfile && (
            <div className="mt-4 flex items-center gap-2">
              {connectionStatus === "none" && (
                <button
                  onClick={handleConnect}
                  disabled={sendRequest.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Connect
                </button>
              )}
              {connectionStatus === "pending_sent" && (
                <button disabled className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium cursor-default">
                  <Clock className="w-3.5 h-3.5" /> Request sent
                </button>
              )}
              {connectionStatus === "pending_received" && (
                <>
                  <button
                    onClick={handleAccept}
                    disabled={acceptConnection.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button
                    onClick={handleRemove}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" /> Decline
                  </button>
                </>
              )}
              {connectionStatus === "connected" && (
                <>
                  <button
                    onClick={handleMessage}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Message
                  </button>
                  <button
                    onClick={handleRemove}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Connected
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-4 bg-card border border-border rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "published" && (
            <motion.div
              key="published"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {!canViewContent ? (
                <PrivateContentMessage />
              ) : (
                <PublishedTab journeys={journeys} tripPosts={tripPosts} navigate={navigate} />
              )}
            </motion.div>
          )}

          {activeTab === "map" && (
            <motion.div
              key="map"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {!canViewMap ? (
                <PrivateContentMessage />
              ) : (
                <div className="rounded-2xl border border-border overflow-hidden bg-card">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">Travel Map</h3>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-visited" /> Visited
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-wishlist" /> Want to visit
                      </span>
                    </div>
                  </div>
                  <UserMapView places={places} />
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "favorites" && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {!canViewContent ? (
                <PrivateContentMessage />
              ) : (
                <FavoritesTab favorites={favorites} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Followers Modal */}
      {showFollowers && (
        <UserListModal
          title="Followers"
          users={followersList}
          onClose={() => setShowFollowers(false)}
          onUserClick={(id) => { setShowFollowers(false); navigate(`/user/${id}`); }}
        />
      )}
      {showFollowing && (
        <UserListModal
          title="Following"
          users={followingList}
          onClose={() => setShowFollowing(false)}
          onUserClick={(id) => { setShowFollowing(false); navigate(`/user/${id}`); }}
        />
      )}
    </div>
  );
};

/* ---- Sub-components ---- */

const PrivateContentMessage = () => (
  <div className="rounded-2xl border border-border bg-card p-12 text-center">
    <Lock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
    <p className="text-sm font-medium text-foreground mb-1">This content is private</p>
    <p className="text-xs text-muted-foreground">Connect with this traveler to see more.</p>
  </div>
);

const PublishedTab = ({ journeys, tripPosts, navigate }: { journeys: any[]; tripPosts: any[]; navigate: (path: string) => void }) => {
  const hasContent = journeys.length > 0 || tripPosts.length > 0;

  if (!hasContent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <BookOpen className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">No published content yet</p>
        <p className="text-xs text-muted-foreground">When this traveler shares trips and experiences, they'll appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Journeys */}
      {journeys.map((journey: any) => (
        <motion.div
          key={journey.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors cursor-pointer"
        >
          {journey.cover_image_url && (
            <div className="h-40 overflow-hidden">
              <img src={journey.cover_image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {journey.emoji && <span className="text-lg">{journey.emoji}</span>}
              <h3 className="font-display text-base font-semibold text-foreground">{journey.title}</h3>
            </div>
            {journey.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{journey.description}</p>
            )}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {journey.destinations?.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {journey.destinations.slice(0, 3).join(", ")}
                </span>
              )}
              {journey.start_date && (
                <span className="flex items-center gap-1">
                  <Plane className="w-3 h-3" />
                  {new Date(journey.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}

      {/* Trip Posts */}
      {tripPosts.map((post: any) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card overflow-hidden"
        >
          {post.photo_url && (
            <div className="h-48 overflow-hidden">
              <img src={post.photo_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4">
            {post.journeys && (
              <span className="text-[10px] uppercase tracking-wider font-medium text-primary mb-1 block">
                {post.journeys.title}
              </span>
            )}
            {post.caption && (
              <p className="text-sm text-foreground leading-relaxed">{post.caption}</p>
            )}
            {post.tagged_user_ids?.length > 0 && (
              <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                <Users className="w-3 h-3" />
                {post.tagged_user_ids.length} tagged
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const FavoritesTab = ({ favorites }: { favorites: any[] }) => {
  if (favorites.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center">
        <Heart className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">No published favorites yet</p>
        <p className="text-xs text-muted-foreground">Curated experiences will appear here when shared.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {favorites.map((fav: any) => {
        const exp = fav.experiences;
        if (!exp) return null;
        return (
          <motion.div
            key={fav.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-display text-sm font-semibold text-foreground line-clamp-1">{exp.title}</h4>
              {exp.rating && (
                <span className="flex items-center gap-0.5 text-xs text-amber-600">
                  <Star className="w-3 h-3 fill-current" /> {exp.rating}
                </span>
              )}
            </div>
            <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium capitalize mb-2">
              {exp.category}
            </span>
            {exp.caption && (
              <p className="text-xs text-muted-foreground line-clamp-2">{exp.caption}</p>
            )}
            {exp.city && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground mt-2">
                <MapPin className="w-3 h-3" /> {exp.city}{exp.country ? `, ${exp.country}` : ""}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

const UserListModal = ({ title, users, onClose, onUserClick }: {
  title: string;
  users: { user_id: string; display_name: string | null; avatar_url: string | null; username: string | null }[];
  onClose: () => void;
  onUserClick: (id: string) => void;
}) => (
  <div className="fixed inset-0 z-[1100] flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative bg-card border border-border rounded-2xl w-full max-w-sm mx-4 max-h-[60vh] overflow-hidden shadow-xl"
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <div className="overflow-y-auto max-h-[50vh] p-2">
        {users.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No {title.toLowerCase()} yet</p>
        ) : (
          users.map((u) => (
            <button
              key={u.user_id}
              onClick={() => onUserClick(u.user_id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{u.display_name || "Traveler"}</p>
                {u.username && <p className="text-[11px] text-muted-foreground">@{u.username}</p>}
              </div>
            </button>
          ))
        )}
      </div>
    </motion.div>
  </div>
);

// Read-only map
const UserMapView = ({ places }: { places: Place[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [25, 10], zoom: 3, minZoom: 2, maxZoom: 14,
      scrollWheelZoom: true, attributionControl: true, zoomControl: false,
      maxBounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
      maxBoundsViscosity: 1.0,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer(
      import.meta.env.VITE_MAP_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: import.meta.env.VITE_MAP_ATTRIBUTION || "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      },
    ).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.eachLayer((layer) => { if (layer instanceof L.Marker) map.removeLayer(layer); });
    if (places.length === 0) return;

    places.forEach((place) => {
      const pinColor = place.type === "visited" ? "#E53935" : "#1E88E5";
      const gId = `grad${place.id}`;
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="32" viewBox="0 0 26 38">
          <defs><radialGradient id="${gId}" cx="40%" cy="35%" r="55%">
            <stop offset="0%" stop-color="${place.type === 'visited' ? '#FF7043' : '#64B5F6'}"/>
            <stop offset="100%" stop-color="${pinColor}"/>
          </radialGradient></defs>
          <line x1="13" y1="22" x2="13" y2="37" stroke="#888" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="13" cy="13" r="11" fill="url(#${gId})" stroke="white" stroke-width="1.5"/>
          <ellipse cx="10" cy="10" rx="4" ry="3.5" fill="white" opacity="0.35"/>
        </svg>`;
      const icon = L.divIcon({
        html: svg,
        className: place.type === "visited" ? "saved-pin-visited" : "saved-pin-wishlist",
        iconSize: [22, 32], iconAnchor: [11, 32], popupAnchor: [0, -32],
      });
      const marker = L.marker([place.lat, place.lng], { icon });
      const statusLabel = place.type === "visited" ? "Visited" : "Wishlist";
      const statusColor = place.type === "visited" ? VISITED_COLOR : WISHLIST_COLOR;
      marker.bindPopup(`
        <div style="font-family:Inter,system-ui,sans-serif;min-width:160px;padding:4px 0;">
          <div style="font-weight:600;font-size:13px;">${place.name}</div>
          <div style="font-size:11px;color:#888;margin-bottom:6px;">${place.country}</div>
          <div style="display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:9999px;background:${statusColor}20;color:${statusColor};">${statusLabel}</div>
        </div>`, { closeButton: true, maxWidth: 200 });
      marker.bindTooltip(`<span style="font-weight:600;font-size:12px;">${place.name}</span>`, { direction: "top", offset: [0, -32], className: "city-tooltip" });
      marker.addTo(map);
    });

    const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
    if (places.length === 1) map.setView([places[0].lat, places[0].lng], 6, { animate: true });
    else map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8, animate: true });
  }, [places]);

  return <div ref={containerRef} className="w-full h-[500px]" />;
};

export default UserProfilePage;
