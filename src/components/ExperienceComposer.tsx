import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Camera, Link2, Globe, Users, Lock, Eye, Loader2, Plus } from "lucide-react";
import { useAddExperience } from "@/hooks/useExperiences";
import { useAddAttachment } from "@/hooks/useExperiences";
import { toast } from "sonner";

const categories = [
  { id: "hike", label: "🥾 Hike", },
  { id: "monument", label: "🏛️ Monument" },
  { id: "food", label: "🍽️ Food" },
  { id: "beach", label: "🏖️ Beach" },
  { id: "museum", label: "🎨 Museum" },
  { id: "city_walk", label: "🚶 City Walk" },
  { id: "road_trip", label: "🚗 Road Trip" },
  { id: "hidden_gem", label: "💎 Hidden Gem" },
  { id: "hotel", label: "🏨 Hotel" },
  { id: "general", label: "📍 Other" },
];

const visibilityOptions = [
  { id: "public", label: "Public", icon: <Globe className="w-3.5 h-3.5" />, desc: "Anyone can see" },
  { id: "followers", label: "Followers", icon: <Users className="w-3.5 h-3.5" />, desc: "Only followers" },
  { id: "close_friends", label: "Close Friends", icon: <Eye className="w-3.5 h-3.5" />, desc: "Close friends only" },
  { id: "private", label: "Only Me", icon: <Lock className="w-3.5 h-3.5" />, desc: "Private" },
];

interface ExperienceComposerProps {
  open: boolean;
  onClose: () => void;
  defaultCity?: string;
  defaultCountry?: string;
}

const ExperienceComposer = ({ open, onClose, defaultCity, defaultCountry }: ExperienceComposerProps) => {
  const addExperience = useAddExperience();
  const addAttachment = useAddAttachment();

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [city, setCity] = useState(defaultCity || "");
  const [country, setCountry] = useState(defaultCountry || "");
  const [category, setCategory] = useState("general");
  const [visibility, setVisibility] = useState("public");
  const [tags, setTags] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachments, setAttachments] = useState<{ url: string; title: string; type: string }[]>([]);
  const [experienceDate, setExperienceDate] = useState("");

  const resetForm = () => {
    setTitle("");
    setCaption("");
    setCity("");
    setCountry("");
    setCategory("general");
    setVisibility("public");
    setTags("");
    setAttachmentUrl("");
    setAttachmentTitle("");
    setAttachments([]);
    setExperienceDate("");
  };

  const handleAddAttachment = () => {
    if (!attachmentUrl.trim()) return;
    const type = attachmentUrl.includes("strava.com") ? "strava"
      : attachmentUrl.includes("maps.google") || attachmentUrl.includes("goo.gl") ? "google_maps"
      : "link";
    setAttachments([...attachments, { url: attachmentUrl, title: attachmentTitle || attachmentUrl, type }]);
    setAttachmentUrl("");
    setAttachmentTitle("");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Add a title for your experience");
      return;
    }

    try {
      const tagArray = tags.split(",").map((t) => t.trim()).filter(Boolean);
      const exp = await addExperience.mutateAsync({
        title: title.trim(),
        caption: caption.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        category,
        visibility,
        tags: tagArray,
        experience_date: experienceDate || null,
        lat: null,
        lng: null,
      });

      // Add attachments
      for (const att of attachments) {
        await addAttachment.mutateAsync({
          experience_id: exp.id,
          attachment_type: att.type,
          url: att.url,
          title: att.title,
          thumbnail_url: null,
        });
      }

      toast.success("Experience shared!");
      resetForm();
      onClose();
    } catch {
      toast.error("Failed to share experience");
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-display text-lg font-semibold text-foreground">Share Experience</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Title */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What did you experience?"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
            />

            {/* Caption */}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tell the story..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 resize-none"
            />

            {/* Location */}
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                />
              </div>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
              />
            </div>

            {/* Date */}
            <input
              type="date"
              value={experienceDate}
              onChange={(e) => setExperienceDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary/40"
            />

            {/* Category */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Type</p>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      category === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
            />

            {/* Attachments */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Attachments (Strava, Google Maps, links)
              </p>
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 mb-1.5 text-xs">
                  <Link2 className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground truncate flex-1">{att.title}</span>
                  <span className="text-muted-foreground capitalize">{att.type}</span>
                  <button onClick={() => setAttachments(attachments.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="Paste a URL..."
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40"
                />
                <button
                  onClick={handleAddAttachment}
                  disabled={!attachmentUrl.trim()}
                  className="px-3 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Who can see this?</p>
              <div className="grid grid-cols-2 gap-1.5">
                {visibilityOptions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setVisibility(v.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium transition-all ${
                      visibility === v.id ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
                    }`}
                  >
                    {v.icon}
                    <div className="text-left">
                      <p>{v.label}</p>
                      <p className="text-[9px] opacity-70">{v.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border">
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || addExperience.isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {addExperience.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Share Experience
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExperienceComposer;
