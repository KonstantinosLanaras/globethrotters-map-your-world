import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import {
  Plus, MapPin, Star, Calendar, ChevronRight, Trash2, X, Check,
  Plane, Loader2, Share2, Camera, Users, Lock, Globe, Send, Tag,
  MessageSquare, DollarSign, Sparkles, Eye, Heart, UserPlus, LogIn
} from "lucide-react";
import { useJourneys, useAddJourney, useDeleteJourney, useJourneyWithExperiences, useAddExperienceToJourney, useRemoveExperienceFromJourney, Journey } from "@/hooks/useJourneys";
import { useExperiencesWithPhotos, ExperienceWithPhotos } from "@/hooks/useExperiences";
import { useFavoriteJourneyIds, useToggleFavoriteJourney } from "@/hooks/useFavorites";
import { useTripPosts, useAddTripPost, useDeleteTripPost, TripPost } from "@/hooks/useTripPosts";
import { useConnections } from "@/hooks/useShareConnections";
import { useJourneyMembers, useInviteToJourney, useRemoveJourneyMember, useJourneyJoinRequests, useRespondToJoinRequest } from "@/hooks/useJourneyMembers";
import { useMessages, useSendMessage, useStartConversation } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ShareModal, { ShareableItem } from "@/components/ShareModal";

type TripTab = "plan" | "people" | "chat" | "moments" | "share";

const Journeys = () => {
  const { data: journeys = [], isLoading } = useJourneys();
  const { data: experiences = [] } = useExperiencesWithPhotos();
  const addJourney = useAddJourney();
  const deleteJourney = useDeleteJourney();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<string | null>(null);
  const [shareItem, setShareItem] = useState<ShareableItem | null>(null);
  const { data: favJourneyIds = new Set<string>() } = useFavoriteJourneyIds();
  const toggleFavJourney = useToggleFavoriteJourney();
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEmoji, setNewEmoji] = useState("✈️");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  const handleCreate = async () => {
    if (!newTitle.trim()) { toast.error("Add a title"); return; }
    try {
      await addJourney.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim(),
        emoji: newEmoji,
        start_date: newStartDate || undefined,
        end_date: newEndDate || undefined,
      });
      toast.success("Trip created!");
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
      setNewEmoji("✈️");
      setNewStartDate("");
      setNewEndDate("");
    } catch {
      toast.error("Failed to create trip");
    }
  };

  const handleDelete = (id: string) => {
    deleteJourney.mutate(id, {
      onSuccess: () => { toast.success("Trip deleted"); setSelectedJourney(null); },
      onError: () => toast.error("Failed to delete"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[80px] px-4 pb-12 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Trips</h1>
            <p className="text-sm text-muted-foreground">Plan it. Share it. Live it ✈️</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            New Trip
          </button>
        </div>

        {/* Create trip form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-base font-semibold text-foreground">Where are you going next? 🌍</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create a trip with friends, organize every detail, and share the journey as it unfolds.
                    </p>
                  </div>
                  <button onClick={() => setShowCreate(false)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    value={newEmoji}
                    onChange={e => setNewEmoji(e.target.value.slice(0, 2))}
                    className="w-12 text-center px-2 py-2.5 rounded-xl border border-border bg-background text-lg focus:outline-none focus:border-primary/40"
                  />
                  <input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Greece Trip 2024"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                    autoFocus
                  />
                </div>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="What's this trip about? (optional)"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Start date</p>
                    <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/40" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">End date</p>
                    <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/40" />
                  </div>
                </div>

                {/* Feature highlights */}
                <div className="rounded-xl bg-muted/30 border border-border p-3 space-y-2">
                  <p className="text-[11px] font-medium text-foreground/80">✨ Everything in one place</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { icon: <MapPin className="w-3 h-3" />, label: "Add experiences" },
                      { icon: <Users className="w-3 h-3" />, label: "Invite friends" },
                      { icon: <MessageSquare className="w-3 h-3" />, label: "Group chat" },
                      { icon: <Camera className="w-3 h-3" />, label: "Capture moments" },
                    ].map(f => (
                      <div key={f.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {f.icon} {f.label}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 pt-1 border-t border-border/50">
                    🔒 Nothing is shared unless you choose to.
                  </p>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || addJourney.isPending}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90"
                >
                  {addJourney.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Trip"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trips list or detail */}
        {selectedJourney ? (
          <TripHub
            journeyId={selectedJourney}
            allExperiences={experiences}
            onBack={() => setSelectedJourney(null)}
            onDelete={handleDelete}
            onShare={setShareItem}
            isFav={favJourneyIds.has(selectedJourney)}
            onToggleFav={toggleFavJourney}
          />
        ) : (
          <>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" />
              </div>
            ) : journeys.length === 0 ? (
              <div className="text-center py-16">
                <Plane className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-display text-lg font-medium text-foreground mb-1">Plan it. Share it. Live it ✈️</h3>
                <p className="text-sm text-muted-foreground mb-1">
                  Create a trip with friends, organize every detail, and share the journey as it unfolds.
                </p>
                <p className="text-xs text-muted-foreground/70 mb-1">
                  Add people, choose experiences, chat, track your budget, and share moments — all in one place.
                </p>
                <p className="text-[10px] text-muted-foreground/50 mb-5">
                  🔒 Your trip stays private unless you choose to share it.
                </p>
                <button onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                  <Plus className="w-4 h-4" /> Create Trip
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {journeys.map((j, i) => (
                  <motion.button
                    key={j.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedJourney(j.id)}
                    className="w-full p-4 rounded-2xl bg-card border border-border hover:border-primary/10 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{j.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-foreground truncate">{j.title}</h3>
                        {j.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{j.description}</p>}
                        {(j.start_date || j.end_date) && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {j.start_date ? new Date(j.start_date).toLocaleDateString() : ""}
                            {j.start_date && j.end_date ? " – " : ""}
                            {j.end_date ? new Date(j.end_date).toLocaleDateString() : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {j.privacy === "private" && <Lock className="w-3 h-3 text-muted-foreground" />}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {shareItem && (
        <ShareModal open={!!shareItem} onClose={() => setShareItem(null)} item={shareItem} />
      )}
    </div>
  );
};

/* ========== UNIFIED TRIP HUB ========== */
const TripHub = ({
  journeyId, allExperiences, onBack, onDelete, onShare, isFav, onToggleFav,
}: {
  journeyId: string;
  allExperiences: ExperienceWithPhotos[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onShare: (item: ShareableItem) => void;
  isFav: boolean;
  onToggleFav: { mutate: (v: { journeyId: string; isFavorite: boolean }) => void };
}) => {
  const { user } = useAuth();
  const { data: journey, isLoading } = useJourneyWithExperiences(journeyId);
  const addExpToJourney = useAddExperienceToJourney();
  const removeExpFromJourney = useRemoveExperienceFromJourney();
  const { data: posts = [] } = useTripPosts(journeyId);
  const addPost = useAddTripPost();
  const deletePost = useDeleteTripPost();
  const { data: connections = [] } = useConnections();
  const { data: members = [] } = useJourneyMembers(journeyId);
  const inviteToJourney = useInviteToJourney();
  const removeMember = useRemoveJourneyMember();

  const [activeTab, setActiveTab] = useState<TripTab>("plan");
  const [showAddExp, setShowAddExp] = useState(false);
  const [showPostComposer, setShowPostComposer] = useState(false);

  // Post composer state
  const [postCaption, setPostCaption] = useState("");
  const [postPhoto, setPostPhoto] = useState<File | null>(null);
  const [postPhotoPreview, setPostPhotoPreview] = useState<string | null>(null);
  const [postExpId, setPostExpId] = useState<string | null>(null);
  const [postTaggedIds, setPostTaggedIds] = useState<string[]>([]);
  const [postVisibility, setPostVisibility] = useState("private");
  const [posting, setPosting] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoading || !journey) {
    return <div className="text-center py-12"><div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" /></div>;
  }

  const linkedIds = new Set(journey.experiences.map(e => e.id));
  const available = allExperiences.filter(e => !linkedIds.has(e.id));

  const handleAdd = (expId: string) => {
    addExpToJourney.mutate({ journeyId, experienceId: expId }, {
      onSuccess: () => toast.success("Experience added"),
      onError: () => toast.error("Failed to add"),
    });
  };

  const handleRemove = (expId: string) => {
    removeExpFromJourney.mutate({ journeyId, experienceId: expId }, {
      onSuccess: () => toast.success("Removed"),
      onError: () => toast.error("Failed to remove"),
    });
  };

  const handlePhotoSelect = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const file = files[0];
    setPostPhoto(file);
    const reader = new FileReader();
    reader.onload = () => setPostPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetComposer = () => {
    setPostCaption("");
    setPostPhoto(null);
    setPostPhotoPreview(null);
    setPostExpId(null);
    setPostTaggedIds([]);
    setPostVisibility("private");
    setShowPostComposer(false);
    setShowTagPicker(false);
  };

  const handlePost = async () => {
    if (!postCaption.trim() && !postPhoto) { toast.error("Add a caption or photo"); return; }
    if (!user) return;
    setPosting(true);
    try {
      let photoUrl: string | null = null;
      if (postPhoto) {
        const ext = postPhoto.name.split(".").pop();
        const path = `${user.id}/${journeyId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("experience-photos").upload(path, postPhoto);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("experience-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
      await addPost.mutateAsync({
        journey_id: journeyId,
        caption: postCaption.trim(),
        photo_url: photoUrl,
        experience_id: postExpId,
        tagged_user_ids: postTaggedIds,
        visibility: postVisibility,
      });
      toast.success("Moment captured! 📸");
      resetComposer();
    } catch {
      toast.error("Failed to post");
    } finally {
      setPosting(false);
    }
  };

  const toggleTag = (id: string) => {
    setPostTaggedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleShareExpToChat = async (exp: ExperienceWithPhotos) => {
    // Share experience as a message to the trip's conversation
    // For now, use the ShareModal which sends to connections
    onShare({
      type: "experience",
      id: exp.id,
      title: exp.title,
      city: exp.city,
      country: exp.country,
      category: exp.category || "general",
      rating: exp.rating,
      photo: exp.photos?.[0] || null,
      caption: exp.caption,
    });
  };

  const tabs: { id: TripTab; icon: React.ReactNode; label: string }[] = [
    { id: "plan", icon: <MapPin className="w-3.5 h-3.5" />, label: "Plan" },
    { id: "people", icon: <Users className="w-3.5 h-3.5" />, label: "People" },
    { id: "chat", icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Chat" },
    { id: "moments", icon: <Camera className="w-3.5 h-3.5" />, label: "Moments" },
    { id: "share", icon: <Globe className="w-3.5 h-3.5" />, label: "Share" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleFav.mutate({ journeyId, isFavorite: isFav })}
            className="text-xs text-muted-foreground hover:text-amber-500 flex items-center gap-1 transition-colors"
          >
            <Star className={`w-3 h-3 ${isFav ? "fill-amber-400 text-amber-400" : ""}`} />
          </button>
          <button
            onClick={() => onDelete(journeyId)}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Trip info card */}
      <div className="p-5 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{journey.emoji}</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl font-semibold text-foreground truncate">{journey.title}</h2>
            {journey.description && <p className="text-sm text-muted-foreground truncate">{journey.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {(journey.start_date || journey.end_date) && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {journey.start_date ? new Date(journey.start_date).toLocaleDateString() : ""}
              {journey.start_date && journey.end_date ? " – " : ""}
              {journey.end_date ? new Date(journey.end_date).toLocaleDateString() : ""}
            </span>
          )}
          <span>{journey.experiences.length} exp</span>
          <span>{posts.length} moment{posts.length !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-0.5">
            <Users className="w-2.5 h-2.5" /> {members.filter(m => m.status === "accepted").length + 1}
          </span>
          <span className="flex items-center gap-0.5">
            <Lock className="w-2.5 h-2.5" /> {journey.privacy}
          </span>
        </div>

        {/* Member avatars row */}
        {members.filter(m => m.status === "accepted").length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-semibold text-primary">You</div>
            {members.filter(m => m.status === "accepted").slice(0, 5).map(m => (
              <div key={m.id} className="w-6 h-6 rounded-full bg-muted overflow-hidden flex-shrink-0">
                {m.profile?.avatar_url ? (
                  <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                    {(m.profile?.display_name || "?")[0]}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-0.5 p-1 rounded-xl bg-muted/40 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap min-w-0 ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "plan" && (
          <motion.div key="plan" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <PlanTab
              journey={journey}
              available={available}
              showAddExp={showAddExp}
              onToggleAddExp={() => setShowAddExp(!showAddExp)}
              onAdd={handleAdd}
              onRemove={handleRemove}
              onShareExp={handleShareExpToChat}
            />
          </motion.div>
        )}
        {activeTab === "people" && (
          <motion.div key="people" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <PeopleTab
              journeyId={journeyId}
              members={members}
              connections={connections}
              inviteToJourney={inviteToJourney}
              removeMember={removeMember}
              journey={journey}
            />
          </motion.div>
        )}
        {activeTab === "chat" && (
          <motion.div key="chat" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <ChatTab
              journeyId={journeyId}
              journey={journey}
              members={members}
              connections={connections}
            />
          </motion.div>
        )}
        {activeTab === "moments" && (
          <motion.div key="moments" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <MomentsTab
              journey={journey}
              posts={posts}
              connections={connections}
              showComposer={showPostComposer}
              onToggleComposer={() => setShowPostComposer(!showPostComposer)}
              postCaption={postCaption}
              setPostCaption={setPostCaption}
              postPhotoPreview={postPhotoPreview}
              postExpId={postExpId}
              setPostExpId={setPostExpId}
              postTaggedIds={postTaggedIds}
              postVisibility={postVisibility}
              setPostVisibility={setPostVisibility}
              showTagPicker={showTagPicker}
              setShowTagPicker={setShowTagPicker}
              toggleTag={toggleTag}
              posting={posting}
              fileRef={fileRef}
              onPhotoSelect={handlePhotoSelect}
              onClearPhoto={() => { setPostPhoto(null); setPostPhotoPreview(null); }}
              onPost={handlePost}
              onReset={resetComposer}
              onDeletePost={(id: string) => deletePost.mutate({ id, journeyId })}
              journeyId={journeyId}
            />
          </motion.div>
        )}
        {activeTab === "share" && (
          <motion.div key="share" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <ShareTab
              journey={journey}
              journeyId={journeyId}
              posts={posts}
              onShare={onShare}
              members={members}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ========== PLAN TAB ========== */
const PlanTab = ({
  journey, available, showAddExp, onToggleAddExp, onAdd, onRemove, onShareExp,
}: {
  journey: any;
  available: ExperienceWithPhotos[];
  showAddExp: boolean;
  onToggleAddExp: () => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
  onShareExp: (exp: ExperienceWithPhotos) => void;
}) => (
  <>
    {/* Section header */}
    <div className="rounded-xl bg-muted/30 border border-border p-3">
      <p className="text-xs font-medium text-foreground/80">Build your trip, together 🤝</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        Add experiences, invite friends, and organize every detail.
      </p>
    </div>

    <button
      onClick={onToggleAddExp}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
    >
      <Plus className="w-4 h-4" />
      Add Experience
    </button>

    {/* Experience picker */}
    <AnimatePresence>
      {showAddExp && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="p-3 rounded-2xl bg-muted/30 border border-border space-y-2 max-h-[300px] overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground px-1">Select experiences to add:</p>
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">All experiences already added</p>
            ) : (
              available.map(exp => (
                <button
                  key={exp.id}
                  onClick={() => onAdd(exp.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-card/80 transition-colors text-left"
                >
                  {exp.photos[0] ? (
                    <img src={exp.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{exp.title}</p>
                    <p className="text-[10px] text-muted-foreground">{exp.city}{exp.country ? `, ${exp.country}` : ""}</p>
                  </div>
                  <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Experience timeline */}
    {journey.experiences.length === 0 ? (
      <div className="text-center py-8">
        <MapPin className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No experiences yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Start adding places you want to visit</p>
      </div>
    ) : (
      <div className="relative">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          📍 Experiences ({journey.experiences.length})
        </h3>
        <div className="absolute left-5 top-8 bottom-0 w-0.5 bg-border" />
        {journey.experiences.map((exp: any, i: number) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative pl-12 pb-4"
          >
            <div className="absolute left-[14px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              {exp.photos?.length > 0 && (
                <img src={exp.photos[0]} alt="" className="w-full h-28 object-cover" />
              )}
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-foreground truncate">{exp.title}</h4>
                    {exp.city && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" /> {exp.city}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {exp.rating > 0 && (
                      <span className="flex items-center gap-0.5">
                        {[...Array(exp.rating)].map((_: any, i: number) => (
                          <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        ))}
                      </span>
                    )}
                    {/* Share to chat icon */}
                    <button
                      onClick={() => onShareExp(exp)}
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                      title="Share to chat"
                    >
                      <Share2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => onRemove(exp.id)}
                      className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                {exp.caption && <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{exp.caption}</p>}
                {exp.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {exp.tags.slice(0, 3).map((tag: string) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-[9px] font-medium text-primary">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    )}
  </>
);

/* ========== PEOPLE TAB ========== */
const PeopleTab = ({
  journeyId, members, connections, inviteToJourney, removeMember, journey,
}: {
  journeyId: string;
  members: any[];
  connections: any[];
  inviteToJourney: any;
  removeMember: any;
  journey: any;
}) => {
  const [showInvite, setShowInvite] = useState(false);
  const { data: joinRequests = [] } = useJourneyJoinRequests(journeyId);
  const respondToJoin = useRespondToJoinRequest();
  const { user } = useAuth();
  const [updatingOpenToJoin, setUpdatingOpenToJoin] = useState(false);

  const memberUserIds = new Set(members.map(m => m.user_id));
  const invitable = connections.filter(c => !memberUserIds.has(c.user_id));

  const handleInvite = (userId: string) => {
    inviteToJourney.mutate({ journeyId, userId }, {
      onSuccess: () => toast.success("Friend added to trip! 🎉"),
      onError: () => toast.error("Failed to invite"),
    });
  };

  const handleRemove = (memberId: string) => {
    removeMember.mutate({ id: memberId, journeyId }, {
      onSuccess: () => toast.success("Removed from trip"),
      onError: () => toast.error("Failed to remove"),
    });
  };

  const toggleOpenToJoin = async () => {
    setUpdatingOpenToJoin(true);
    try {
      const newValue = !(journey as any).open_to_join;
      await supabase.from("journeys" as any).update({ open_to_join: newValue } as any).eq("id", journeyId);
      toast.success(newValue ? "Trip is now open to join requests" : "Join requests disabled");
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdatingOpenToJoin(false);
    }
  };

  return (
    <>
      <div className="rounded-xl bg-muted/30 border border-border p-3">
        <p className="text-xs font-medium text-foreground/80">Your travel crew 👥</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Add friends to plan together, chat, and share the journey.
        </p>
      </div>

      <button
        onClick={() => setShowInvite(!showInvite)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
      >
        <UserPlus className="w-4 h-4" />
        Add Friends
      </button>

      {/* Invite picker */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-3 rounded-2xl bg-muted/30 border border-border space-y-2 max-h-[250px] overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground px-1">Select from your connections:</p>
              {invitable.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {connections.length === 0 ? "No connections yet — connect with travelers first" : "All connections already added"}
                </p>
              ) : (
                invitable.map(c => (
                  <button
                    key={c.user_id}
                    onClick={() => handleInvite(c.user_id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-card hover:bg-card/80 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                      {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-muted-foreground m-auto mt-2" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.display_name || c.username || "Traveler"}</p>
                      {c.username && <p className="text-[10px] text-muted-foreground">@{c.username}</p>}
                    </div>
                    <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current members */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          👥 Trip Members ({members.filter(m => m.status === "accepted").length + 1})
        </h3>

        {/* Owner */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Star className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">You</p>
            <p className="text-[10px] text-muted-foreground">Trip organizer</p>
          </div>
        </div>

        {/* Members */}
        {members.filter(m => m.status === "accepted").map(m => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
              {m.profile?.avatar_url ? (
                <img src={m.profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {(m.profile?.display_name || "?")[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{m.profile?.display_name || "Traveler"}</p>
              <p className="text-[10px] text-muted-foreground">Member</p>
            </div>
            <button
              onClick={() => handleRemove(m.id)}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>

      {/* Open to join toggle */}
      <div className="rounded-xl bg-muted/30 border border-border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-foreground/80 flex items-center gap-1">
              <LogIn className="w-3 h-3" /> Open to Join
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Allow other travelers to request to join this trip</p>
          </div>
          <button
            onClick={toggleOpenToJoin}
            disabled={updatingOpenToJoin}
            className={`w-10 h-5 rounded-full transition-colors relative ${(journey as any).open_to_join ? "bg-primary" : "bg-muted"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-background shadow-sm absolute top-0.5 transition-all ${(journey as any).open_to_join ? "left-5.5 right-0.5" : "left-0.5"}`} 
              style={{ left: (journey as any).open_to_join ? '22px' : '2px' }}
            />
          </button>
        </div>
      </div>

      {/* Join requests */}
      {joinRequests.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            🔔 Join Requests ({joinRequests.length})
          </h3>
          {joinRequests.map((req: any) => (
            <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-amber-200/50">
              <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex-shrink-0">
                {req.profile?.avatar_url ? (
                  <img src={req.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-4 h-4 text-muted-foreground m-auto mt-2" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{req.profile?.display_name || "Traveler"}</p>
                <p className="text-[10px] text-muted-foreground">Wants to join</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => respondToJoin.mutate({ requestId: req.id, journeyId, userId: req.user_id, accept: true })}
                  className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <Check className="w-3.5 h-3.5 text-primary" />
                </button>
                <button
                  onClick={() => respondToJoin.mutate({ requestId: req.id, journeyId, userId: req.user_id, accept: false })}
                  className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/* ========== CHAT TAB ========== */
const ChatTab = ({
  journeyId, journey, members, connections,
}: {
  journeyId: string;
  journey: any;
  members: any[];
  connections: any[];
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const sendMessage = useSendMessage();
  const startConversation = useStartConversation();
  const [chatConvoId, setChatConvoId] = useState<string | null>((journey as any).conversation_id || null);
  const { data: messages = [] } = useMessages(chatConvoId || undefined);
  const [starting, setStarting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const acceptedMembers = members.filter(m => m.status === "accepted");

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initChat = async () => {
    if (!user || acceptedMembers.length === 0) return;
    setStarting(true);
    try {
      // For group chat, create a conversation with the first member
      // In a real app this would be a group conversation table
      const firstMember = acceptedMembers[0];
      const convoId = await startConversation.mutateAsync(firstMember.user_id);
      
      // Save conversation_id to journey
      await supabase.from("journeys" as any).update({ conversation_id: convoId } as any).eq("id", journeyId);
      setChatConvoId(convoId);
      toast.success("Trip chat started! 💬");
    } catch {
      toast.error("Failed to start chat");
    } finally {
      setStarting(false);
    }
  };

  const handleSend = () => {
    if (!message.trim() || !chatConvoId) return;
    sendMessage.mutate({ conversationId: chatConvoId, content: message.trim() }, {
      onSuccess: () => {
        setMessage("");
        setTimeout(scrollToBottom, 100);
      },
    });
  };

  if (!chatConvoId && acceptedMembers.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Add friends first to start chatting</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Go to the People tab to invite your travel crew</p>
      </div>
    );
  }

  if (!chatConvoId) {
    return (
      <div className="text-center py-8 space-y-3">
        <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Start planning together 💬</p>
        <p className="text-xs text-muted-foreground/70">Chat with your trip crew about plans, ideas, and logistics.</p>
        <button
          onClick={initChat}
          disabled={starting}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
        >
          {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><MessageSquare className="w-4 h-4" /> Start Trip Chat</>}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl bg-muted/30 border border-border p-3">
        <p className="text-xs font-medium text-foreground/80">Trip Chat 💬</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Plan, share ideas, and coordinate with your crew.
        </p>
      </div>

      {/* Messages */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="h-[300px] overflow-y-auto p-3 space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">Say hello! 👋</p>
          ) : (
            messages.map((msg: any) => {
              const isMine = msg.sender_id === user?.id;
              const senderProfile = members.find(m => m.user_id === msg.sender_id)?.profile;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] ${isMine ? "order-2" : ""}`}>
                    {!isMine && (
                      <p className="text-[9px] text-muted-foreground mb-0.5 px-1">
                        {senderProfile?.display_name || "Traveler"}
                      </p>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm ${
                      isMine 
                        ? "bg-primary text-primary-foreground rounded-br-md" 
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}>
                      {msg.content}
                    </div>
                    <p className="text-[8px] text-muted-foreground mt-0.5 px-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-2 flex gap-2">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message…"
            className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMessage.isPending}
            className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

/* ========== MOMENTS TAB ========== */
const MomentsTab = ({
  journey, posts, connections, showComposer, onToggleComposer,
  postCaption, setPostCaption, postPhotoPreview, postExpId, setPostExpId,
  postTaggedIds, postVisibility, setPostVisibility, showTagPicker, setShowTagPicker,
  toggleTag, posting, fileRef, onPhotoSelect, onClearPhoto, onPost, onReset,
  onDeletePost, journeyId,
}: any) => (
  <>
    {/* Section header */}
    <div className="rounded-xl bg-muted/30 border border-border p-3">
      <p className="text-xs font-medium text-foreground/80">Capture moments as they happen 📸</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">
        Turn your trip into a story — add photos, notes, and the people who made it special.
      </p>
    </div>

    <button
      onClick={onToggleComposer}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
    >
      <Camera className="w-4 h-4" />
      Share a Moment
    </button>

    {/* Post composer */}
    <AnimatePresence>
      {showComposer && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
          <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">No separate posting — everything stays inside the trip</p>
              <button onClick={onReset} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>

            {/* Photo */}
            {postPhotoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={postPhotoPreview} alt="" className="w-full h-40 object-cover" />
                <button onClick={onClearPhoto} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-foreground/60 flex items-center justify-center">
                  <X className="w-3 h-3 text-background" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="w-full h-28 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/30 transition-colors">
                <Camera className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Add a photo</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e: any) => onPhotoSelect(e.target.files)} />

            {/* Caption */}
            <textarea
              value={postCaption}
              onChange={(e: any) => setPostCaption(e.target.value.slice(0, 300))}
              placeholder="What happened? Share the moment…"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-primary/40"
            />

            {/* Link experience */}
            {journey.experiences.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5">📍 Attach to experience</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setPostExpId(null)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${!postExpId ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                    None
                  </button>
                  {journey.experiences.slice(0, 6).map((exp: any) => (
                    <button key={exp.id} onClick={() => setPostExpId(postExpId === exp.id ? null : exp.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all truncate max-w-[140px] ${postExpId === exp.id ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                      {exp.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tag friends */}
            <div>
              <button onClick={() => setShowTagPicker(!showTagPicker)} className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Tag className="w-3 h-3" />
                {postTaggedIds.length > 0 ? `${postTaggedIds.length} friend${postTaggedIds.length > 1 ? "s" : ""} tagged` : "Who was there matters 🤍 — tag friends"}
              </button>
              {showTagPicker && (
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {connections.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground py-2">No connections yet</p>
                  ) : connections.map((c: any) => {
                    const isTagged = postTaggedIds.includes(c.user_id);
                    return (
                      <button key={c.user_id} onClick={() => toggleTag(c.user_id)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${isTagged ? "bg-primary/10" : "hover:bg-muted/60"}`}>
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : <Users className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        <span className="text-xs text-foreground truncate flex-1">{c.display_name || "Traveler"}</span>
                        {isTagged && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-medium text-muted-foreground">Visibility:</p>
              {[
                { id: "private", icon: <Lock className="w-3 h-3" />, label: "Private" },
                { id: "public", icon: <Globe className="w-3 h-3" />, label: "Public" },
              ].map(v => (
                <button key={v.id} onClick={() => setPostVisibility(v.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${postVisibility === v.id ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            <button onClick={onPost} disabled={posting || (!postCaption.trim() && !postPhotoPreview)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Post to Trip</>}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Posts feed */}
    {posts.length === 0 ? (
      <div className="text-center py-8">
        <Camera className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No moments yet</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Share your first moment from this trip</p>
      </div>
    ) : (
      <div className="space-y-3">
        {posts.map((post: TripPost, i: number) => {
          const linkedExp = journey.experiences.find((e: any) => e.id === post.experience_id);
          const taggedNames = connections
            .filter((c: any) => post.tagged_user_ids?.includes(c.user_id))
            .map((c: any) => c.display_name || "Traveler");

          return (
            <motion.div key={post.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="rounded-2xl bg-card border border-border overflow-hidden">
              {post.photo_url && <img src={post.photo_url} alt="" className="w-full h-44 object-cover" />}
              <div className="p-3 space-y-1.5">
                {post.caption && <p className="text-sm text-foreground">{post.caption}</p>}
                {linkedExp && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" /> {linkedExp.title}
                  </p>
                )}
                {taggedNames.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">🤍 with {taggedNames.join(", ")}</p>
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(post.created_at).toLocaleDateString()}
                    {post.visibility === "private" && <> · <Lock className="w-2.5 h-2.5 inline" /></>}
                  </span>
                  <button onClick={() => onDeletePost(post.id)} className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
                    <Trash2 className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    )}
  </>
);

/* ========== SHARE TAB ========== */
const ShareTab = ({
  journey, journeyId, posts, onShare, members,
}: {
  journey: any;
  journeyId: string;
  posts: TripPost[];
  onShare: (item: ShareableItem) => void;
  members: any[];
}) => {
  const publicPosts = posts.filter(p => p.visibility === "public");
  const { user } = useAuth();
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  const handlePrivacyChange = async (privacy: string) => {
    setUpdatingPrivacy(true);
    try {
      await supabase.from("journeys" as any).update({ privacy } as any).eq("id", journeyId);
      toast.success(`Trip visibility set to ${privacy}`);
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  return (
    <>
      {/* Section header */}
      <div className="rounded-xl bg-muted/30 border border-border p-3 space-y-1">
        <p className="text-xs font-medium text-foreground/80">Share your trip to your profile 🌍</p>
        <p className="text-[10px] text-muted-foreground">
          Control who sees this trip on your profile — friends, followers, or everyone.
        </p>
        <p className="text-[10px] text-muted-foreground/60 pt-1 border-t border-border/50">
          🔒 Nothing is shared unless you choose to.
        </p>
      </div>

      {/* Privacy selector */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <p className="text-xs font-medium text-foreground/80">Trip Visibility on Profile</p>
        <div className="space-y-2">
          {[
            { id: "private", icon: <Lock className="w-3.5 h-3.5" />, label: "Private", desc: "Only you can see this trip" },
            { id: "friends", icon: <Users className="w-3.5 h-3.5" />, label: "Friends", desc: "Visible to your connections" },
            { id: "public", icon: <Globe className="w-3.5 h-3.5" />, label: "Public", desc: "Visible to everyone on your profile" },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => handlePrivacyChange(opt.id)}
              disabled={updatingPrivacy}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                journey.privacy === opt.id 
                  ? "border-primary/30 bg-primary/5" 
                  : "border-border hover:border-primary/10"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${journey.privacy === opt.id ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {opt.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{opt.label}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </div>
              {journey.privacy === opt.id && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Share to network button */}
      <button
        onClick={() => onShare({
          type: "journey",
          id: journeyId,
          title: journey.title,
          emoji: journey.emoji || "✈️",
          description: journey.description,
          destinations: journey.destinations || [],
          experienceCount: journey.experiences.length,
          coverImage: journey.cover_image_url,
        })}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share Trip with Friends
      </button>

      {/* Trip summary */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <p className="text-xs font-medium text-foreground/80">Trip Summary 🤍</p>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-muted/30">
            <p className="text-lg font-semibold text-foreground">{journey.experiences.length}</p>
            <p className="text-[9px] text-muted-foreground">Experiences</p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/30">
            <p className="text-lg font-semibold text-foreground">{posts.length}</p>
            <p className="text-[9px] text-muted-foreground">Moments</p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/30">
            <p className="text-lg font-semibold text-foreground">{members.filter((m: any) => m.status === "accepted").length + 1}</p>
            <p className="text-[9px] text-muted-foreground">People</p>
          </div>
          <div className="p-2.5 rounded-xl bg-muted/30">
            <p className="text-lg font-semibold text-foreground">{publicPosts.length}</p>
            <p className="text-[9px] text-muted-foreground">Public</p>
          </div>
        </div>

        {/* Visibility info */}
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3 flex-shrink-0" />
            <span>Activity → private by default</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Users className="w-3 h-3 flex-shrink-0" />
            <span>Trip → collaborative with your group</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Heart className="w-3 h-3 flex-shrink-0" />
            <span>Sharing → intentional, never automatic</span>
          </div>
        </div>
      </div>

      {/* Public moments preview */}
      {publicPosts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">🌍 Public moments</p>
          {publicPosts.map(post => (
            <div key={post.id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
              {post.photo_url && <img src={post.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground truncate">{post.caption || "Photo moment"}</p>
                <p className="text-[9px] text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
              </div>
              <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default Journeys;
