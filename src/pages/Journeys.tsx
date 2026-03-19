import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import {
  Plus, MapPin, Star, Calendar, ChevronRight, Trash2, X, Check,
  Image, Plane, Loader2, Share2
} from "lucide-react";
import { useJourneys, useAddJourney, useDeleteJourney, useJourneyWithExperiences, useAddExperienceToJourney, useRemoveExperienceFromJourney, Journey } from "@/hooks/useJourneys";
import { useExperiencesWithPhotos, ExperienceWithPhotos } from "@/hooks/useExperiences";
import { useFavoriteJourneyIds, useToggleFavoriteJourney } from "@/hooks/useFavorites";
import { toast } from "sonner";
import ShareModal, { ShareableItem } from "@/components/ShareModal";

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
      toast.success("Journey created!");
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
      setNewEmoji("✈️");
      setNewStartDate("");
      setNewEndDate("");
    } catch {
      toast.error("Failed to create journey");
    }
  };

  const handleDelete = (id: string) => {
    deleteJourney.mutate(id, {
      onSuccess: () => { toast.success("Journey deleted"); setSelectedJourney(null); },
      onError: () => toast.error("Failed to delete"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-[80px] px-4 pb-12 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">Journeys</h1>
            <p className="text-sm text-muted-foreground">Group experiences into trips</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        {/* Create journey form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-foreground">New Journey</h3>
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
                  placeholder="Description (optional)"
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
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || addJourney.isPending}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90"
                >
                  {addJourney.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Journey"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Journeys list or detail */}
        {selectedJourney ? (
          <JourneyDetail
            journeyId={selectedJourney}
            allExperiences={experiences}
            onBack={() => setSelectedJourney(null)}
            onDelete={handleDelete}
            onShare={setShareItem}
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
                <h3 className="font-display text-lg font-medium text-foreground mb-2">No journeys yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Group your experiences into trips</p>
                <button onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                  <Plus className="w-4 h-4" /> Create Journey
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
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
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

/* Journey detail with timeline */
const JourneyDetail = ({
  journeyId, allExperiences, onBack, onDelete, onShare,
}: {
  journeyId: string;
  allExperiences: ExperienceWithPhotos[];
  onBack: () => void;
  onDelete: (id: string) => void;
  onShare: (item: ShareableItem) => void;
}) => {
  const { data: journey, isLoading } = useJourneyWithExperiences(journeyId);
  const addExpToJourney = useAddExperienceToJourney();
  const removeExpFromJourney = useRemoveExperienceFromJourney();
  const [showAddExp, setShowAddExp] = useState(false);

  if (isLoading || !journey) {
    return <div className="text-center py-12"><div className="w-8 h-8 border-2 border-muted-foreground/20 border-t-primary rounded-full animate-spin mx-auto" /></div>;
  }

  const linkedIds = new Set(journey.experiences.map(e => e.id));
  const available = allExperiences.filter(e => !linkedIds.has(e.id));

  const handleAdd = (expId: string) => {
    addExpToJourney.mutate({ journeyId, experienceId: expId }, {
      onSuccess: () => toast.success("Experience added to journey"),
      onError: () => toast.error("Failed to add"),
    });
  };

  const handleRemove = (expId: string) => {
    removeExpFromJourney.mutate({ journeyId, experienceId: expId }, {
      onSuccess: () => toast.success("Removed from journey"),
      onError: () => toast.error("Failed to remove"),
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          {journey.privacy !== "private" && (
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
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
            >
              <Share2 className="w-3 h-3" /> Share
            </button>
          )}
          <button
            onClick={() => onDelete(journeyId)}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{journey.emoji}</span>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">{journey.title}</h2>
            {journey.description && <p className="text-sm text-muted-foreground">{journey.description}</p>}
          </div>
        </div>
        {(journey.start_date || journey.end_date) && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {journey.start_date ? new Date(journey.start_date).toLocaleDateString() : ""}
            {journey.start_date && journey.end_date ? " – " : ""}
            {journey.end_date ? new Date(journey.end_date).toLocaleDateString() : ""}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">{journey.experiences.length} experience{journey.experiences.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Add experience button */}
      <button
        onClick={() => setShowAddExp(!showAddExp)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Experience
      </button>

      {/* Add experience picker */}
      <AnimatePresence>
        {showAddExp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-2xl bg-muted/30 border border-border space-y-2 max-h-[300px] overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground px-1">Select experiences to add:</p>
              {available.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">All experiences already added</p>
              ) : (
                available.map(exp => (
                  <button
                    key={exp.id}
                    onClick={() => handleAdd(exp.id)}
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
                      <p className="text-[10px] text-muted-foreground">
                        {exp.city}{exp.country ? `, ${exp.country}` : ""} · {exp.category}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline */}
      {journey.experiences.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No experiences in this journey yet</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

          {journey.experiences.map((exp, i) => (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative pl-12 pb-6"
            >
              {/* Timeline dot */}
              <div className="absolute left-[14px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />

              <div className="rounded-2xl bg-card border border-border overflow-hidden">
                {/* Photo */}
                {exp.photos.length > 0 && (
                  <img src={exp.photos[0]} alt="" className="w-full h-32 object-cover" />
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{exp.title}</h4>
                      {exp.city && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" /> {exp.city}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {exp.rating > 0 && (
                        <span className="flex items-center gap-0.5">
                          {[...Array(exp.rating)].map((_, i) => (
                            <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          ))}
                        </span>
                      )}
                      <button
                        onClick={() => handleRemove(exp.id)}
                        className="ml-1 w-5 h-5 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                  {exp.caption && <p className="text-xs text-foreground/70 mt-1 line-clamp-2">{exp.caption}</p>}
                  {exp.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {exp.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 rounded-full bg-primary/10 text-[9px] font-medium text-primary">{tag}</span>
                      ))}
                    </div>
                  )}
                  {exp.experience_date && (
                    <p className="text-[9px] text-muted-foreground mt-1.5">{new Date(exp.experience_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Journeys;
