import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  User, MapPin, Globe, Lock, Shield, UserPlus, UserCheck,
  Clock, UserX, ArrowLeft, Sparkles, MessageSquare
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
import { useRef } from "react";
import { Place } from "@/hooks/usePlaces";

const VISITED_COLOR = "hsl(0, 72%, 51%)";
const WISHLIST_COLOR = "hsl(217, 91%, 60%)";

interface UserProfile {
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

const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const isOwnProfile = currentUser?.id === userId;

  // Fetch profile
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
      return data as UserProfile;
    },
  });

  // Connection
  const { data: connectionStatus = "none" } = useConnectionStatus(userId);
  const sendRequest = useSendConnectionRequest();
  const acceptConnection = useAcceptConnection();
  const removeConnection = useRemoveConnection();
  const startConversation = useStartConversation();
  const { data: followerCount = 0 } = useFollowerCount(userId);
  const { data: followingCount = 0 } = useFollowingCount(userId);

  // Determine map visibility
  const canViewMap = useMemo(() => {
    if (isOwnProfile) return true;
    if (!profile) return false;
    if (profile.privacy === "public") return true;
    if (profile.privacy === "friends" && connectionStatus === "connected") return true;
    return false;
  }, [profile, connectionStatus, isOwnProfile]);

  // Fetch user's places (only if we can view)
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

  const visitedCount = places.filter((p) => p.type === "visited").length;
  const wishlistCount = places.filter((p) => p.type === "wishlist").length;
  const countries = new Set(places.filter((p) => p.type === "visited").map((p) => p.country)).size;

  const handleConnect = async () => {
    if (!userId) return;
    try {
      await sendRequest.mutateAsync(userId);
      toast.success("Connection request sent!");
    } catch {
      toast.error("Failed to send request");
    }
  };

  const handleAccept = async () => {
    if (!userId) return;
    try {
      await acceptConnection.mutateAsync(userId);
      toast.success("Connection accepted!");
    } catch {
      toast.error("Failed to accept");
    }
  };

  const handleRemove = async () => {
    if (!userId) return;
    try {
      await removeConnection.mutateAsync(userId);
      toast.success("Connection removed");
    } catch {
      toast.error("Failed to remove connection");
    }
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[70px] pb-12 max-w-2xl mx-auto px-4">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>

        {/* Profile hero */}
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
              {profile.username && (
                <p className="text-xs text-muted-foreground">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{profile.bio}</p>
              )}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {profile.home_base && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {profile.home_base}
                  </span>
                )}
                {profile.personality && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <Sparkles className="w-3 h-3" /> {profile.personality}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          {canViewMap && (
            <div className="grid grid-cols-5 gap-2 mt-5">
              <MiniStat value={countries} label="Countries" />
              <MiniStat value={visitedCount} label="Visited" />
              <MiniStat value={wishlistCount} label="Wishlist" />
              <MiniStat value={followerCount} label="Connections" />
              <MiniStat value={followingCount} label="Following" />
            </div>
          )}

          {/* Connection button */}
          {!isOwnProfile && (
            <div className="mt-4">
              {connectionStatus === "none" && (
                <button
                  onClick={handleConnect}
                  disabled={sendRequest.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Connect
                </button>
              )}
              {connectionStatus === "pending_sent" && (
                <button
                  disabled
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium cursor-default"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Request sent
                </button>
              )}
              {connectionStatus === "pending_received" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAccept}
                    disabled={acceptConnection.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={handleRemove}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              )}
              {connectionStatus === "connected" && (
                <button
                  onClick={handleRemove}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Connected
                </button>
              )}
            </div>
          )}
        </motion.div>

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <div className="p-4 rounded-2xl bg-card border border-border mb-4">
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span key={interest} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Map or privacy message */}
        {canViewMap ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border overflow-hidden bg-card"
          >
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
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-12 text-center"
          >
            <Lock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">This user's travel map is private</p>
            <p className="text-xs text-muted-foreground">
              {profile.privacy === "friends"
                ? "Connect with this traveler to see their map."
                : "This traveler has a private profile."}
            </p>
            {connectionStatus === "none" && profile.privacy === "friends" && (
              <button
                onClick={handleConnect}
                disabled={sendRequest.isPending}
                className="mt-4 flex items-center gap-2 px-4 py-2 mx-auto rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Send Connection Request
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Read-only map for viewing another user's pins
const UserMapView = ({ places }: { places: Place[] }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [25, 10],
      zoom: 3,
      minZoom: 2,
      maxZoom: 14,
      scrollWheelZoom: true,
      attributionControl: false,
      zoomControl: false,
      maxBounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
      maxBoundsViscosity: 1.0,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png").addTo(map);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", { pane: "tooltipPane" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    if (places.length === 0) return;

    places.forEach((place) => {
      const pinColor = place.type === "visited" ? "#E53935" : "#1E88E5";
      const headGradientId = place.type === "visited" ? `headGradV${place.id}` : `headGradW${place.id}`;
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="32" viewBox="0 0 26 38">
          <defs>
            <radialGradient id="${headGradientId}" cx="40%" cy="35%" r="55%">
              <stop offset="0%" stop-color="${place.type === 'visited' ? '#FF7043' : '#64B5F6'}"/>
              <stop offset="100%" stop-color="${pinColor}"/>
            </radialGradient>
          </defs>
          <line x1="13" y1="22" x2="13" y2="37" stroke="#888" stroke-width="2.2" stroke-linecap="round"/>
          <circle cx="13" cy="13" r="11" fill="url(#${headGradientId})" stroke="white" stroke-width="1.5"/>
          <ellipse cx="10" cy="10" rx="4" ry="3.5" fill="white" opacity="0.35"/>
        </svg>
      `;

      const icon = L.divIcon({
        html: svg,
        className: place.type === "visited" ? "saved-pin-visited" : "saved-pin-wishlist",
        iconSize: [22, 32],
        iconAnchor: [11, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([place.lat, place.lng], { icon });

      const statusLabel = place.type === "visited" ? "Visited" : "Wishlist";
      const statusColor = place.type === "visited" ? VISITED_COLOR : WISHLIST_COLOR;

      marker.bindPopup(`
        <div style="font-family:Inter,system-ui,sans-serif;min-width:160px;padding:4px 0;">
          <div style="font-weight:600;font-size:13px;">${place.name}</div>
          <div style="font-size:11px;color:#888;margin-bottom:6px;">${place.country}</div>
          <div style="display:inline-block;font-size:10px;font-weight:600;padding:2px 8px;border-radius:9999px;background:${statusColor}20;color:${statusColor};">
            ${statusLabel}
          </div>
        </div>
      `, { closeButton: true, maxWidth: 200 });

      marker.bindTooltip(
        `<span style="font-weight:600;font-size:12px;">${place.name}</span>`,
        { direction: "top", offset: [0, -32], className: "city-tooltip" }
      );

      marker.addTo(map);
    });

    // Fit bounds
    const bounds = L.latLngBounds(places.map((p) => [p.lat, p.lng] as [number, number]));
    if (places.length === 1) {
      map.setView([places[0].lat, places[0].lng], 6, { animate: true });
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8, animate: true });
    }
  }, [places]);

  return <div ref={containerRef} className="w-full h-[400px]" />;
};

const MiniStat = ({ value, label }: { value: number; label: string }) => (
  <div className="text-center">
    <p className="font-display text-lg font-semibold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

export default UserProfilePage;
