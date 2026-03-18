import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, ChevronDown, ChevronUp, Loader2, Camera, Upload } from "lucide-react";
import { useSubmitRating, useMyRating } from "@/hooks/useRatings";
import { toast } from "sonner";

// --- Category config ---
const CATEGORIES = [
  { id: "general", label: "General", emoji: "📍" },
  { id: "food", label: "Food", emoji: "🍽️" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "hiking", label: "Hiking", emoji: "🥾" },
  { id: "nightlife", label: "Nightlife", emoji: "🌙" },
];

// --- Adaptive dimension configs ---
const DIMENSION_CONFIGS: Record<string, { key: string; label: string }[]> = {
  general: [
    { key: "safety_rating", label: "Safety" },
    { key: "value_rating", label: "Value for money" },
    { key: "accessibility_rating", label: "Ease of transport" },
    { key: "crowd_rating", label: "Crowd level" },
    { key: "family_rating", label: "Family-friendly" },
  ],
  food: [
    { key: "food_quality_rating", label: "Food quality" },
    { key: "value_rating", label: "Value for money" },
    { key: "atmosphere_rating", label: "Atmosphere" },
    { key: "authenticity_rating", label: "Authentic vs touristy" },
  ],
  culture: [
    { key: "value_rating", label: "Value for money" },
    { key: "accessibility_rating", label: "Accessibility" },
    { key: "crowd_rating", label: "Crowd level" },
    { key: "family_rating", label: "Family-friendly" },
  ],
  nature: [
    { key: "scenery_rating", label: "Scenery" },
    { key: "difficulty_rating", label: "Difficulty" },
    { key: "crowd_rating", label: "Crowd level" },
    { key: "worth_it_rating", label: "Worth it" },
  ],
  hiking: [
    { key: "scenery_rating", label: "Scenery" },
    { key: "difficulty_rating", label: "Difficulty" },
    { key: "crowd_rating", label: "Crowd level" },
    { key: "worth_it_rating", label: "Worth it" },
  ],
  nightlife: [
    { key: "atmosphere_rating", label: "Atmosphere" },
    { key: "value_rating", label: "Value for money" },
    { key: "safety_rating", label: "Safety" },
    { key: "crowd_rating", label: "Crowd level" },
  ],
};

// --- Tags per category ---
const TAGS_BY_CATEGORY: Record<string, { positive: string[]; negative: string[] }> = {
  general: {
    positive: ["Great food", "Beautiful", "Worth visiting", "Good atmosphere", "Easy to access", "Friendly locals", "Instagrammable", "Peaceful"],
    negative: ["Overcrowded", "Expensive", "Unsafe feeling", "Tourist trap", "Poor service", "Hard to reach", "Overrated", "Noisy"],
  },
  food: {
    positive: ["Great food", "Authentic", "Good portions", "Friendly staff", "Nice ambiance", "Hidden gem", "Local favorite"],
    negative: ["Overpriced", "Tourist trap", "Slow service", "Disappointing", "Crowded", "Noisy"],
  },
  culture: {
    positive: ["Worth visiting", "Well maintained", "Great history", "Beautiful architecture", "Good guides", "Peaceful"],
    negative: ["Overcrowded", "Overrated", "Expensive entry", "Poorly maintained", "Tourist trap"],
  },
  nature: {
    positive: ["Beautiful", "Peaceful", "Great views", "Well marked trails", "Hidden gem", "Worth the effort"],
    negative: ["Overcrowded", "Littered", "Hard to reach", "Overrated", "Dangerous sections"],
  },
  hiking: {
    positive: ["Amazing views", "Well marked", "Worth the effort", "Great workout", "Peaceful", "Hidden gem"],
    negative: ["Overcrowded", "Poorly marked", "Dangerous", "Overrated", "Too easy", "Too hard"],
  },
  nightlife: {
    positive: ["Great atmosphere", "Good music", "Friendly crowd", "Good cocktails", "Fun vibe", "Unique"],
    negative: ["Overpriced", "Too crowded", "Bad music", "Unsafe area", "Tourist trap", "Rude staff"],
  },
};

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  placeId: string;
  placeName: string;
  defaultCategory?: string;
}

const StarInput = ({ value, onChange, size = "lg" }: { value: number; onChange: (v: number) => void; size?: "lg" | "sm" }) => {
  const [hover, setHover] = useState(0);
  const starSize = size === "lg" ? "w-7 h-7" : "w-4 h-4";
  const gap = size === "lg" ? "gap-1" : "gap-0.5";
  return (
    <div className={`flex items-center ${gap}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className={size === "lg" ? "p-0.5 transition-transform hover:scale-110" : "p-0.5"}
        >
          <Star
            className={`${starSize} transition-colors ${
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

const RatingModal = ({ open, onClose, placeId, placeName, defaultCategory }: RatingModalProps) => {
  const submitRating = useSubmitRating();
  const { data: existingRating } = useMyRating(placeId);

  const [step, setStep] = useState(1); // 1: rating, 2: category, 3: tags, 4: dimensions, 5: note
  const [overall, setOverall] = useState(0);
  const [category, setCategory] = useState(defaultCategory || "general");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dimensions, setDimensions] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");

  // Load existing rating data
  useEffect(() => {
    if (existingRating) {
      setOverall(existingRating.overall_rating || 0);
      setSelectedTags(existingRating.tags || []);
      setComment(existingRating.comment || "");
      // Load category from existing if available
      if ((existingRating as any).category) {
        setCategory((existingRating as any).category);
      }
    }
  }, [existingRating]);

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

  const currentDimensions = DIMENSION_CONFIGS[category] || DIMENSION_CONFIGS.general;
  const currentTags = TAGS_BY_CATEGORY[category] || TAGS_BY_CATEGORY.general;
  const totalSteps = 5;

  const canAdvance = () => {
    if (step === 1) return overall > 0;
    if (step === 2) return true; // category has default
    return true;
  };

  const handleNext = () => {
    if (step < totalSteps && canAdvance()) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
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
        category,
        tags: selectedTags,
        safety_rating: dimensions.safety_rating || null,
        value_rating: dimensions.value_rating || null,
        accessibility_rating: dimensions.accessibility_rating || null,
        crowd_rating: dimensions.crowd_rating || null,
        family_rating: dimensions.family_rating || null,
        food_quality_rating: dimensions.food_quality_rating || null,
        atmosphere_rating: dimensions.atmosphere_rating || null,
        authenticity_rating: dimensions.authenticity_rating || null,
        scenery_rating: dimensions.scenery_rating || null,
        difficulty_rating: dimensions.difficulty_rating || null,
        worth_it_rating: dimensions.worth_it_rating || null,
        comment: comment.trim(),
      });
      toast.success("Review submitted! Your contribution will gain value as travelers engage with it.");
      onClose();
    } catch (err: any) {
      if (err?.message?.includes("only review places you have visited")) {
        toast.error("You can only review places you've visited");
      } else {
        toast.error("Failed to submit review");
      }
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
        className="relative z-10 w-[400px] max-h-[85vh] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Share your experience</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{placeName}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i + 1 === step ? "bg-primary" : i + 1 < step ? "bg-primary/40" : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 overflow-y-auto max-h-[calc(85vh-130px)]">
          <AnimatePresence mode="wait">
            {/* Step 1: Overall Rating */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                <div className="text-center py-4">
                  <p className="text-sm font-medium text-foreground mb-1">How was it?</p>
                  <p className="text-xs text-muted-foreground mb-4">Rate your overall experience</p>
                  <div className="flex justify-center">
                    <StarInput value={overall} onChange={setOverall} />
                  </div>
                  {overall > 0 && (
                    <p className="text-sm font-medium text-foreground mt-3">
                      {overall === 1 && "😕 Poor"}
                      {overall === 2 && "😐 Fair"}
                      {overall === 3 && "🙂 Good"}
                      {overall === 4 && "😄 Great"}
                      {overall === 5 && "🤩 Amazing!"}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Category */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                <div className="py-2">
                  <p className="text-sm font-medium text-foreground mb-1">What type of experience?</p>
                  <p className="text-xs text-muted-foreground mb-3">This helps us show relevant questions</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                          category === cat.id
                            ? "bg-primary/10 border-2 border-primary/30 ring-1 ring-primary/20"
                            : "bg-muted/30 border-2 border-transparent hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="text-[11px] font-medium text-foreground">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Tags */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                <div className="py-2">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Quick tags <span className="text-muted-foreground text-xs">({selectedTags.length}/5)</span>
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">Select what stood out</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Positives</p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentTags.positive.map((tag) => (
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
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Areas for improvement</p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentTags.negative.map((tag) => (
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
                </div>
              </motion.div>
            )}

            {/* Step 4: Adaptive Dimensions */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                <div className="py-2">
                  <p className="text-sm font-medium text-foreground mb-1">Rate specific aspects</p>
                  <p className="text-xs text-muted-foreground mb-3">Optional — helps other travelers</p>
                  <div className="space-y-3">
                    {currentDimensions.map((dim) => (
                      <div key={dim.key} className="flex items-center justify-between">
                        <span className="text-xs text-foreground">{dim.label}</span>
                        <StarInput
                          value={dimensions[dim.key] || 0}
                          onChange={(v) => setDimensions((p) => ({ ...p, [dim.key]: v }))}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Note */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                <div className="py-2">
                  <p className="text-sm font-medium text-foreground mb-1">
                    Quick note <span className="text-xs text-muted-foreground">(optional)</span>
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">Share a tip or thought for other travelers</p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 200))}
                    placeholder="Best time to visit, what to order, tips..."
                    className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <p className="text-[10px] text-muted-foreground/50 text-right mt-0.5">{comment.length}/200</p>
                  
                  <div className="mt-3 p-3 rounded-xl bg-muted/20 border border-border/50">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      💡 Your review gains value when other travelers find it helpful, save it, or agree with your insights. 
                      Quality contributions build your trusted contributor status over time.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              Back
            </button>
          )}
          <div className="flex-1" />
          {step < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canAdvance()}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={overall === 0 || submitRating.isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitRating.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                "Submit Review"
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default RatingModal;
