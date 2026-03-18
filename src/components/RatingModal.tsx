import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Loader2, Check } from "lucide-react";
import { useSubmitRating, useMyRating } from "@/hooks/useRatings";
import { toast } from "sonner";

interface RatingModalProps {
  open: boolean;
  onClose: () => void;
  placeId: string;
  placeName: string;
  defaultCategory?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CROWD_LEVELS = [
  { id: "quiet", label: "Quiet", emoji: "🧘" },
  { id: "moderate", label: "Moderate", emoji: "🚶" },
  { id: "busy", label: "Busy", emoji: "👥" },
  { id: "very_crowded", label: "Very crowded", emoji: "🏟️" },
];

const INTEREST_AREAS = [
  { id: "food", label: "Food", emoji: "🍽️" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "hiking", label: "Hiking", emoji: "🥾" },
  { id: "nightlife", label: "Nightlife", emoji: "🌙" },
];

const CITY_TAGS = {
  positive: ["Great for families", "Very walkable", "Great local food", "Easy public transport", "Friendly locals", "Beautiful", "Hidden gem", "Safe", "Good weather"],
  negative: ["Expensive", "Overcrowded", "Tourist trap", "Hard to navigate", "Language barrier", "Unsafe feeling", "Overrated", "Noisy"],
};

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

const TOTAL_STEPS = 5;

const RatingModal = ({ open, onClose, placeId, placeName }: RatingModalProps) => {
  const submitRating = useSubmitRating();
  const { data: existingRating } = useMyRating(placeId);

  const [step, setStep] = useState(1);
  const [overall, setOverall] = useState(0);

  // Core dimensions
  const [coreDims, setCoreDims] = useState<Record<string, number>>({});
  const [crowdLevel, setCrowdLevel] = useState<string | null>(null);
  const [bestMonths, setBestMonths] = useState<string[]>([]);

  // Interest areas
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestScores, setInterestScores] = useState<Record<string, number>>({});

  // Tags & note
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  // Load existing
  useEffect(() => {
    if (existingRating) {
      setOverall(existingRating.overall_rating || 0);
      setSelectedTags(existingRating.tags || []);
      setComment(existingRating.comment || "");
      setCrowdLevel((existingRating as any).crowd_level || null);
      setBestMonths((existingRating as any).best_months || []);
      setSelectedInterests((existingRating as any).selected_interests || []);

      const dims: Record<string, number> = {};
      if (existingRating.safety_rating) dims.safety_rating = existingRating.safety_rating;
      if (existingRating.family_rating) dims.family_rating = existingRating.family_rating;
      if ((existingRating as any).english_rating) dims.english_rating = (existingRating as any).english_rating;
      if ((existingRating as any).transport_rating) dims.transport_rating = (existingRating as any).transport_rating;
      if (existingRating.value_rating) dims.value_rating = existingRating.value_rating;
      setCoreDims(dims);

      const scores: Record<string, number> = {};
      if ((existingRating as any).food_score) scores.food = (existingRating as any).food_score;
      if ((existingRating as any).culture_score) scores.culture = (existingRating as any).culture_score;
      if ((existingRating as any).nature_score) scores.nature = (existingRating as any).nature_score;
      if ((existingRating as any).hiking_score) scores.hiking = (existingRating as any).hiking_score;
      if ((existingRating as any).nightlife_score) scores.nightlife = (existingRating as any).nightlife_score;
      setInterestScores(scores);
    }
  }, [existingRating]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 5) { toast.info("Max 5 tags"); return prev; }
      return [...prev, tag];
    });
  };

  const toggleMonth = (month: string) => {
    setBestMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month]
    );
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((i) => i !== id);
        setInterestScores((s) => { const n = { ...s }; delete n[id]; return n; });
        return next;
      }
      return [...prev, id];
    });
  };

  const canAdvance = () => {
    if (step === 1) return overall > 0;
    return true;
  };

  const handleNext = () => { if (step < TOTAL_STEPS && canAdvance()) setStep(step + 1); };
  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const handleSubmit = async () => {
    if (overall === 0) { toast.error("Please select a star rating"); return; }
    try {
      await submitRating.mutateAsync({
        place_id: placeId,
        overall_rating: overall,
        category: "general",
        tags: selectedTags,
        safety_rating: coreDims.safety_rating || null,
        value_rating: coreDims.value_rating || null,
        family_rating: coreDims.family_rating || null,
        english_rating: coreDims.english_rating || null,
        transport_rating: coreDims.transport_rating || null,
        accessibility_rating: coreDims.transport_rating || null,
        crowd_rating: null,
        crowd_level: crowdLevel,
        best_months: bestMonths,
        selected_interests: selectedInterests,
        food_score: interestScores.food || null,
        culture_score: interestScores.culture || null,
        nature_score: interestScores.nature || null,
        hiking_score: interestScores.hiking || null,
        nightlife_score: interestScores.nightlife || null,
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

  const CORE_DIMENSIONS = [
    { key: "safety_rating", label: "Safety", emoji: "🛡️" },
    { key: "family_rating", label: "Family-friendliness", emoji: "👨‍👩‍👧" },
    { key: "english_rating", label: "English-friendliness", emoji: "🗣️" },
    { key: "transport_rating", label: "Ease of transport", emoji: "🚇" },
    { key: "value_rating", label: "Value for money", emoji: "💰" },
  ];

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative z-10 w-[420px] max-h-[85vh] bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Rate this city</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{placeName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i + 1 === step ? "bg-primary" : i + 1 < step ? "bg-primary/40" : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 overflow-y-auto max-h-[calc(85vh-130px)]">
          <AnimatePresence mode="wait">
            {/* Step 1: Overall Rating */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                <div className="text-center py-4">
                  <p className="text-sm font-medium text-foreground mb-1">How was {placeName}?</p>
                  <p className="text-xs text-muted-foreground mb-4">Rate your overall experience</p>
                  <div className="flex justify-center">
                    <StarInput value={overall} onChange={setOverall} />
                  </div>
                  {overall > 0 && (
                    <p className="text-sm font-medium text-foreground mt-3">
                      {overall === 1 && "😕 Poor"}{overall === 2 && "😐 Fair"}{overall === 3 && "🙂 Good"}{overall === 4 && "😄 Great"}{overall === 5 && "🤩 Amazing!"}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Core City Dimensions */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                <div className="py-1">
                  <p className="text-sm font-medium text-foreground mb-0.5">City essentials</p>
                  <p className="text-xs text-muted-foreground mb-4">Rate the core aspects — skip any you're unsure about</p>

                  <div className="space-y-3 mb-5">
                    {CORE_DIMENSIONS.map((dim) => (
                      <div key={dim.key} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{dim.emoji}</span>
                          <span className="text-xs font-medium text-foreground">{dim.label}</span>
                        </div>
                        <StarInput
                          value={coreDims[dim.key] || 0}
                          onChange={(v) => setCoreDims((p) => ({ ...p, [dim.key]: v }))}
                          size="sm"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Crowd level */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-foreground mb-2">🏙️ Crowd level</p>
                    <div className="flex gap-1.5">
                      {CROWD_LEVELS.map((cl) => (
                        <button
                          key={cl.id}
                          onClick={() => setCrowdLevel(crowdLevel === cl.id ? null : cl.id)}
                          className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-center transition-all ${
                            crowdLevel === cl.id
                              ? "bg-primary/10 border-2 border-primary/30"
                              : "bg-muted/30 border-2 border-transparent hover:bg-muted/50"
                          }`}
                        >
                          <span className="text-sm">{cl.emoji}</span>
                          <span className="text-[10px] font-medium text-foreground">{cl.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Best months */}
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">📅 Best time to visit</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {MONTHS.map((m) => (
                        <button
                          key={m}
                          onClick={() => toggleMonth(m)}
                          className={`py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                            bestMonths.includes(m)
                              ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                              : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Interest Areas (multi-select + score) */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                <div className="py-1">
                  <p className="text-sm font-medium text-foreground mb-0.5">What is this city good for?</p>
                  <p className="text-xs text-muted-foreground mb-3">Select all that apply, then rate each</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {INTEREST_AREAS.map((area) => (
                      <button
                        key={area.id}
                        onClick={() => toggleInterest(area.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                          selectedInterests.includes(area.id)
                            ? "bg-primary/10 border-2 border-primary/30 ring-1 ring-primary/20"
                            : "bg-muted/30 border-2 border-transparent hover:bg-muted/50"
                        }`}
                      >
                        <span className="text-base">{area.emoji}</span>
                        <span className="text-xs font-medium text-foreground">{area.label}</span>
                        {selectedInterests.includes(area.id) && (
                          <Check className="w-3 h-3 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Score each selected interest */}
                  {selectedInterests.length > 0 && (
                    <div className="space-y-3 p-3 rounded-xl bg-muted/20 border border-border/50">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rate each area</p>
                      {selectedInterests.map((id) => {
                        const area = INTEREST_AREAS.find((a) => a.id === id);
                        return (
                          <div key={id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{area?.emoji}</span>
                              <span className="text-xs font-medium text-foreground">{area?.label}</span>
                            </div>
                            <StarInput
                              value={interestScores[id] || 0}
                              onChange={(v) => setInterestScores((p) => ({ ...p, [id]: v }))}
                              size="sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedInterests.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-xs text-muted-foreground">Select areas this city excels at — or skip</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 4: Tags */}
            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                <div className="py-1">
                  <p className="text-sm font-medium text-foreground mb-0.5">
                    Quick tags <span className="text-muted-foreground text-xs">({selectedTags.length}/5)</span>
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">What stood out about this city?</p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Highlights</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CITY_TAGS.positive.map((tag) => (
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
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Watch out for</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CITY_TAGS.negative.map((tag) => (
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

            {/* Step 5: Note */}
            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                <div className="py-1">
                  <p className="text-sm font-medium text-foreground mb-0.5">
                    Quick note <span className="text-xs text-muted-foreground">(optional)</span>
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">Share a tip for other travelers</p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value.slice(0, 200))}
                    placeholder="Best neighborhoods, tips for getting around, things to know…"
                    className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <p className="text-[10px] text-muted-foreground/50 text-right mt-0.5">{comment.length}/200</p>

                  {/* Summary preview */}
                  <div className="mt-3 p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1.5">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Review summary</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-foreground font-medium">Overall:</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= overall ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                    </div>
                    {Object.keys(coreDims).length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        {Object.keys(coreDims).length} core dimensions rated
                      </p>
                    )}
                    {selectedInterests.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        Strengths: {selectedInterests.map((i) => INTEREST_AREAS.find((a) => a.id === i)?.label).join(", ")}
                      </p>
                    )}
                    {selectedTags.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        Tags: {selectedTags.join(", ")}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      💡 Your review gains value when travelers find it helpful.
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
          {step < TOTAL_STEPS ? (
            <button
              onClick={handleNext}
              disabled={!canAdvance()}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 1 ? "Next" : "Next · skip ok"}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={overall === 0 || submitRating.isPending}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitRating.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
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
