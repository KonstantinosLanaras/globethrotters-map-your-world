import { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Lock, Globe, Users, Plane, MessageSquare, Bell, Compass,
  Star, Link2, Palette, LogOut, ChevronDown, ChevronRight, Edit3,
  Camera, Mail, KeyRound, Trash2, Eye, EyeOff, Shield, Share2,
  Tag, Heart, Mountain, Utensils, Landmark, Sparkles, Sun, Moon,
  BadgeCheck, Info, Upload
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRef } from "react";

/* ── Types ── */
type VisibilityLevel = "private" | "connections" | "public";
type TripVisibility = "private" | "invited" | "connections" | "public";

/* ── Section wrapper ── */
const SettingsSection = ({ icon, title, children, defaultOpen = false }: {
  icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border border-border overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors">
        <span className="text-primary">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">{children}</div>}
    </motion.div>
  );
};

/* ── Selector ── */
const OptionSelector = ({ label, options, value, onChange }: {
  label: string; options: { id: string; label: string; icon?: React.ReactNode }[]; value: string; onChange: (v: string) => void;
}) => (
  <div>
    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            value === o.id
              ? "bg-primary/10 text-primary border border-primary/20"
              : "bg-muted text-muted-foreground border border-transparent hover:border-border"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

/* ── Toggle row ── */
const ToggleRow = ({ label, description, checked, onCheckedChange }: {
  label: string; description?: string; checked: boolean; onCheckedChange: (v: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <div className="min-w-0">
      <p className="text-sm text-foreground">{label}</p>
      {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

/* ── Main component ── */
const ProfileSettings = () => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Account edit state
  const [editingAccount, setEditingAccount] = useState(false);
  const [editName, setEditName] = useState(profile?.display_name || "");
  const [editUsername, setEditUsername] = useState(profile?.username || "");
  const [editBio, setEditBio] = useState(profile?.bio || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Privacy state (local — would persist to profile/settings table)
  const [activityVisibility, setActivityVisibility] = useState<VisibilityLevel>("private");
  const [tripsVisibility, setTripsVisibility] = useState<TripVisibility>("invited");
  const [favoritesVisibility, setFavoritesVisibility] = useState<VisibilityLevel>("private");
  const [profileVisibility, setProfileVisibility] = useState<VisibilityLevel>(
    (profile?.privacy as VisibilityLevel) || "connections"
  );
  const [messagingPermission, setMessagingPermission] = useState<"everyone" | "connections">("connections");

  // Trips & collab
  const [tripInvitePermission, setTripInvitePermission] = useState<"anyone" | "connections">("connections");
  const [defaultTripPrivacy, setDefaultTripPrivacy] = useState<"private" | "invited">("private");
  const [allowViewTrips, setAllowViewTrips] = useState(true);
  const [allowTripComments, setAllowTripComments] = useState(false);

  // Sharing & social
  const [shareToChat, setShareToChat] = useState(true);
  const [shareToTrip, setShareToTrip] = useState(true);
  const [sharedExpVisibility, setSharedExpVisibility] = useState<"participants" | "connections" | "public">("participants");
  const [taggingPermission, setTaggingPermission] = useState<"everyone" | "connections" | "none">("connections");

  // Notifications
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifTripInvites, setNotifTripInvites] = useState(true);
  const [notifTripUpdates, setNotifTripUpdates] = useState(true);
  const [notifTags, setNotifTags] = useState(true);
  const [notifFeatured, setNotifFeatured] = useState(true);
  const [notifFriendActivity, setNotifFriendActivity] = useState(false);

  // Discovery preferences
  const [categories, setCategories] = useState<string[]>(profile?.interests || []);
  const [travelStyles, setTravelStyles] = useState<string[]>(profile?.travel_style || []);

  // App preferences
  const [units, setUnits] = useState<"km" | "miles">("km");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const visibilityOptions = [
    { id: "private", label: "Private", icon: <Lock className="w-3 h-3" /> },
    { id: "connections", label: "Connections", icon: <Users className="w-3 h-3" /> },
    { id: "public", label: "Public", icon: <Globe className="w-3 h-3" /> },
  ];

  const tripVisibilityOptions = [
    { id: "private", label: "Private", icon: <Lock className="w-3 h-3" /> },
    { id: "invited", label: "Invited only", icon: <Shield className="w-3 h-3" /> },
    { id: "connections", label: "Connections", icon: <Users className="w-3 h-3" /> },
    { id: "public", label: "Public", icon: <Globe className="w-3 h-3" /> },
  ];

  const categoryOptions = ["Food", "Nature", "Culture", "Experiences", "Nightlife", "Adventure", "Wellness", "Architecture"];
  const styleOptions = ["Budget", "Luxury", "Adventure", "Relaxed", "Solo", "Family", "Backpacking"];

  const toggleCategory = (c: string) => {
    setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const toggleStyle = (s: string) => {
    setTravelStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await updateProfile.mutateAsync({ user_id: user.id, avatar_url: url } as any);
      toast.success("Profile photo updated!");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveAccountChanges = async () => {
    if (!user) return;
    try {
      await updateProfile.mutateAsync({
        user_id: user.id,
        display_name: editName.trim(),
        username: editUsername.trim(),
        bio: editBio.trim(),
      } as any);
      toast.success("Profile updated!");
      setEditingAccount(false);
    } catch {
      toast.error("Failed to update");
    }
  };

  const saveDiscoveryPreferences = async () => {
    if (!user) return;
    try {
      await updateProfile.mutateAsync({
        user_id: user.id,
        interests: categories,
        travel_style: travelStyles,
      } as any);
      toast.success("Preferences saved!");
    } catch {
      toast.error("Failed to save preferences");
    }
  };

  const savePrivacySettings = async () => {
    if (!user) return;
    try {
      await updateProfile.mutateAsync({
        user_id: user.id,
        privacy: profileVisibility,
      } as any);
      toast.success("Privacy settings updated!");
    } catch {
      toast.error("Failed to update privacy");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="space-y-3">
      {/* ─── 1. Account & Profile ─── */}
      <SettingsSection icon={<User className="w-4 h-4" />} title="Account & Profile" defaultOpen>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative group flex-shrink-0">
            <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-xl bg-foreground/0 group-hover:bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-primary-foreground" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{profile?.display_name || "Traveler"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <button
            onClick={() => {
              setEditName(profile?.display_name || "");
              setEditUsername(profile?.username || "");
              setEditBio(profile?.bio || "");
              setEditingAccount(!editingAccount);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
          >
            {editingAccount ? "Cancel" : "Edit"}
          </button>
        </div>

        {editingAccount && (
          <div className="space-y-3 pt-2 border-t border-border">
            <SettingsField label="Display Name" value={editName} onChange={setEditName} />
            <SettingsField label="Username" value={editUsername} onChange={setEditUsername} placeholder="@username" />
            <SettingsField label="Bio" value={editBio} onChange={setEditBio} multiline placeholder="Tell travelers about yourself..." />
            <div className="flex justify-end">
              <button onClick={saveAccountChanges} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <button className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-1.5">
            <KeyRound className="w-3.5 h-3.5" /> Change Password
          </button>
          <button onClick={() => setShowDeleteConfirm(!showDeleteConfirm)} className="flex items-center gap-2 text-xs text-destructive hover:text-destructive/80 transition-colors py-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Delete Account
          </button>
          {showDeleteConfirm && (
            <div className="mt-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive mb-2">This action cannot be undone. All your data will be permanently deleted.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 rounded-lg text-xs bg-muted text-foreground">Cancel</button>
                <button className="px-3 py-1.5 rounded-lg text-xs bg-destructive text-destructive-foreground">Confirm Delete</button>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* ─── 2. Privacy & Visibility ─── */}
      <SettingsSection icon={<Lock className="w-4 h-4" />} title="Privacy & Visibility">
        <OptionSelector
          label="Activity visibility"
          options={visibilityOptions}
          value={activityVisibility}
          onChange={(v) => setActivityVisibility(v as VisibilityLevel)}
        />
        <OptionSelector
          label="Trips visibility"
          options={tripVisibilityOptions}
          value={tripsVisibility}
          onChange={(v) => setTripsVisibility(v as TripVisibility)}
        />
        <OptionSelector
          label="Favorites visibility"
          options={visibilityOptions}
          value={favoritesVisibility}
          onChange={(v) => setFavoritesVisibility(v as VisibilityLevel)}
        />
        <OptionSelector
          label="Who can see your profile"
          options={[
            { id: "public", label: "Everyone", icon: <Globe className="w-3 h-3" /> },
            { id: "connections", label: "Connections only", icon: <Users className="w-3 h-3" /> },
          ]}
          value={profileVisibility}
          onChange={(v) => setProfileVisibility(v as VisibilityLevel)}
        />
        <OptionSelector
          label="Who can message you"
          options={[
            { id: "everyone", label: "Everyone", icon: <Globe className="w-3 h-3" /> },
            { id: "connections", label: "Connections only", icon: <Users className="w-3 h-3" /> },
          ]}
          value={messagingPermission}
          onChange={(v) => setMessagingPermission(v as any)}
        />
        <div className="flex justify-end pt-2">
          <button onClick={savePrivacySettings} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            Save Privacy Settings
          </button>
        </div>
      </SettingsSection>

      {/* ─── 3. Trips & Collaboration ─── */}
      <SettingsSection icon={<Plane className="w-4 h-4" />} title="Trips & Collaboration">
        <OptionSelector
          label="Who can be invited to your trips"
          options={[
            { id: "anyone", label: "Anyone", icon: <Globe className="w-3 h-3" /> },
            { id: "connections", label: "Connections only", icon: <Users className="w-3 h-3" /> },
          ]}
          value={tripInvitePermission}
          onChange={(v) => setTripInvitePermission(v as any)}
        />
        <OptionSelector
          label="Default trip privacy"
          options={[
            { id: "private", label: "Private", icon: <Lock className="w-3 h-3" /> },
            { id: "invited", label: "Shared with invited", icon: <Shield className="w-3 h-3" /> },
          ]}
          value={defaultTripPrivacy}
          onChange={(v) => setDefaultTripPrivacy(v as any)}
        />
        <ToggleRow label="Allow others to view shared trips" checked={allowViewTrips} onCheckedChange={setAllowViewTrips} />
        <ToggleRow label="Allow comments on trips" checked={allowTripComments} onCheckedChange={setAllowTripComments} />
      </SettingsSection>

      {/* ─── 4. Sharing & Social ─── */}
      <SettingsSection icon={<Share2 className="w-4 h-4" />} title="Sharing & Social">
        <ToggleRow label="Share to Chat" description="Allow sharing experiences in messages" checked={shareToChat} onCheckedChange={setShareToChat} />
        <ToggleRow label="Share to Trip" description="Allow adding shared experiences to trips" checked={shareToTrip} onCheckedChange={setShareToTrip} />
        <OptionSelector
          label="Shared experience visibility"
          options={[
            { id: "participants", label: "Participants only", icon: <Lock className="w-3 h-3" /> },
            { id: "connections", label: "Connections", icon: <Users className="w-3 h-3" /> },
            { id: "public", label: "Public", icon: <Globe className="w-3 h-3" /> },
          ]}
          value={sharedExpVisibility}
          onChange={(v) => setSharedExpVisibility(v as any)}
        />
        <OptionSelector
          label="Who can tag you"
          options={[
            { id: "everyone", label: "Everyone", icon: <Globe className="w-3 h-3" /> },
            { id: "connections", label: "Connections", icon: <Users className="w-3 h-3" /> },
            { id: "none", label: "No one", icon: <EyeOff className="w-3 h-3" /> },
          ]}
          value={taggingPermission}
          onChange={(v) => setTaggingPermission(v as any)}
        />
      </SettingsSection>

      {/* ─── 5. Notifications ─── */}
      <SettingsSection icon={<Bell className="w-4 h-4" />} title="Notifications">
        <ToggleRow label="Messages" checked={notifMessages} onCheckedChange={setNotifMessages} />
        <ToggleRow label="Trip invitations" checked={notifTripInvites} onCheckedChange={setNotifTripInvites} />
        <ToggleRow label="Trip updates" description="Added experiences, changes" checked={notifTripUpdates} onCheckedChange={setNotifTripUpdates} />
        <ToggleRow label="Tags" checked={notifTags} onCheckedChange={setNotifTags} />
        <ToggleRow label="Featured experiences" checked={notifFeatured} onCheckedChange={setNotifFeatured} />
        <ToggleRow label="Friend activity" checked={notifFriendActivity} onCheckedChange={setNotifFriendActivity} />
      </SettingsSection>

      {/* ─── 6. Discovery Preferences ─── */}
      <SettingsSection icon={<Compass className="w-4 h-4" />} title="Discovery Preferences">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Preferred Categories</p>
          <div className="flex flex-wrap gap-1.5">
            {categoryOptions.map((c) => (
              <button
                key={c}
                onClick={() => toggleCategory(c.toLowerCase())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  categories.includes(c.toLowerCase())
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground border border-transparent hover:border-border"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Travel Style</p>
          <div className="flex flex-wrap gap-1.5">
            {styleOptions.map((s) => (
              <button
                key={s}
                onClick={() => toggleStyle(s.toLowerCase())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  travelStyles.includes(s.toLowerCase())
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground border border-transparent hover:border-border"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={saveDiscoveryPreferences} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors">
            Save Preferences
          </button>
        </div>
      </SettingsSection>

      {/* ─── 7. Featured Transparency ─── */}
      <SettingsSection icon={<BadgeCheck className="w-4 h-4" />} title="Featured & Verified Places">
        <div className="p-4 rounded-xl bg-muted/30 border border-border">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">How featured places work</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Globetrotters highlights certain experiences as featured.
                To qualify, places must:
              </p>
              <ul className="mt-2 space-y-1.5">
                <li className="text-xs text-muted-foreground flex items-start gap-2">
                  <Star className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                  Have strong and consistent ratings
                </li>
                <li className="text-xs text-muted-foreground flex items-start gap-2">
                  <MessageSquare className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                  Receive positive community reviews
                </li>
                <li className="text-xs text-muted-foreground flex items-start gap-2">
                  <Shield className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                  Meet quality standards
                </li>
                <li className="text-xs text-muted-foreground flex items-start gap-2">
                  <Users className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                  Be approved by local collaborators
                </li>
              </ul>
              <p className="text-[11px] text-muted-foreground/70 mt-3 italic">
                This ensures every featured place is authentic and trusted by the community.
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ─── 8. Connected Services ─── */}
      <SettingsSection icon={<Link2 className="w-4 h-4" />} title="Connected Services">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Google Maps</p>
                <p className="text-[11px] text-muted-foreground">Location-based discovery</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">Coming soon</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Plane className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Travel Services</p>
                <p className="text-[11px] text-muted-foreground">Booking & flight integrations</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">Coming soon</span>
          </div>
        </div>
      </SettingsSection>

      {/* ─── 9. App Preferences ─── */}
      <SettingsSection icon={<Palette className="w-4 h-4" />} title="App Preferences">
        <OptionSelector
          label="Distance units"
          options={[
            { id: "km", label: "Kilometers" },
            { id: "miles", label: "Miles" },
          ]}
          value={units}
          onChange={(v) => setUnits(v as any)}
        />
        <OptionSelector
          label="Theme"
          options={[
            { id: "light", label: "Light", icon: <Sun className="w-3 h-3" /> },
            { id: "dark", label: "Dark", icon: <Moon className="w-3 h-3" /> },
          ]}
          value={theme}
          onChange={(v) => setTheme(v as any)}
        />
      </SettingsSection>

      {/* ─── 10. Sign Out ─── */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>

      <p className="text-[10px] text-muted-foreground/50 text-center pt-2 pb-4">
        Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "–"}
      </p>
    </div>
  );
};

/* ── Settings field ── */
const SettingsField = ({ label, value, onChange, multiline, placeholder }: {
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

export default ProfileSettings;
