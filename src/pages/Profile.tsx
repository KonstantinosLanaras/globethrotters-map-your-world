import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import {
  User, Globe, MapPin, LogOut, Shield, Edit3, Check, X,
  Heart, Compass, Users, Lock, Sparkles, Languages, Plane, Star, Camera, Plus, Image
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { usePlaces } from "@/hooks/usePlaces";
import { useExperiencesWithPhotos, ExperienceWithPhotos } from "@/hooks/useExperiences";
import { useTravelerLevel } from "@/hooks/useTravelerLevel";
import { useNavigate } from "react-router-dom";
import VerifiedBadge from "@/components/VerifiedBadge";
import TrustScoreCard from "@/components/TrustScoreCard";
import TravelerLevelCard from "@/components/TravelerLevelCard";
import ExperienceComposer from "@/components/ExperienceComposer";
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
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [tab, setTab] = useState<"experiences" | "stats" | "settings">("experiences");

  // Edit state
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editHomeBase, setEditHomeBase] = useState("");
  const [editInterests, setEditInterests] = useState("");
  const [editLanguages, setEditLanguages] = useState("");
  const [editDreamDest, setEditDreamDest] = useState("");
  const [editNextTrip, setEditNextTrip] = useState("");
  const [editPrivacy, setEditPrivacy] = useState("");

  const visitedCount = places.filter((p) => p.type === "visited").length;
  const wishlistCount = places.filter((p) => p.type === "wishlist").length;
  const countries = new Set(places.filter((p) => p.type === "visited").map((p) => p.country)).size;
  const level = useTravelerLevel(places);

  // Stats
  const avgRating = experiences.length > 0
    ? (experiences.reduce((sum, e) => sum + (e.rating || 0), 0) / experiences.filter(e => e.rating > 0).length || 0).toFixed(1)
    : "–";
  const photosCount = experiences.reduce((sum, e) => sum + e.photos.length, 0);
  const topCategories = Object.entries(
    experiences.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] || 0) + 1 }), {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const startEdit = () => {
    setEditName(profile?.display_name || "");
    setEditBio((profile as any)?.bio || "");
    setEditHomeBase((profile as any)?.home_base || "");
    setEditInterests(profile?.interests?.join(", ") || "");
    setEditLanguages((profile as any)?.languages?.join(", ") || "");
    setEditDreamDest((profile as any)?.dream_destinations?.join(", ") || "");
    setEditNextTrip((profile as any)?.next_trip || "");
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const tabs = [
    { id: "experiences" as const, label: "Experiences" },
    { id: "stats" as const, label: "Stats" },
    { id: "settings" as const, label: "Settings" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[70px] pb-12 max-w-2xl mx-auto px-4">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/5 via-card to-card border border-border mb-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-2xl font-semibold text-foreground truncate">
                  {profile?.display_name || "Traveler"}
                </h1>
                <VerifiedBadge isVerified={profile?.is_verified ?? false} size="md" />
              </div>
              {(profile as any)?.username && (
                <p className="text-xs text-muted-foreground">@{(profile as any).username}</p>
              )}
              {(profile as any)?.bio && (
                <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{(profile as any).bio}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {(profile as any)?.home_base && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" /> {(profile as any).home_base}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="w-3 h-3" /> {profile?.privacy || "private"}
                </span>
              </div>
            </div>
            <button
              onClick={startEdit}
              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 flex-shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-5 gap-2 mt-5">
            <MiniStat value={countries} label="Countries" />
            <MiniStat value={visitedCount} label="Visited" />
            <MiniStat value={experiences.length} label="Experiences" />
            <MiniStat value={photosCount} label="Photos" />
            <MiniStat value={wishlistCount} label="Wishlist" />
          </div>
        </motion.div>

        {/* Edit Modal */}
        {editing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-card border border-border mb-4 space-y-3"
          >
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
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-muted/50 p-1 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* EXPERIENCES TAB (Main content — Strava model) */}
        {tab === "experiences" && (
          <div className="space-y-3">
            <button
              onClick={() => setShowComposer(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Experience
            </button>

            {experiences.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No experiences yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Add your first travel experience</p>
              </div>
            ) : (
              experiences.map((exp) => (
                <ProfileExperienceCard key={exp.id} exp={exp} />
              ))
            )}
          </div>
        )}

        {/* STATS TAB */}
        {tab === "stats" && (
          <div className="space-y-4">
            {/* Key numbers */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-display text-base font-medium text-foreground mb-4">Travel Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <StatBlock label="Countries visited" value={countries} />
                <StatBlock label="Places visited" value={visitedCount} />
                <StatBlock label="Experiences" value={experiences.length} />
                <StatBlock label="Photos shared" value={photosCount} />
                <StatBlock label="Avg rating given" value={avgRating} />
                <StatBlock label="On wishlist" value={wishlistCount} />
              </div>
            </motion.div>

            {/* Top categories */}
            {topCategories.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-display text-base font-medium text-foreground mb-3">Top Categories</h3>
                <div className="space-y-2">
                  {topCategories.map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <span className="text-sm text-foreground capitalize">{cat.replace("_", " ")}</span>
                      <span className="text-xs text-muted-foreground">{count} experience{count !== 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Travel identity */}
            {((profile as any)?.languages?.length > 0 || (profile as any)?.dream_destinations?.length > 0 || (profile as any)?.next_trip) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 rounded-2xl bg-card border border-border">
                <h3 className="font-display text-base font-medium text-foreground mb-3">Travel Identity</h3>
                <div className="space-y-3">
                  {(profile as any)?.languages?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Languages className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Languages</p>
                        <p className="text-sm text-foreground">{(profile as any).languages.join(", ")}</p>
                      </div>
                    </div>
                  )}
                  {(profile as any)?.dream_destinations?.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Compass className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Dream Destinations</p>
                        <p className="text-sm text-foreground">{(profile as any).dream_destinations.join(", ")}</p>
                      </div>
                    </div>
                  )}
                  {(profile as any)?.next_trip && (
                    <div className="flex items-start gap-2">
                      <Plane className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Next Trip</p>
                        <p className="text-sm text-foreground">{(profile as any).next_trip}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            <TrustScoreCard trustScore={profile?.trust_score ?? 0} isVerified={profile?.is_verified ?? false} />
            <TravelerLevelCard level={level} />
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <div className="space-y-3">
            <button
              onClick={startEdit}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-border text-sm text-foreground hover:bg-muted/50 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>

      <ExperienceComposer open={showComposer} onClose={() => setShowComposer(false)} />
    </div>
  );
};

/* Profile experience card with photo preview */
const ProfileExperienceCard = ({ exp }: { exp: ExperienceWithPhotos }) => {
  const [showGallery, setShowGallery] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card border border-border overflow-hidden"
    >
      {/* Photo preview: 1-2 images */}
      {exp.photos.length > 0 && (
        <div className="relative cursor-pointer" onClick={() => setShowGallery(!showGallery)}>
          {exp.photos.length === 1 ? (
            <img src={exp.photos[0]} alt="" className="w-full h-40 object-cover" />
          ) : (
            <div className="grid grid-cols-2 gap-0.5 h-40">
              <img src={exp.photos[0]} alt="" className="w-full h-full object-cover" />
              <div className="relative">
                <img src={exp.photos[1]} alt="" className="w-full h-full object-cover" />
                {exp.photos.length > 2 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">+{exp.photos.length - 2}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showGallery && exp.photos.length > 2 && (
        <div className="grid grid-cols-3 gap-0.5 px-0.5 pb-0.5">
          {exp.photos.slice(2).map((url, i) => (
            <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />
          ))}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">{exp.title}</h4>
            {exp.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {exp.city}{exp.country ? `, ${exp.country}` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {exp.rating > 0 && (
              <span className="flex items-center gap-0.5">
                {[...Array(exp.rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                ))}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground capitalize">{exp.category}</span>
          </div>
        </div>
        {exp.caption && <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{exp.caption}</p>}
        {exp.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {exp.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] font-medium text-primary">{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          {exp.experience_date && (
            <p className="text-[10px] text-muted-foreground">{new Date(exp.experience_date).toLocaleDateString()}</p>
          )}
          {exp.photos.length > 0 && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Image className="w-3 h-3" /> {exp.photos.length}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MiniStat = ({ value, label }: { value: number | string; label: string }) => (
  <div className="text-center">
    <p className="font-display text-lg font-semibold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

const StatBlock = ({ label, value }: { label: string; value: number | string }) => (
  <div className="p-3 rounded-xl bg-muted/30">
    <p className="font-display text-xl font-semibold text-foreground">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
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
