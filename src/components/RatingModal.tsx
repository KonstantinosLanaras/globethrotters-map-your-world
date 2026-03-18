import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useSubmitRating, useMyRating } from "@/hooks/useRatings";
import { toast } from "sonner";

const POSITIVE_TAGS = [
  "Great food", "Beautiful", "Worth visiting", "Good atmosphere",
  "Easy to access", "Friendly locals", "Instagrammable", "Peaceful",
];
const NEGATIVE_TAGS = [
  "Overcrowded", "Expensive", "Unsafe feeling", "Tourist trap",
  "Poor service", "Hard to reach", "Overrated", "Noisy",
];

const DIMENSIONS = [
  { key: "safety_rating", label: "Safety" },
  { key: "value_rating", label: "Value for money" },
  { key: "accessibility_rating", label: "Accessibility" },
  { key: "crowd_rating", label: "Crowd level" },
  { key: "family_rating", label: "Family friendliness" },
] as const;

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  placeId: string;
  placeName: string;
}

const StarInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              s <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const MiniStarInput = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="p-0.5"
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              s <= (hover || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/25"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const RatingModal = ({ open, onClose, placeId, placeName }: RatingModalProps) => {
  const submitRating = useSubmitRating();
  const { data: existingRating } = useMyRating(placeId);

  const [overall, setOverall] = useState(existingRating?.overall_rating || 0);
  const [selectedTags, setSelectedTags] = useState<string[]>(existingRating?.tags || []);
  const [showDimensions, setShowDimensions] = useState(false);
  const [dimensions, setDimensions] = useState<Record<string, number>>({});
  const [comment, setComment] = useState(existingRating?.comment || "");

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 5) {
        toast.info("Max 5 tags");
        return prev;
      }
      return [...prev, tag];
    });
  };

  const handleSubmit = async () => {
    if (overall === 0) {
      toast.error("Please select a star rating");
      return;
    }
    try {
      await submitRating.mutateAsync({
        place_id: placeId,
        overall_rating: overall,
        tags: selectedTags,
        safety_rating: dimensions.safety_rating || null,
        value_rating: dimensions.value_rating || null,
        accessibility_rating: dimensions.accessibility_rating || null,
        crowd_rating: dimensions.crowd_rating || null,
        family_rating: dimensions.family_rating || null,
        comment: comment.trim(),
      });
      toast.success("Rating submitted! ⭐");
      onClose();
    } catch {
      toast.error("Failed to submit rating");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-[380px] max-h-[85vh] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold text-foreground">How was your experience?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{placeName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[calc(85vh-130px)]">
          {/* Step 1: Overall Rating */}
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground mb-2">Overall Rating</p>
            <div className="flex justify-center">
              <StarInput value={overall} onChange={setOverall} />
            </div>
            {overall > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {overall === 1 && "Poor"}
                {overall === 2 && "Fair"}
                {overall === 3 && "Good"}
                {overall === 4 && "Great"}
                {overall === 5 && "Amazing!"}
              </p>
            )}
          </div>

          {/* Step 2: Quick Tags */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Quick tags <span className="text-muted-foreground/60">({selectedTags.length}/5)</span>
            </p>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {POSITIVE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      selectedTags.includes(tag)
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 ring-1 ring-emerald-300 dark:ring-emerald-700"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {NEGATIVE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      selectedTags.includes(tag)
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 ring-1 ring-red-300 dark:ring-red-700"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 3: Dimensions (collapsible) */}
          <div>
            <button
              onClick={() => setShowDimensions(!showDimensions)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {showDimensions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Detailed ratings
              <span className="text-muted-foreground/50 text-[10px]">(optional)</span>
            </button>
            <AnimatePresence>
              {showDimensions && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-3">
                    {DIMENSIONS.map((dim) => (
                      <div key={dim.key} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{dim.label}</span>
                        <MiniStarInput
                          value={dimensions[dim.key] || 0}
                          onChange={(v) => setDimensions((p) => ({ ...p, [dim.key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Step 4: Comment */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Comment <span className="text-muted-foreground/50">(optional)</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Share a quick thought…"
              className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <p className="text-[10px] text-muted-foreground/50 text-right mt-0.5">{comment.length}/200</p>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-muted-foreground/50 text-center">
            Ratings are based on community feedback and personal experiences.
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={overall === 0 || submitRating.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitRating.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RatingModal;
