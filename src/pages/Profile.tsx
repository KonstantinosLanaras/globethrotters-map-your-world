import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import {
  User, Globe, MapPin, LogOut, Shield, Edit3, Check, X,
  Heart, Compass, Users, Lock, Sparkles, Languages, Plane, Star, Camera, Plus,
  Image, TrendingUp, Award, Flame, Calendar, ChevronRight, Bookmark, MessageSquare,
  Upload
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { usePlaces } from "@/hooks/usePlaces";
import { useExperiencesWithPhotos, ExperienceWithPhotos } from "@/hooks/useExperiences";
import { useTravelerLevel, useContributionScore } from "@/hooks/useTravelerLevel";
import { useReputation } from "@/hooks/useReputation";
import { useFollowerCount, useFollowingCount } from "@/hooks/useFollowers";
import { useJourneys, useAddJourney } from "@/hooks/useJourneys";
import { useNavigate } from "react-router-dom";
import VerifiedBadge from "@/components/VerifiedBadge";
import TrustScoreCard from "@/components/TrustScoreCard";
import TravelerLevelCard from "@/components/TravelerLevelCard";
import ExperienceComposer from "@/components/ExperienceComposer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const privacyOptions = [
  { id: "public", label: "Open Profile", icon: <Globe className="w-4 h-4" />, desc: "Anyone can see your travel identity" },
  { id: "friends", label: "Mixed", icon: <Users className="w-4 h-4" />, desc: "Public basics, private details for friends" },
  { id: "private", label: "Private", icon: <Lock className="w-4 h-4" />, desc: "Only you can see your profile" },
];

const Profile = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { data: places = [] } = usePlaces();
  const { data: experiences = [] } = useExperiencesWithPhotos();
  const { data: followerCount = 0 } = useFollowerCount(user?.id);
  const { data: followingCount = 0 } = useFollowingCount(user?.id);
  const { data: contributionScore = 0 } = useContributionScore(user?.id);
  const { data: reputation } = useReputation();
  const { data: journeys = [] } = useJourneys();
  const addJourney = useAddJourney();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showTripCreate, setShowTripCreate] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [tab, setTab] = useState<"activity" | "trips" | "stats" | "about" | "settings">("activity");

  // Edit state
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editHomeBase, setEditHomeBase] = useState("");
  const [editInterests, setEditInterests] = useState("");
  const [editLanguages, setEditLanguages] = useState("");
  const [editDreamDest, setEditDreamDest] = useState("");
  const [editNextTrip, setEditNextTrip] = useState("");
  const [editPrivacy, setEditPrivacy] = useState("");

  // Trip create state
  const [tripTitle, setTripTitle] = useState("");
  const [tripDescription, setTripDescription] = useState("");
  const [tripEmoji, setTripEmoji] = useState("✈️");
  const [tripStartDate, setTripStartDate] = useState("");
  const [tripEndDate, setTripEndDate] = useState("");
  const [tripDestinations, setTripDestinations] = useState("");
  const [tripPrivacy, setTripPrivacy] = useState("public");
  const [tripCoverFile, setTripCoverFile] = useState<File | null>(null);
  const [tripCoverPreview, setTripCoverPreview] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const tripCoverInputRef = useRef<HTMLInputElement>(null);
  const visitedCount = places.filter((p) => p.type === "visited").length;
  const wishlistCount = places.filter((p) => p.type === "wishlist").length;
  const countries = new Set(places.filter((p) => p.type === "visited").map((p) => p.country)).size;
  const level = useTravelerLevel(places);

  // Stats
  const photosCount = experiences.reduce((sum, e) => sum + e.photos.length, 0);
  const totalSaves = experiences.reduce((sum, e) => sum + (e.saves_count || 0), 0);
  const totalReviews = experiences.reduce((sum, e) => sum + (e.review_count || 0), 0);
  const avgRating = experiences.filter(e => e.rating_avg > 0).length > 0
    ? (experiences.reduce((sum, e) => sum + (e.rating_avg || 0), 0) / experiences.filter(e => e.rating_avg > 0).length).toFixed(1)
    : "–";

  const topContributions = [...experiences]
    .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
    .slice(0, 3);

  const experiencesByMonth = experiences.reduce((acc, exp) => {
    const date = exp.experience_date || exp.created_at;
    const key = new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(exp);
    return acc;
  }, {} as Record<string, ExperienceWithPhotos[]>);

  // Avatar upload
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      // Append cache-buster
      const url = `${publicUrl}?t=${Date.now()}`;

      await updateProfile.mutateAsync({ user_id: user.id, avatar_url: url } as any);
      toast.success("Profile photo updated!");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const startEdit = () => {
    setEditName(profile?.display_name || "");
    setEditBio(profile?.bio || "");
    setEditHomeBase(profile?.home_base || "");
    setEditInterests(profile?.interests?.join(", ") || "");
    setEditLanguages(profile?.languages?.join(", ") || "");
    setEditDreamDest(profile?.dream_destinations?.join(", ") || "");
    setEditNextTrip(profile?.next_trip || "");
    setEditPrivacy(profile?.privacy || "private");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!user || !profile) return;
    try {
      await updateProfile.mutateAsync({
        user_id: user.id,
        display_name: editName.trim(),
        bio: editBio.trim(),
        home_base: editHomeBase.trim(),
        interests: editInterests.split(",").map((s) => s.trim()).filter(Boolean),
        languages: editLanguages.split(",").map((s) => s.trim()).filter(Boolean),
        dream_destinations: editDreamDest.split(",").map((s) => s.trim()).filter(Boolean),
        next_trip: editNextTrip.trim(),
        privacy: editPrivacy,
      } as any);
      toast.success("Profile updated!");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleTripCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setTripCoverFile(file);
    setTripCoverPreview(URL.createObjectURL(file));
  };

  const handleCreateTrip = async () => {
    if (!tripTitle.trim()) { toast.error("Add a trip title"); return; }
    setUploadingCover(true);
    try {
      let coverUrl: string | undefined;
      if (tripCoverFile && user) {
        const ext = tripCoverFile.name.split(".").pop();
        const path = `${user.id}/trips/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("experience-photos").upload(path, tripCoverFile, { contentType: tripCoverFile.type });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("experience-photos").getPublicUrl(path);
          coverUrl = urlData.publicUrl;
        }
      }

      await addJourney.mutateAsync({
        title: tripTitle.trim(),
        description: tripDescription.trim() || undefined,
        emoji: tripEmoji,
        start_date: tripStartDate || undefined,
        end_date: tripEndDate || undefined,
        destinations: tripDestinations.split(",").map(s => s.trim()).filter(Boolean),
        cover_image_url: coverUrl,
        privacy: tripPrivacy,
      });
      toast.success("Trip created!");
      setShowTripCreate(false);
      setTripTitle(""); setTripDescription(""); setTripEmoji("✈️");
      setTripStartDate(""); setTripEndDate(""); setTripDestinations("");
      setTripPrivacy("public"); setTripCoverFile(null); setTripCoverPreview("");
      setTab("trips");
    } catch { toast.error("Failed to create trip"); }
    finally { setUploadingCover(false); }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const tabs = [
    { id: "activity" as const, label: "Activity", icon: <Flame className="w-3.5 h-3.5" /> },
    { id: "trips" as const, label: "Trips", icon: <Plane className="w-3.5 h-3.5" /> },
    { id: "stats" as const, label: "Stats", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "about" as const, label: "About", icon: <User className="w-3.5 h-3.5" /> },
    { id: "settings" as const, label: "Settings", icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  const tripEmojiOptions = ["✈️", "🏖️", "🏔️", "🌍", "🗺️", "🚗", "🚂", "⛵", "🎒", "🌴"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[70px] pb-12 max-w-2xl mx-auto px-4">

        {/* ═══════ HERO HEADER ═══════ */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl overflow-hidden mb-4">
          <div className="h-24 bg-gradient-to-br from-primary/20 via-accent/15 to-secondary/10" />
          <div className="relative bg-card border border-border rounded-b-2xl px-5 pb-5">
            <div className="flex items-end gap-4 -mt-10">
              {/* Avatar with upload */}
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-muted border-4 border-card flex items-center justify-center shadow-sm overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-2xl bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-primary-foreground" />
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-display text-xl font-semibold text-foreground truncate">
                    {profile?.display_name || "Traveler"}
                  </h1>
                  <VerifiedBadge isVerified={profile?.is_verified ?? false} size="md" />
                </div>
                {profile?.username && (
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                )}
              </div>
              <button onClick={startEdit} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 flex-shrink-0 mb-1">
                <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            {profile?.bio && <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{profile.bio}</p>}

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {profile?.home_base && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {profile.home_base}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                <Award className="w-3 h-3" /> {level.title}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1 mt-4 pt-4 border-t border-border">
              <button onClick={() => navigate("/connections")} className="text-center hover:bg-muted/50 rounded-lg py-1 transition-colors">
                <p className="font-display text-lg font-semibold text-foreground">{followerCount}</p>
                <p className="text-[10px] text-muted-foreground">Connections</p>
              </button>
              <HeroStat value={countries} label="Countries" />
              <HeroStat value={visitedCount} label="Visited" />
              <HeroStat value={wishlistCount} label="Wishlist" />
              <HeroStat value={experiences.length} label="Experiences" />
              <HeroStat value={photosCount} label="Photos" />
            </div>
          </div>
        </motion.div>

        {/* ═══════ ACTION BUTTONS ═══════ */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowTripCreate(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <Plane className="w-4 h-4 text-primary" />
            Add Trip
          </button>
          <button
            onClick={() => setShowComposer(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Log Experience
          </button>
        </div>

        {/* ═══════ TRIP CREATE MODAL ═══════ */}
        <AnimatePresence>
          {showTripCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-5 rounded-2xl bg-card border border-border mb-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
                    <Plane className="w-4 h-4 text-primary" /> Create Trip
                  </h3>
                  <div className="flex gap-1.5">
                    <button onClick={() => setShowTripCreate(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={handleCreateTrip} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </button>
                  </div>
                </div>

                {/* Emoji picker */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Trip Icon</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {tripEmojiOptions.map((e) => (
                      <button
                        key={e}
                        onClick={() => setTripEmoji(e)}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                          tripEmoji === e ? "bg-primary/10 border border-primary/30 scale-110" : "bg-muted hover:bg-muted/80"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <EditField label="Destinations" value={tripDestinations} onChange={setTripDestinations} placeholder="e.g. Athens, Santorini, Mykonos" />
                <EditField label="Trip Title" value={tripTitle} onChange={setTripTitle} placeholder="e.g. Greece Summer 2024" />
                <EditField label="Description" value={tripDescription} onChange={setTripDescription} multiline placeholder="What was this trip about?" />
                
                {/* Cover image */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Cover Image</p>
                  {tripCoverPreview ? (
                    <div className="relative rounded-xl overflow-hidden h-32">
                      <img src={tripCoverPreview} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => { setTripCoverFile(null); setTripCoverPreview(""); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground/60 flex items-center justify-center">
                        <X className="w-3 h-3 text-primary-foreground" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => tripCoverInputRef.current?.click()} className="w-full h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/30 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Add cover photo</span>
                    </button>
                  )}
                  <input ref={tripCoverInputRef} type="file" accept="image/*" className="hidden" onChange={handleTripCover} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Start Date</p>
                    <input type="date" value={tripStartDate} onChange={(e) => setTripStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/40" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">End Date</p>
                    <input type="date" value={tripEndDate} onChange={(e) => setTripEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/40" />
                  </div>
                </div>

                {/* Privacy */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Privacy</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {privacyOptions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setTripPrivacy(p.id)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs transition-all ${
                          tripPrivacy === p.id ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-transparent"
                        }`}
                      >
                        {p.icon}
                        <span className="font-medium">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ EDIT PROFILE MODAL ═══════ */}
        <AnimatePresence>
          {editing && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="p-5 rounded-2xl bg-card border border-border mb-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display text-base font-semibold text-foreground">Edit Profile</h3>
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditing(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={saveEdit} className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </button>
                  </div>
                </div>

                {/* Avatar upload section in edit */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Profile Photo</p>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      {uploadingAvatar ? "Uploading..." : "Change Photo"}
                    </button>
                  </div>
                </div>

                <EditField label="Display Name" value={editName} onChange={setEditName} />
                <EditField label="Bio" value={editBio} onChange={setEditBio} multiline />
                <EditField label="Home Base" value={editHomeBase} onChange={setEditHomeBase} placeholder="e.g. Amsterdam, Netherlands" />
                <EditField label="Interests" value={editInterests} onChange={setEditInterests} placeholder="culture, food, hiking" />
                <EditField label="Languages" value={editLanguages} onChange={setEditLanguages} placeholder="English, Spanish" />
                <EditField label="Dream Destinations" value={editDreamDest} onChange={setEditDreamDest} placeholder="Japan, Iceland, Peru" />
                <EditField label="Next Trip" value={editNextTrip} onChange={setEditNextTrip} placeholder="e.g. Bali in March" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Profile Visibility</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {privacyOptions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setEditPrivacy(p.id)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs transition-all ${
                          editPrivacy === p.id ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-transparent"
                        }`}
                      >
                        {p.icon}
                        <span className="font-medium">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══════ TABS ═══════ */}
        <div className="flex gap-0.5 mb-4 bg-muted/50 p-1 rounded-xl overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════ ACTIVITY TAB ═══════ */}
        {tab === "activity" && (
          <div className="space-y-4">
            {topContributions.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Top Contributions</h3>
                </div>
                <div className="space-y-2">
                  {topContributions.map((exp, i) => (
                    <div key={exp.id} className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{exp.title}</p>
                        <p className="text-[10px] text-muted-foreground">{exp.city}{exp.country ? `, ${exp.country}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {exp.saves_count > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Bookmark className="w-3 h-3" /> {exp.saves_count}</span>}
                        {exp.rating_avg > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {exp.rating_avg.toFixed(1)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {Object.keys(experiencesByMonth).length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No experiences yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Start logging your travel experiences</p>
              </div>
            ) : (
              Object.entries(experiencesByMonth).map(([month, exps]) => (
                <div key={month}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{month}</h3>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground">{exps.length} exp{exps.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="space-y-3 relative pl-4 border-l-2 border-primary/10 ml-1.5">
                    {exps.map((exp) => <TimelineCard key={exp.id} exp={exp} />)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ═══════ TRIPS TAB ═══════ */}
        {tab === "trips" && (
          <div className="space-y-3">
            <button
              onClick={() => setShowTripCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create New Trip
            </button>

            {journeys.length === 0 ? (
              <div className="text-center py-12">
                <Plane className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No trips yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create a trip to organize your travel memories</p>
              </div>
            ) : (
              journeys.map((journey) => (
                <motion.div
                  key={journey.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-card border border-border hover:border-primary/20 transition-all cursor-pointer overflow-hidden"
                  onClick={() => navigate("/visited")}
                >
                  {journey.cover_image_url && (
                    <img src={journey.cover_image_url} alt="" className="w-full h-32 object-cover" />
                  )}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{journey.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">{journey.title}</h3>
                        {journey.destinations && journey.destinations.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {journey.destinations.join(" · ")}
                          </p>
                        )}
                        {journey.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{journey.description}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          {journey.start_date && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(journey.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                              {journey.end_date && ` – ${new Date(journey.end_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                            </span>
                          )}
                          {journey.privacy !== "public" && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Lock className="w-3 h-3" /> {journey.privacy === "private" ? "Private" : "Friends"}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* ═══════ STATS TAB ═══════ */}
        {tab === "stats" && (
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-display text-base font-medium text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Contribution Impact
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <StatBlock label="Total saves" value={totalSaves} icon={<Bookmark className="w-3.5 h-3.5 text-primary" />} />
                <StatBlock label="Reviews received" value={totalReviews} icon={<MessageSquare className="w-3.5 h-3.5 text-primary" />} />
                <StatBlock label="Avg rating" value={avgRating} icon={<Star className="w-3.5 h-3.5 text-amber-400" />} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-display text-base font-medium text-foreground mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Travel Overview
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <StatBlock label="Countries visited" value={countries} />
                <StatBlock label="Places visited" value={visitedCount} />
                <StatBlock label="Experiences shared" value={experiences.length} />
                <StatBlock label="Photos uploaded" value={photosCount} />
                <StatBlock label="Validated impact" value={reputation?.validated_score ?? 0} />
                <StatBlock label="Travelers helped" value={reputation?.travelers_helped ?? 0} />
              </div>
            </motion.div>

            <TravelerLevelCard level={level} />
            <TrustScoreCard
              trustScore={profile?.trust_score ?? 0}
              isVerified={profile?.is_verified ?? false}
              validatedScore={reputation?.validated_score ?? 0}
              travelersHelped={reputation?.travelers_helped ?? 0}
              contributionCount={reputation?.contribution_count ?? 0}
            />
          </div>
        )}

        {/* ═══════ ABOUT TAB ═══════ */}
        {tab === "about" && (
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-display text-base font-medium text-foreground mb-4">Travel Identity</h3>
              <div className="space-y-4">
                {profile?.interests && profile.interests.length > 0 && (
                  <AboutRow icon={<Heart className="w-4 h-4" />} label="Interests">
                    <div className="flex flex-wrap gap-1.5">
                      {profile.interests.map((i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">{i}</span>
                      ))}
                    </div>
                  </AboutRow>
                )}
                {profile?.languages && profile.languages.length > 0 && (
                  <AboutRow icon={<Languages className="w-4 h-4" />} label="Languages">
                    <p className="text-sm text-foreground">{profile.languages.join(", ")}</p>
                  </AboutRow>
                )}
                {profile?.travel_style && profile.travel_style.length > 0 && (
                  <AboutRow icon={<Compass className="w-4 h-4" />} label="Travel Style">
                    <div className="flex flex-wrap gap-1.5">
                      {profile.travel_style.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground text-[10px] font-medium">{s}</span>
                      ))}
                    </div>
                  </AboutRow>
                )}
                {profile?.dream_destinations && profile.dream_destinations.length > 0 && (
                  <AboutRow icon={<Sparkles className="w-4 h-4" />} label="Dream Destinations">
                    <p className="text-sm text-foreground">{profile.dream_destinations.join(", ")}</p>
                  </AboutRow>
                )}
                {profile?.next_trip && (
                  <AboutRow icon={<Plane className="w-4 h-4" />} label="Next Trip">
                    <p className="text-sm text-foreground">{profile.next_trip}</p>
                  </AboutRow>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-2xl bg-card border border-border">
              <p className="text-xs text-muted-foreground">
                Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "–"}
              </p>
            </motion.div>
          </div>
        )}

        {/* ═══════ SETTINGS TAB ═══════ */}
        {tab === "settings" && (
          <div className="space-y-3">
            <button onClick={startEdit} className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-muted/50 transition-colors">
              <Edit3 className="w-4 h-4" /> Edit Profile
            </button>
            <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </div>

      <ExperienceComposer open={showComposer} onClose={() => setShowComposer(false)} />
    </div>
  );
};

/* ── Timeline Experience Card ── */
const TimelineCard = ({ exp }: { exp: ExperienceWithPhotos }) => {
  const [showGallery, setShowGallery] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="relative rounded-2xl bg-card border border-border overflow-hidden">
      <div className="absolute -left-[calc(1rem+5px)] top-4 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card" />
      {exp.photos.length > 0 && (
        <div className="relative cursor-pointer" onClick={() => setShowGallery(!showGallery)}>
          {exp.photos.length === 1 ? (
            <img src={exp.photos[0]} alt="" className="w-full h-36 object-cover" />
          ) : (
            <div className="grid grid-cols-2 gap-0.5 h-36">
              <img src={exp.photos[0]} alt="" className="w-full h-full object-cover" />
              <div className="relative">
                <img src={exp.photos[1]} alt="" className="w-full h-full object-cover" />
                {exp.photos.length > 2 && (
                  <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                    <span className="text-primary-foreground text-sm font-medium">+{exp.photos.length - 2}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {showGallery && exp.photos.length > 2 && (
        <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-0.5">
          {exp.photos.slice(2).map((url, i) => <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />)}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground">{exp.title}</h4>
            {exp.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {exp.city}{exp.country ? `, ${exp.country}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {exp.rating && exp.rating > 0 && (
              <span className="flex items-center gap-0.5">
                {[...Array(Math.min(exp.rating, 5))].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground capitalize">{exp.category.replace("_", " ")}</span>
          </div>
        </div>
        {exp.caption && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{exp.caption}</p>}
        {exp.tags && exp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {exp.tags.map((tag) => <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary">{tag}</span>)}
          </div>
        )}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
          {exp.experience_date && (
            <p className="text-[10px] text-muted-foreground">{new Date(exp.experience_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
          )}
          <div className="flex-1" />
          {exp.saves_count > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Bookmark className="w-3 h-3" /> {exp.saves_count}</span>}
          {exp.review_count > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MessageSquare className="w-3 h-3" /> {exp.review_count}</span>}
          {exp.photos.length > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Image className="w-3 h-3" /> {exp.photos.length}</span>}
        </div>
      </div>
    </motion.div>
  );
};

const HeroStat = ({ value, label }: { value: number | string; label: string }) => (
  <div className="text-center">
    <p className="font-display text-lg font-semibold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

const StatBlock = ({ label, value, icon }: { label: string; value: number | string; icon?: React.ReactNode }) => (
  <div className="p-3 rounded-xl bg-muted/30">
    <div className="flex items-center gap-1.5 mb-1">
      {icon}
      <p className="font-display text-xl font-semibold text-foreground">{value}</p>
    </div>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>
);

const AboutRow = ({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  </div>
);

const EditField = ({ label, value, onChange, multiline, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) => (
  <div>
    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
    {multiline ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        rows={3} className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground resize-none focus:outline-none focus:border-primary/40" />
    ) : (
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/40" />
    )}
  </div>
);

export default Profile;
